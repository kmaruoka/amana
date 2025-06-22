# Amana Project

## Quick Start

```bash
# clone repository
git clone https://github.com/kmaruoka/amana.git
cd amana

# server setup
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev &


# mobile setup
npm run init-mobile             # generate React Native project if not present
cd mobile && npm install
npm run update-android-sdk
cd android && ./gradlew clean && cd ..

npm run android  # or npm run ios
```

