// InmuLM — 淫夢語録だけでしゃべる、かるめの「語録レベル言語モデル」。
// 語彙（トークン）は語録そのもの。だから何を入れても語録しか出てこない。
//   1. 入力から意図（あいさつ・質問・ほめ…）を推定
//   2. 各語録をスコアリング → 温度つきソフトマックスでサンプリング
//   3. 語録どうしの遷移（next）で 1〜3 語録までつなげる
(function (root) {
  'use strict';

  // ── 語彙 ──────────────────────────────────────────────
  // t: 語録 / tags: 反応する意図 / next: 続きやすい語録のid / deco: 末尾に（便乗）などを付けてよいか
  const PHRASES = [
    { id: 'yarimasu',   t: 'やりますねぇ！',                       tags: ['praise', 'done'], next: ['iizo', 'ah_iine'] },
    { id: 'iizo',       t: 'いいゾ〜これ',                         tags: ['praise', 'agree', 'food'], next: ['yarimasu', 'atarimae'] },
    { id: 'soudayo',    t: 'そうだよ',                             tags: ['agree', 'question'], deco: true, next: ['atarimae'] },
    { id: 'osouda',     t: 'おっ、そうだな',                       tags: ['agree', 'question'], next: ['iizo'] },
    { id: 'atarimae',   t: '当たり前だよなぁ？',                   tags: ['agree', 'question'] },
    { id: 'asokka',     t: 'あっ、そっかぁ…',                      tags: ['agree', 'explain'], next: ['haee'] },
    { id: 'haee',       t: 'はえ〜すっごい…',                      tags: ['praise', 'explain', 'surprise'], next: ['asokka'] },
    { id: 'fa',         t: 'ファッ！？',                           tags: ['surprise', 'anger'], next: ['nanda'] },
    { id: 'nanda',      t: '何だお前！？（素）',                   tags: ['surprise', 'anger'] },
    { id: 'okanoshita', t: 'おかのした',                           tags: ['request', 'agree'] },
    { id: 'kashikomari',t: 'かしこまり！',                         tags: ['request'] },
    { id: 'naidesu',    t: 'ないです',                             tags: ['question', 'negative'] },
    { id: 'yoroshiku',  t: 'はい、ヨロシクゥ！',                   tags: ['greet'], next: ['gakusei'] },
    { id: 'gakusei',    t: '24歳、学生です',                       tags: ['greet', 'self'] },
    { id: 'omatase',    t: 'お ま た せ',                          tags: ['greet', 'wait'] },
    { id: 'hairu',      t: '入って、どうぞ',                       tags: ['greet', 'invite'] },
    { id: 'koko',       t: 'こ↑こ↓',                               tags: ['place', 'question'] },
    { id: 'okujou',     t: 'まずうちさぁ、屋上あんだけど…焼いてかない？', tags: ['invite', 'weather'], next: ['ah_iine'] },
    { id: 'ah_iine',    t: 'あ〜いいっすね〜',                     tags: ['invite', 'agree', 'praise'] },
    { id: 'jaken',      t: 'じゃけん夜行きましょうね〜',           tags: ['invite', 'bye'], next: ['okanoshita'] },
    { id: 'harahe',     t: '夜中、腹減んないすか？',               tags: ['food', 'invite'], next: ['ah_iine'] },
    { id: 'oishii',     t: 'うん、おいしい！',                     tags: ['food'], next: ['iizo'] },
    { id: 'nodo',       t: '喉渇いた…喉渇かない？',                tags: ['food', 'tired'] },
    { id: 'nuwaa',      t: 'ぬわああああん疲れたもおおおおん',     tags: ['tired'], next: ['chikareta'] },
    { id: 'chikareta',  t: 'チカレタ…',                            tags: ['tired'] },
    { id: 'tashou',     t: 'まあ多少はね？',                       tags: ['explain', 'negative', 'question'] },
    { id: 'anshin',     t: '大丈夫だって安心しろよ〜',             tags: ['worry'], next: ['tashou'] },
    { id: 'shouganee',  t: 'しょうがねぇなぁ',                     tags: ['request', 'worry'], next: ['okanoshita'] },
    { id: 'akushiro',   t: 'あくしろよ',                           tags: ['wait', 'request'] },
    { id: 'mitokeyo',   t: '見とけよ見とけよ〜',                   tags: ['self', 'done'] },
    { id: 'usotsuke',   t: '嘘つけ絶対見てたゾ',                   tags: ['negative', 'anger'] },
    { id: 'atama',      t: '頭にきますよ！',                       tags: ['anger'], next: ['nanda'] },
    { id: 'itai',       t: '痛いですね…これは痛い',                tags: ['worry', 'negative'] },
    { id: 'yamete',     t: 'やめてくれよ…（絶望）',                tags: ['negative', 'worry'] },
    { id: 'nandemo',    t: 'ん？今なんでもするって言ったよね？',   tags: ['apology', 'request'] },
    { id: 'suki',       t: 'お前のことが好きだったんだよ！',       tags: ['love'] },
    { id: 'kangaete',   t: 'おう、考えてやるよ',                   tags: ['love', 'request'] },
    { id: 'arigatonasu',t: 'ありがとナス！',                       tags: ['thanks'] },
    { id: 'oudou',      t: '王道を征く',                           tags: ['self', 'praise'] },
    { id: 'gyara',      t: 'じゃあ俺、ギャラ貰って帰るから',       tags: ['bye'] },
    { id: 'kuun',       t: 'クゥーン…（子犬）',                    tags: ['apology', 'worry'] },
    { id: 'n114514',    t: '114514',                               tags: ['number'] },
    { id: 'n1919',      t: '1919',                                 tags: ['number'] },
    { id: 'n810',       t: '810',                                  tags: ['number'] },
  ];

  // 末尾デコレーション（これも語録）
  const DECOS = ['（便乗）', '（迫真）', '（小声）', '（素）'];

  // ── 意図推定 ─────────────────────────────────────────
  const INTENTS = {
    greet:    /こんにち|こんばん|おはよ|はじめまして|やあ|ども|hello|hi\b|よろしく|自己紹介/i,
    question: /[?？]|ですか|ますか|なに|何|どう|なんで|なぜ|どこ|いつ|誰|だれ|かな|の\s*$/,
    agree:    /そう|だよね|でしょ|ね[!！。]?\s*$|うん|はい|おk|了解/i,
    praise:   /すご|最高|天才|えらい|うま|上手|かっこ|できた|いいね|神/,
    done:     /できた|終わ|完成|クリア|合格|勝っ/,
    thanks:   /ありが|感謝|サンキュ|thx|thanks/i,
    request:  /して|ください|お願い|頼む|やって|教えて|ちょうだい/,
    apology:  /ごめん|すみません|すいません|申し訳|許して|なんでも|何でも/,
    tired:    /疲れ|つかれ|眠|ねむ|しんど|だる|限界/,
    food:     /腹|はら|お腹|ごはん|ご飯|飯|食べ|飲|ラーメン|カレー|喉|うまい|おいし/,
    invite:   /行こ|いこう|遊ぼ|しない|やろう|来て|来い|一緒/,
    surprise: /え[!！?？]|まじ|マジ|嘘|うそ|びっくり|驚/,
    anger:    /怒|むかつ|ムカつ|ふざけ|うざ|はぁ[?？]|なんだよ/,
    negative: /ない|無理|だめ|ダメ|嫌|いや|ちが|違/,
    worry:    /不安|心配|大丈夫|こわ|怖|やばい|ヤバい|つら|辛|痛/,
    love:     /好き|すき|愛|恋|付き合/,
    bye:      /さよなら|ばいばい|バイバイ|またね|おやすみ|帰る|じゃあね/,
    wait:     /待っ|まだ|遅|はやく|早く/,
    place:    /どこ|場所|ここ/,
    weather:  /暑|あつい|日焼け|晴れ|夏|太陽/,
    number:   /\d/,
    explain:  /なるほど|つまり|ということ|らしい|知って|って何/,
    self:     /あなた|お前|きみ|君|誰|だれ|何歳|年齢|学生/,
  };

  function detectIntents(text) {
    const out = [];
    for (const k in INTENTS) if (INTENTS[k].test(text)) out.push(k);
    return out;
  }

  // ── 文字 bigram の重なり（入力の雰囲気に寄せるための軽い類似度）──
  function bigrams(s) {
    const set = new Set();
    const c = s.replace(/[\s、。！？!?…〜（）()]/g, '');
    for (let i = 0; i < c.length - 1; i++) set.add(c.slice(i, i + 2));
    return set;
  }
  function overlap(a, b) {
    let n = 0;
    for (const x of a) if (b.has(x)) n++;
    return n;
  }
  const PHRASE_BIGRAMS = PHRASES.map((p) => bigrams(p.t));
  const BY_ID = Object.fromEntries(PHRASES.map((p) => [p.id, p]));

  // ── 乱数（シード可） ─────────────────────────────────
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function sample(logits, temperature, rand) {
    const T = Math.max(temperature, 0.05);
    const max = Math.max(...logits);
    const w = logits.map((l) => Math.exp((l - max) / T));
    const sum = w.reduce((a, b) => a + b, 0);
    let r = rand() * sum;
    for (let i = 0; i < w.length; i++) {
      r -= w[i];
      if (r <= 0) return i;
    }
    return w.length - 1;
  }

  class InmuLM {
    constructor(opts = {}) {
      this.temperature = opts.temperature ?? 0.7;
      this.maxPhrases = opts.maxPhrases ?? 3;
      this.rand = opts.seed != null ? mulberry32(opts.seed) : Math.random;
      this.recent = []; // 直近に使った語録（繰り返しペナルティ用）
    }

    // 入力に対する各語録のロジット
    logits(input) {
      const intents = detectIntents(input);
      const bg = bigrams(input);
      return PHRASES.map((p, i) => {
        let s = 0;
        for (const tag of p.tags) if (intents.includes(tag)) s += 4;
        s += Math.min(overlap(bg, PHRASE_BIGRAMS[i]), 3) * 0.5;
        if (this.recent.includes(p.id)) s -= 2;
        if (p.tags.includes('number') && !intents.includes('number')) s -= 1.5;
        return s;
      });
    }

    pick(input) {
      // 「なんでもする」には必ずこれ
      if (/(なんでも|何でも)(し|や)/.test(input)) return BY_ID.nandemo;
      if (!input.trim()) return BY_ID.naidesu;
      return PHRASES[sample(this.logits(input), this.temperature, this.rand)];
    }

    // 1 回の応答（語録の配列）を生成
    generate(input) {
      const out = [this.pick(input)];
      // 語録間の遷移：温度が高いほど長くしゃべる
      const pContinue = 0.25 + 0.25 * Math.min(this.temperature, 1.5);
      while (out.length < this.maxPhrases && this.rand() < pContinue) {
        const last = out[out.length - 1];
        const cands = (last.next || []).map((id) => BY_ID[id]).filter((p) => !out.includes(p));
        if (!cands.length) break;
        out.push(cands[Math.floor(this.rand() * cands.length)]);
      }
      this.recent = [...out.map((p) => p.id), ...this.recent].slice(0, 6);
      return out.map((p) => (p.deco && this.rand() < 0.6 ? p.t + DECOS[Math.floor(this.rand() * DECOS.length)] : p.t));
    }

    reply(input) {
      return this.generate(input).join(' ');
    }
  }

  InmuLM.PHRASES = PHRASES;
  InmuLM.DECOS = DECOS;
  InmuLM.detectIntents = detectIntents;

  if (typeof module !== 'undefined' && module.exports) module.exports = InmuLM;
  else root.InmuLM = InmuLM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
