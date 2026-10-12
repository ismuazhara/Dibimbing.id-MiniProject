const fs = require("node:fs/promises");
const path = require("node:path");
const { loadConfig } = require("../config/env");
const { createPool } = require("../config/database");
const { errorMessage } = require("../errors/error-message");

async function migrate() {
  const pool = createPool(loadConfig());
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDirectory = path.resolve(__dirname, "../../migrations");
    const files = (await fs.readdir(migrationsDirectory))
      .filter((name) => /^\d+_[\w-]+\.sql$/.test(name))
      .sort();

    for (const name of files) {
      const { rowCount } = await pool.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [name]
      );
      if (rowCount) {
        console.info(`Skipping applied migration ${name}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDirectory, name), "utf8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
        console.info(`Applied migration ${name}`);
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          error.rollbackError = rollbackError.message;
        }
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

migrate()
  .catch((error) => {
    console.error("Database migration failed:", errorMessage(error));
    process.exitCode = 1;
  });
