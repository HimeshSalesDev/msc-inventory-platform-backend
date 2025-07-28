# MSC Inventory Platform Backend

## Requirements

* **Node.js**: v18.x or higher
* **MySQL**: v8.x or higher
* **npm**: v9.x or higher (recommended)

---

## Environment Variables

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Update the newly created `.env` file with your configuration values:

   * Database credentials (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`)
   * JWT secret (`JWT_SECRET`)
   * Any other relevant environment values

---

## Installation

Install all required dependencies:

```bash
npm install
```

---

## Database Setup

> ⚠️ **IMPORTANT**: TypeORM migrations rely on compiled JavaScript files in the `dist` directory. You must build the project **before** running migrations.

### 1. Compile TypeScript

```bash
npm run build
```

This will output the compiled files to the `dist/` directory.

### 2. Run Migrations

```bash
npx typeorm migration:run -d dist/data-source.js
```

This command runs all pending migrations using the compiled `data-source.js` file.

### 3. Seed Roles

Seed the default roles (e.g., `ADMIN`, `INBOUND_MANAGER`, `INVENTORY_MANAGER`, `MOBILE_APP`):

```bash
npx ts-node src/seeds/seed-roles.ts
```

---

## Running the Application

### Development Mode

```bash
npm run start:dev
```

Uses `ts-node` with auto-reloading via `ts-node-dev` or `nodemon`.

### Production Mode

```bash
npm run build
npm run start:prod
```

Runs the app from compiled files in `dist/`.

---

## Creating a New Migration

> Make sure your TypeScript code is **compiled** before generating a migration. Otherwise, TypeORM may fail to detect entity changes.

1. Build the project:

   ```bash
   npm run build
   ```

2. Generate a new migration:

   ```bash
   npx typeorm migration:generate -d dist/data-source.js src/migrations/<MigrationName>
   ```

3. Review the generated migration file under `src/migrations/`.

---

## Notes

* The MySQL database specified in your `.env` under `DB_NAME` **must exist** b
