# Amana Project

## Requirements

- Node.js 18 以上
- JDK 17 以上
- Android SDK Build-Tools 36
- Android SDK Command-line Tools (latest)
- Android SDK Platform-Tools

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
npm run update-android-sdk  # 依存モジュールの BuildConfig と React Native パッチを適用
# mobile の npm install 時にも自動実行されますが、
# 新しい依存パッケージを追加した後は手動で再実行してください
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

# それでも削除できない場合は Node/Java プロセスを終了
Get-Process node, java -ErrorAction SilentlyContinue | Stop-Process -Force

# リポジトリをクリーンな状態に戻す
cd $env:GITHUB_REPOS_DIR\amana
git reset --hard
git clean -fdx
git pull
```

その後、上記 Quick Start の "モバイルセットアップ" 以降のコマンドを再実行します。

## Android 14 で起動時にクラッシュする場合

エミュレータや実機が Android 14(API 34) の場合、起動直後に次のエラーが表示されることがあります。

```
java.lang.RuntimeException: Requested enabled DevSupportManager, but BridgeDevSupportManager class was not found or could not be created
Caused by: java.lang.SecurityException: One of RECEIVER_EXPORTED or RECEIVER_NOT_EXPORTED should be specified
```

これは React Native 0.71 系の `DevSupportManagerBase.java` が Android 14 の仕様に対応していないためです。モバイルの `npm install` 後に自動でパッチが適用されますが、何らかの理由で適用されていない場合は次のコマンドを実行し、`./gradlew clean` を実行してからビルドし直してください。

```powershell
cd $env:GITHUB_REPOS_DIR\amana
npm run update-android-sdk
cd $env:GITHUB_REPOS_DIR\amana\mobile\android
.\gradlew.bat clean
```

パッチ適用後、`mobile/node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/devsupport/DevSupportManagerBase.java` に `compatRegisterReceiver` の呼び出しが挿入されていることを確認できます。
