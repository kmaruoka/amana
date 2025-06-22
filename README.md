# Amana Project

## Requirements

- Node.js 18 以上
- JDK 17 以上

## Quick Start

```bash
# リポジトリ取得
git clone https://github.com/kmaruoka/amana.git
cd amana

# サーバーセットアップ
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev

# モバイルセットアップ (Expo)
cd mobile
npm install
npm start        # 'a' で Android, 'i' で iOS エミュレータ起動
```

