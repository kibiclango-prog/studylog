#!/usr/bin/env python3
"""InmuLM ローカル版: Ollama 上の 8B モデルに、淫夢語録だけで会話させる。

モデルは「どの語録を返すか」を語録 ID で選ぶだけ。ID は JSON スキーマの enum で
縛っているので、語録以外の文字列は生成できない（Ollama の構造化出力）。

使い方:
    ollama pull qwen3:8b
    python3 chat.py                 # 既定モデル
    python3 chat.py --model 別のモデル名
"""
import argparse
import json
import pathlib
import sys
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).parent
GOROKU = json.loads((HERE / "goroku.json").read_text(encoding="utf-8"))
BY_ID = {g["id"]: g for g in GOROKU}

SCHEMA = {
    "type": "object",
    "properties": {
        "reply": {
            "type": "array",
            "items": {"type": "string", "enum": [g["id"] for g in GOROKU]},
            "minItems": 1,
            "maxItems": 3,
        }
    },
    "required": ["reply"],
}

SYSTEM = """あなたは「淫夢語録」しか話せない会話キャラクターです。
返事は下の語録リストから 1〜3 個を選び、その ID を JSON で返してください。
会話の流れと相手の発言の意味をよく読み、文脈として自然に成立する（あるいはツッコミやボケとして面白い）語録を選ぶこと。
同じ語録ばかり繰り返さないこと。

語録リスト（ID: 語録 — 意味・使いどころ）:
{catalog}

例:
ユーザー「こんにちは、はじめまして」→ {{"reply": ["yoroshiku", "gakusei"]}}
ユーザー「テスト満点だった！」→ {{"reply": ["yarimasu", "iizo"]}}
ユーザー「今日ほんとに疲れた」→ {{"reply": ["nuwaa"]}}
ユーザー「お前、さっき寝てたでしょ」→ {{"reply": ["naidesu"]}}
ユーザー「いや絶対寝てたって」→ {{"reply": ["usotsuke"]}}
""".format(catalog="\n".join(f"{g['id']}: {g['t']} — {g['m']}" for g in GOROKU))


def chat(host, model, messages):
    body = {
        "model": model,
        "messages": [{"role": "system", "content": SYSTEM}] + messages,
        "format": SCHEMA,
        "stream": False,
        "think": False,  # Qwen3 などの思考モードを切る（速くなる）
        "options": {"temperature": 0.7, "num_ctx": 8192},  # 語録リスト＋履歴が収まる長さ
    }
    req = urllib.request.Request(
        f"{host}/api/chat",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=600) as res:
        content = json.loads(res.read())["message"]["content"]
    ids = [i for i in json.loads(content).get("reply", []) if i in BY_ID][:3]
    return ids or ["naidesu"]


def main():
    ap = argparse.ArgumentParser(description="淫夢語録だけでしゃべるローカル LLM")
    ap.add_argument("--model", default="qwen3:8b")
    ap.add_argument("--host", default="http://localhost:11434")
    ap.add_argument("--history", type=int, default=10, help="覚えておく往復数")
    args = ap.parse_args()

    print(f"InmuLM（{args.model}）— 終わるときは Ctrl+C")
    print("AI> はい、ヨロシクゥ！")
    messages = []
    while True:
        try:
            text = input("あなた> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAI> じゃあ俺、ギャラ貰って帰るから")
            return
        if not text:
            continue
        messages.append({"role": "user", "content": text})
        try:
            ids = chat(args.host, args.model, messages[-args.history * 2:])
        except urllib.error.URLError as e:
            messages.pop()
            sys.exit(f"Ollama に繋がりません（{e}）。`ollama serve` が動いているか確認してください。")
        messages.append({"role": "assistant", "content": json.dumps({"reply": ids})})
        print("AI> " + " ".join(BY_ID[i]["t"] for i in ids))


if __name__ == "__main__":
    main()
