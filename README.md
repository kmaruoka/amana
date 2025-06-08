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

## セットアップ手順

1. `.env.example` を `.env` にコピーして、各変数の値を設定します。

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

### アプリの実行方法

`mobile` ディレクトリで依存パッケージをインストールし、通常の React Native コマンドを実行してください。ネイティブプロジェクトのフォルダーが存在しない場合は、まず生成する必要があります。

#### Linux / macOS

```bash
cd mobile
npm install
# リポジトリには `android` と `ios` ディレクトリが含まれていません。
# 存在しない場合は React Native CLI を使って生成してください。
# このコマンドは npm からテンプレートをダウンロードするため、ネットワーク接続が必要です。
# 動作確認時には React Native 0.72.7 を使用したため、バージョンを指定しています。
npx react-native init AmanaTmp --template react-native@0.72.7
mv AmanaTmp/android ./android
mv AmanaTmp/ios ./ios
rm -rf AmanaTmp
# `init` コマンドを実行できない環境（オフライン等）の場合は、
# コマンドが成功した別環境から生成済みの `android` と `ios` をコピーしてください。
npm run android   # または npm run ios
```

#### Windows (PowerShell)

```powershell
cd mobile
npm install
# リポジトリには `android` と `ios` ディレクトリが含まれていません。
# 存在しない場合は React Native CLI を使って生成してください。
npx react-native init AmanaTmp --template react-native@0.72.7
Move-Item AmanaTmp/android ./android
Move-Item AmanaTmp/ios ./ios
Remove-Item -Recurse -Force AmanaTmp
# `init` コマンドを実行できない環境（オフライン等）の場合は、
# コマンドが成功した別環境から生成済みの `android` と `ios` をコピーしてください。
npm run android   # または npm run ios
```

上記コマンドを実行すると、Metro Bundler が起動し、エミュレーターまたは実機でアプリが立ち上がります。

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

1. [Mapbox アカウント](https://www.mapbox.com/) でダウンロードトークンを取得し、
   `mobile/android/gradle.properties`（または `~/.gradle/gradle.properties`）に
   `MAPBOX_DOWNLOADS_TOKEN=<取得したトークン>` を追記します。
2. `mobile/android/build.gradle` の `allprojects.repositories` に次のブロックを
   追加します。

   ```gradle
   maven {
       url 'https://api.mapbox.com/downloads/v2/releases/maven'
       authentication { basic(BasicAuthentication) }
       credentials {
           username = 'mapbox'
           password = project.properties['MAPBOX_DOWNLOADS_TOKEN'] ?: ''
       }
   }
   ```

これらの設定を行った後に `npm run android` を実行すると、Mapbox 関連の依存解決が
正常に行われるようになります。

### Gradle キャッシュを削除する (Windows)

ビルドがキャッシュの破損などで失敗する場合、次の手順で Gradle キャッシュを削除し
ます。

1. プロジェクトのルートで `gradlew --stop` を実行します。
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

`GRADLE_USER_HOME` を設定すると、キャッシュディレクトリを別の場所に変更できます。
例:

```powershell
$env:GRADLE_USER_HOME = "D:\\gradle-cache"
```
