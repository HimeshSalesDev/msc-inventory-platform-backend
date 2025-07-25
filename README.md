# MSC Inventory Platform Backend

## Requirements

- **Node.js**: v18.x or higher
- **MySQL**: 8.x or higher

## Environment Variables

First, copy the example environment file:

```bash
cp .env.example .env
```

Then update `.env` with your configuration values (database credentials, JWT secret, etc.).

## Installation

Install dependencies:

```bash
npm install
```

## Database Setup

### 1. Compile TypeScript

```bash
npx tsc
```

### 2. Run Migrations

```bash
npx typeorm migration:run -d dist/data-source.js
```

### 3. Seed Roles

```bash
npx ts-node src/seeds/seed-roles.ts
```

This seeds default roles: `ADMIN`, `INBOUND_MANAGER`, `INVENTORY_MANAGER`, and `MOBILE_APP`.

## Running the Application

For development:

```bash
npm run start:dev
```

For production:

```bash
npm run build
npm run start:prod
```

## Notes

- Ensure the database specified in `DB_NAME` exists before running migrations.
- To generate a new migration:

```bash
npx typeorm migration:generate -d dist/data-source.js src/migrations/<MigrationName>
```
