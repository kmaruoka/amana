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

# サーバーセットアップ (ルートで実行)
cd $env:GITHUB_REPOS_DIR\amana
npm install
npm audit fix
npx prisma migrate dev --name init
npm run seed
npm run dev &

# モバイルセットアップ
npm run init-mobile        # 初回のみ
cd $env:GITHUB_REPOS_DIR\amana\mobile
npm install
npm audit fix --force
cd $env:GITHUB_REPOS_DIR\amana
$env:ANDROID_PACKAGE_NAME = 'jp.kmaruoka.amana'
npm run update-android-sdk
cd $env:GITHUB_REPOS_DIR\amana\mobile\android
.\gradlew.bat clean
cd $env:GITHUB_REPOS_DIR\amana
npx react-native doctor
npm run android   # または npm run ios
```

