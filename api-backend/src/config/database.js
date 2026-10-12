const { Pool } = require("pg");
const { errorMessage } = require("../errors/error-message");

function createPool(config) {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000
  });

  pool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL client error:", errorMessage(error));
  });

  return pool;
}

module.exports = { createPool };
