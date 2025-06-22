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
# Android 12 以降で必要となるパッチも含む
npm run update-android-sdk  # 依存モジュールの BuildConfig と React Native パッチを適用し、gradlew clean まで実行
# mobile の npm install 時にも自動実行されますが、
# 新しい依存パッケージを追加した後は手動で再実行してください
# パッケージ名は自動検出され、`DevSupportManagerBase` へのパッチと
# `getUseDeveloperSupport()` の無効化も行われます
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

## Android 12 以降で起動時にクラッシュする場合

エミュレータや実機が Android 12(API 31) 以上の場合、起動直後に次のエラーが表示されることがあります。

```
java.lang.RuntimeException: Requested enabled DevSupportManager, but BridgeDevSupportManager class was not found or could not be created
Caused by: java.lang.SecurityException: One of RECEIVER_EXPORTED or RECEIVER_NOT_EXPORTED should be specified
```

これは React Native 0.71 系の `DevSupportManagerBase.java` が Android 12 以降の仕様に対応していないためです。モバイルの `npm install` 後に自動でパッチが適用されますが、何らかの理由で適用されていない場合は次のコマンドを実行してください。パッケージ名は自動検出されます。

```powershell
cd $env:GITHUB_REPOS_DIR\amana
npm run update-android-sdk
```

パッチ適用後、`mobile/node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/devsupport/DevSupportManagerBase.java` に `compatRegisterReceiver` の呼び出しが挿入されていることを確認できます。

さらに `npm run update-android-sdk` は `MainApplication.java` の `getUseDeveloperSupport()` を `false` に書き換え、Android 12 以降でのクラッシュを防ぎます。開発者メニューを利用したい場合は React Native 0.72.4 以上へ更新した上で、この変更を元に戻してください。

## Hermes 関連のクラッシュ
`couldn't find DSO to load: libjscexecutor.so` と表示される場合、Hermes 用の設定が不足しています。下記コマンドで自動修正を行い、キャッシュを削除した上で再ビルドしてください。`npm run update-android-sdk` は `mobile/android/app/build.gradle` に `project.ext.react = [ enableHermes: true ]` を追加し、`gradle.properties` の `hermesEnabled` を `true` に更新します。ファイルが無い場合は自動生成され、`ndkVersion` も推奨値に設定されます。

```powershell
cd $env:GITHUB_REPOS_DIR\amana
npm run update-android-sdk
npm run android
```
