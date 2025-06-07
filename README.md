# Amana API

This repository contains a minimal Express + Prisma API server for the shrine collection application described in the project specification. It defines the core database schema and provides an endpoint to query nearby shrines.

## Requirements

- Node.js 18+
- PostgreSQL 15 with PostGIS

The server is configured for CommonJS modules. `npm run dev` will launch it via
`ts-node-dev` using the CJS build settings.

Set the database connection string via `DATABASE_URL` environment variable. For example:

```
DATABASE_URL="postgresql://amana_user:amana_pass@127.0.0.1:15432/amana"
```

## Setup

1. Install dependencies (network access required):

```bash
npm install
```

This project is configured to use **CommonJS** modules. Ensure `package.json`
contains `"type": "commonjs"` when running the server with `ts-node-dev`.

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

This command runs the server in CommonJS mode using `ts-node-dev`.

The API will be available at `http://localhost:3000`.

## Endpoints

- `GET /shrines/nearby?lat=LAT&lon=LON&radius=R` - Find shrines within `radius` meters of the given coordinates.
- `GET /shrines` - List all shrines with their deities.
- `GET /deities` - List all deities with the shrines they appear in.
- `GET /users` - List all users.
- `GET /shrines/:id` - Retrieve a single shrine with its deities.
- `GET /deities/:id` - Retrieve a single deity with its shrines.
- `POST /users` - Create a new user. Body parameters: `name`.
- `GET /users/:userId` - Get details for a single user.
- `POST /visits` - Record that a user visited a shrine. Body parameters: `userId`, `shrineId`.
- `GET /users/:userId/visits` - List visits for the specified user.
- `GET /shrines/:id/ranking` - Get the top 5 visitors for the shrine.

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
