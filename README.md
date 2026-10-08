# studylog
おしまい県

## ポモドーロタイマー

`pomodoro.html` をブラウザで開くと使えます。

### ショートカット & スタートアップ登録

- **Windows**: `shortcut/Pomodoro-setup.bat` を1つダウンロードしてダブルクリックするだけ。
  タイマーは `%LOCALAPPDATA%\Pomodoro` に置かれ、デスクトップにショートカットができ、
  Windows にサインインしたとき自動で開きます。やめるときは `shortcut/Pomodoro-uninstall.bat`。
  （`pomodoro.html` を直したら `python3 shortcut/build_windows_setup.py` で作り直す）
- **Mac**: リポジトリをダウンロードして `shortcut/install-mac.command` をダブルクリック
  （初回は右クリック → 開く）。やめるときは `install-mac.command --uninstall`。

Edge か Chrome があれば、アドレスバーなしの小さなウィンドウで開きます。
