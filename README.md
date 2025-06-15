# Amana API

このリポジトリには、プロジェクト仕様書で説明されている神社参拝アプリ向けの最小限の Express + Prisma API サーバーが含まれています。コアとなるデータベーススキーマを定義し、近くの神社を取得するエンドポイントを提供します。

## 必要環境

- Node.js 18 以上
- PostgreSQL 15 （PostGIS 拡張付き）

サーバーは CommonJS モジュールとして構成されており、`npm run dev` を実行すると `ts-node-dev` を介して起動します。

データベース接続文字列は `DATABASE_URL` 環境変数で設定します。例:

```
DATABASE_URL="postgresql://amana_user:amana_pass@127.0.0.1:15432/amana"
```

## クイックスタート

以下のコマンドを順に実行するだけで開発サーバーとエミュレータを起動できます。
実績のある組み合わせ（2024 年 6 月確認）は `React Native 0.71.8` と
`react-native-screens 4.11.1` です。

```powershell
# 環境準備
$env:GITHUB_REPOS_DIR=GitHubローカルリポジトリのルートディレクトリ

# リポジトリ取得
cd $env:GITHUB_REPOS_DIR
git clone https://github.com/kmaruoka/amana.git

# サーバーセットアップ
cd $env:GITHUB_REPOS_DIR\amana
npm install
npm audit fix
npx prisma migrate dev --name init
npm run seed
npm run dev

# モバイルセットアップ
cd $env:GITHUB_REPOS_DIR\amana\mobile
npm install
npm audit fix --force
npx @react-native-community/cli init AmanaTmp --version 0.71.8
Move-Item AmanaTmp/android ./android -Force
Move-Item AmanaTmp/ios ./ios -Force
Remove-Item -Recurse -Force AmanaTmp

# Mapbox トークンを .env に設定後、Gradle 周りを更新
cd $env:GITHUB_REPOS_DIR\amana
npm run setup-gradle
cd $env:GITHUB_REPOS_DIR\amana\mobile
npm install react-native-screens@4.11.1
npm install react-native-gradle-plugin
cd $env:GITHUB_REPOS_DIR\amana
npm run update-android-sdk  # Kotlin バージョンも自動で調整されます
# build.gradle に buildFeatures.buildConfig true を自動で追加します
cd $env:GITHUB_REPOS_DIR\amana\mobile\android
# JDK17 を利用するよう JAVA_HOME を設定してください
$env:JAVA_HOME = "C:\\path\\to\\jdk17"
.\gradlew.bat clean
npx react-native doctor
npm run android   # または npm run ios
```

Kotlin バージョンの不一致で `:react-native-gradle-plugin:compileKotlin` が失敗する
場合、`react-native-gradle-plugin` をインストールした後に `npm run update-android-sdk`
を実行し、`mobile/android` ディレクトリで `./gradlew clean` を行ってから
`npm run android` を試してください。

## セットアップ手順

1. リポジトリに同梱されている `.env` を必要に応じて編集します。基本的な値はあらかじめ設定されているため、API キーなどの機密情報のみ書き換えてください。

2. 依存パッケージをインストールします（ネットワークアクセスが必要です）。

```bash
npm install
```

このプロジェクトは **CommonJS** モジュールを使用するよう設定されています。`ts-node-dev` でサーバーを実行する際は `package.json` に `"type": "commonjs"` が含まれていることを確認してください。

3. Prisma クライアントを生成してマイグレーションを適用します。

```bash
npx prisma migrate dev --name init
```

4. テストデータを投入します。

```bash
npm run seed
```

5. 開発サーバーを起動します。

```bash
npm run dev
```

このコマンドは `ts-node-dev` を用いて CommonJS モードでサーバーを実行します。

API は `http://localhost:3000` で利用可能になります。

## エンドポイント

- `GET /shrines/nearby?lat=LAT&lon=LON&radius=R` - 指定した座標から半径 `R` メートル以内の神社を検索
- `GET /shrines` - 神社と祭神の一覧を取得
- `GET /deities` - 祭神と、それが祀られている神社一覧を取得
- `GET /users` - ユーザー一覧を取得
- `GET /shrines/:id` - 単一の神社情報（祭神付き）を取得
- `GET /deities/:id` - 単一の祭神情報（関連神社付き）を取得
- `POST /users` - 新規ユーザーを作成（ボディに `name` を指定）
- `GET /users/:userId` - ユーザー詳細を取得
- `POST /visits` - ユーザーが神社を参拝した記録を作成（`userId` と `shrineId` を指定）
- `GET /users/:userId/visits` - 指定ユーザーの参拝履歴を取得
- `GET /shrines/:id/ranking` - その神社の参拝上位5人を取得

## モバイルアプリ

`mobile/` フォルダーには、TypeScript と React Native Paper、React Navigation を用いた最小限の React Native (Bare Workflow) プロジェクトが含まれています。

### クリーンな状態からAndroid/iOSを起動する手順

1. このリポジトリを `git clone` します。
2. モバイル用ディレクトリに移動して依存パッケージをインストールします。

   ```bash
   cd mobile
   npm install
   ```
3. `android` と `ios` フォルダーが無い場合は次のコマンドで生成して配置します。

```powershell
npx react-native init AmanaTmp --template react-native@0.72.7
Move-Item AmanaTmp/android ./android -Force
Move-Item AmanaTmp/ios ./ios -Force
Remove-Item -Recurse -Force AmanaTmp
```

4. Android SDK のパスを `ANDROID_HOME` または `android/local.properties` に設定し、`npx react-native doctor` で環境を確認します。
5. プロジェクトのルートディレクトリで `npm run setup-gradle` を実行し、Gradle
   設定を自動で更新します。`.env` に `MAPBOX_DOWNLOADS_TOKEN` を記入しておくと、
   `mobile/android/gradle.properties` と `build.gradle` が書き換えられます。

6. Android SDK と Gradle 周りの設定を自動調整するために、続けて
   `npm run update-android-sdk` を実行します。これにより
   `compileSdkVersion` と `targetSdkVersion` が **34** に更新され、
   Gradle 8.1.1 および Android Gradle Plugin 8.1.2 を使用するよう
   `gradle-wrapper.properties` や `build.gradle` が書き換えられます。
   また、Kotlin バージョンの不一致によるビルドエラーを防ぐため、
   `react-native-gradle-plugin` の設定も自動で書き換えられます。
   変更後は Android プロジェクト (`mobile/android`) のルートで
   `./gradlew clean`（Windows では `\.\gradlew.bat clean`）を実行してください。
   `node_modules` が無い場合は `cd mobile` して `npm install` を行い、
   `react-native-gradle-plugin` をインストールしてから再度実行します。
   詳細は後述の「Android API レベルの更新」節も参照します。

7. エミュレーターを起動するか実機を接続し、`npm run android` または `npm run ios` を実行します。
   `npm run android` は内部で `npm run update-android-sdk` を呼び出し、
   `compileSdkVersion` と `targetSdkVersion` を自動で最新に更新します。

### アプリの実行方法
初回セットアップ後は、次のコマンドでアプリを起動できます。`android` と `ios`
フォルダーが存在しない場合は前節の手順 3 を参照して生成してください。

```bash
cd mobile
npm run android   # または npm run ios
```

コマンド実行後、Metro Bundler が起動し、エミュレーターまたは実機でアプリが立ち上がります。

### Android 追加設定

`npm run android` 実行時に `"adb" が見つからない` や `SDK location not found` といったエラーが表示される場合、Android SDK のパスが正しく設定されていません。

1. Android Studio をインストールし、Android SDK が導入されていることを確認します。
2. 環境変数 `ANDROID_HOME` を設定するか、`mobile/android/local.properties` に `sdk.dir=<SDK のパス>` を記述します。
3. `npx react-native doctor` を実行して環境を確認します。
4. コマンド実行前に Android Studio からエミュレーターを起動するか、実機を接続してください。

PowerShell 例:

```powershell
$env:ANDROID_HOME = "C:\Users\<username>\AppData\Local\Android\Sdk"
```

local.properties 例:

```
sdk.dir=C:\\Users\\<username>\\AppData\\Local\\Android\\Sdk
```

### Mapbox 関連の依存解決

地図表示には `@rnmapbox/maps` を利用しており、Mapbox の Maven リポジトリを
Gradle に追加する必要があります。設定を行わない場合、
`com.mapbox.maps:android` などの依存関係を取得できずビルドが失敗します。

1. [Mapbox アカウント](https://www.mapbox.com/) で **DOWNLOADS:READ** 権限付きの
   トークンを生成し、`.env` の `MAPBOX_DOWNLOADS_TOKEN` に設定します。
2. Android プロジェクト生成後に、プロジェクトのルートディレクトリで
   `npm run setup-gradle` を実行すると、`gradle.properties` と
   `build.gradle` に必要な設定が自動で追記されます。

これらを行ったあと `npm run android` を実行すれば、Mapbox 関連の依存解決が
正常に行われるようになります。

### Gradle キャッシュを削除する (Windows)

ビルドがキャッシュの破損などで失敗する場合、次の手順で Gradle キャッシュを削除し
ます。

1. Android プロジェクト (`mobile/android` など `gradlew` が置かれているフォルダー) の
   ルートで `gradlew --stop` を実行します。
   Windows 環境でも同じ場所で `.\gradlew.bat --stop` を実行します。
2. タスク マネージャーで `java` と `gradle` のプロセスが残っていないことを確認しま
   す。
3. PowerShell で以下のコマンドを実行してキャッシュを削除します。

   ```powershell
   Remove-Item -Recurse -Force $env:USERPROFILE\.gradle
   ```

4. 削除できない場合は PC を再起動してから次のコマンドを試します。

   ```powershell
   Remove-Item -LiteralPath "\\?\$env:USERPROFILE\.gradle" -Recurse -Force
   Remove-Item -Recurse -Force $env:USERPROFILE\.gradle
   # もしくは
   cmd /c "rmdir /s /q \"%USERPROFILE%\\.gradle\""
   ```

5. Android プロジェクトディレクトリ (`mobile/android`) に生成された `.gradle` フォルダーも削除します。

   ```powershell
   Remove-Item -Recurse -Force .gradle
   # もしくは
   cmd /c "rmdir /s /q .gradle"
   ```

`GRADLE_USER_HOME` を設定すると、キャッシュディレクトリを別の場所に変更できます。
例:

```powershell
$env:GRADLE_USER_HOME = "D:\\gradle-cache"
```

### Windows でエミュレータが起動しない場合

以下のポイントを確認してください。

1. Android Studio の AVD Manager からエミュレータを一度起動しておきます。
2. `ANDROID_HOME` または `local.properties` に SDK のパスが正しく設定されているか確認します。
3. 上記手順 6 で紹介した `compileSdkVersion` と `targetSdkVersion` の更新後、
   `mobile/android` のルートで `./gradlew clean`（Windows は `\.\gradlew.bat clean`）を実行します。
4. PowerShell から `npm run android` を再実行し、エミュレータにアプリがインストールされるか確認します。

### Android API レベルの更新

`react-native-screens` や `@rnmapbox/maps` の新しいバージョンを利用すると、
ビルド時に `:app:checkDebugAarMetadata` タスクが失敗することがあります。
これは依存ライブラリが **Android API 34** 以上でのビルドを要求しているためです。

`npx react-native init` で生成した直後のプロジェクトでは `compileSdkVersion`
および `targetSdkVersion` が `33` になっているため、そのままでは依存ライブラリが
要求する API レベルと一致せずビルドに失敗します。

本リポジトリでは `npm run update-android-sdk` を用意しており、実行すると
`compileSdkVersion` と `targetSdkVersion` を **34** に変更するとともに、
Gradle ラッパーと Android Gradle Plugin を推奨バージョンに更新します。

スクリプト実行後は Android プロジェクト (`mobile/android`) のルートで
`./gradlew clean` (Windows では `\.\gradlew.bat clean`) を実行し、
改めて `npm run android` を実行してください。

### Kotlin コンパイルエラーが出る場合

`react-native run-android` 実行時に `BaseReactPackage` や
`ViewManagerWithGeneratedInterface` が解決できないといった Kotlin
エラーが大量に表示される場合、React Native 0.72 と一部ライブラリの
互換性が原因の可能性があります。以下を順に試してください。

1. **依存パッケージを更新する**
   - `react-native-screens` を最新版（例: 4.11.1）に更新するとエラーが解消
     されることがあります。次のコマンドで更新できます。

     ```bash
     cd mobile
     npm install react-native-screens@4.11.1
     ```
   - `@rnmapbox/maps` は React Native 0.72 との相性問題が報告されています。
2. **Android プロジェクトをクリーンする**
   - 依存パッケージをインストールしたら次を実行してキャッシュを削除します。

     ```bash
     cd android
     ./gradlew clean
     ```

     その後、再度アプリを起動します。

     ```bash
     npm run android
     ```
3. **新アーキテクチャ設定を確認する**
  - `react-native.config.js` で新しいアーキテクチャを有効にしている場合、対応
    していないライブラリがあるとビルドに失敗します。このリポジトリではデフォルト
    で無効 (`newArchEnabled: false`) にした設定ファイルを同梱していますが、
    依存更新などで上書きされる可能性があります。内容を確認し、必要に応じて修正し
    てください。

  ```javascript
  experimental: { newArchEnabled: false }
  ```

4. **React Native を 0.71 系にダウングレードする**
  - 上記の対処をすべて試しても改善しない場合、`package.json` の
    `react-native` のバージョンを `0.71.x` に変更して `npm install` を
    実行します。
  - 既存の `android` と `ios` フォルダーを再生成する場合は、次のように
    テンプレートを指定して `react-native` プロジェクトを作り直します。

    ```powershell
    npx @react-native-community/cli init AmanaTmp --version 0.71.8
    Move-Item AmanaTmp/android ./android -Force
    Move-Item AmanaTmp/ios ./ios -Force
    Remove-Item -Recurse -Force AmanaTmp
    ```

上記を試しても解決しない場合は、利用しているライブラリのバージョンや Android
Studio のログを見直し、個別に問題を切り分けてください。

## Git運用ルール

- ブランチ名にはASCII文字のみを使用してください。日本語などの2バイト文字は使わないでください。
- 例: `feature/login`, `fix/api-timeout` のように英数字とハイフン、アンダースコアのみを利用します。
