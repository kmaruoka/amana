# Amana API

This repository contains a minimal Express + Prisma API server for the shrine collection application described in the project specification. It defines the core database schema and provides an endpoint to query nearby shrines.

## Requirements

- Node.js 18+
- PostgreSQL 15 with PostGIS

Set the database connection string via `DATABASE_URL` environment variable. For example:

```
DATABASE_URL="postgresql://amana_user:amana_pass@127.0.0.1:15432/amana"
```

## Setup

1. Install dependencies (network access required):

```bash
npm install
```

2. Generate Prisma client and apply migrations:

```bash
npx prisma migrate dev --name init
```

3. Seed test data:

```bash
npm run seed
```

4. Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

## Endpoints

- `GET /shrines/nearby?lat=LAT&lon=LON&radius=R` - Find shrines within `radius` meters of the given coordinates.
- `GET /shrines` - List all shrines with their deities.
- `POST /visits` - Record that a user visited a shrine. Body parameters: `userId`, `shrineId`.
- `GET /users/:userId/visits` - List visits for the specified user.

## Mobile App

A minimal React Native (bare workflow) project is included under `mobile/`. It uses TypeScript, React Native Paper and React Navigation to provide a bottom tab interface with placeholder screens.

### Running the app

Install dependencies inside the `mobile` directory and run the standard React Native commands:

```bash
cd mobile
npm install
npm run android   # or npm run ios
```

This will start the Metro bundler and launch the app in an emulator or device.
