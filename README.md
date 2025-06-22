# Amana Project

## Requirements

- Node.js 18 以上
- JDK 17 以上

## Quick Start

```powershell
# 環境準備
$env:GITHUB_REPOS_DIR="GitHubローカルリポジトリのルートディレクトリ"
$env:JAVA_HOME="JDK17のインストールフォルダ"

# リポジトリ取得
cd $env:GITHUB_REPOS_DIR
git clone https://github.com/kmaruoka/amana.git
cd amana

# サーバーセットアップ (ルートで実行)
cd $env:GITHUB_REPOS_DIR\amana
npm install
npm audit fix
npx prisma migrate dev --name init
npm run seed
npm run dev

# モバイルセットアップ
cd $env:GITHUB_REPOS_DIR\amana
npm run init-mobile        # 初回のみ
cd $env:GITHUB_REPOS_DIR\amana\mobile
npm install
# 依存パッケージは react-native-screens 3.22.0,
# @rnmapbox/maps 10.1.32 に固定済み
npm audit fix --force
cd $env:GITHUB_REPOS_DIR\amana
# .env の MAPBOX_DOWNLOADS_TOKEN を設定
npm run setup-gradle
cd $env:GITHUB_REPOS_DIR\amana
$env:ANDROID_PACKAGE_NAME = 'jp.kmaruoka.amana'
npm run update-android-sdk
cd $env:GITHUB_REPOS_DIR\amana\mobile\android
.\gradlew.bat clean
# android フォルダがロックされる場合は Gradle デーモンを停止
.\gradlew.bat --stop
cd $env:GITHUB_REPOS_DIR\amana\mobile
npx react-native doctor
npm run android   # または npm run ios
```

## エラー時のリスタート手順

ビルドエラーなどで `android` フォルダがロックされ、クリーンアップに失敗する場合は次の手順で環境をリセットしてください。

```powershell
# エミュレータを終了
adb emu kill

# Gradle デーモンを停止してロックを解除
cd $env:GITHUB_REPOS_DIR\amana\mobile\android
.\gradlew.bat --stop

# リポジトリをクリーンな状態に戻す
cd $env:GITHUB_REPOS_DIR\amana
git reset --hard
git clean -fdx
git pull
```

その後、上記 Quick Start の "モバイルセットアップ" 以降のコマンドを再実行します。
