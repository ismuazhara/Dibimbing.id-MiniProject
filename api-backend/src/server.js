const { loadConfig } = require("./config/env");
const { createPool } = require("./config/database");
const { ProductRepository } = require("./repositories/product.repository");
const { ProductService } = require("./services/product.service");
const { createApp } = require("./app");
const { errorMessage } = require("./errors/error-message");

async function start() {
  const config = loadConfig();
  const pool = createPool(config);
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    await pool.end();
    throw new Error(`PostgreSQL startup check failed: ${errorMessage(error)}`, { cause: error });
  }

  const repository = new ProductRepository(pool);
  const productService = new ProductService(repository);
  const app = createApp({
    productService,
    corsOrigins: config.corsOrigins,
    dbCheck: () => pool.query("SELECT 1")
  });

  const server = app.listen(config.port, () => {
    console.info(`Product Catalog API listening on port ${config.port}`);
  });

  let isShuttingDown = false;
  async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.info(`Received ${signal}; shutting down.`);
    server.close(async (error) => {
      if (error) {
        console.error("HTTP server shutdown failed:", error.message);
        process.exitCode = 1;
      }
      try {
        await pool.end();
      } catch (poolError) {
        console.error("PostgreSQL pool shutdown failed:", poolError.message);
        process.exitCode = 1;
      }
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("API startup failed:", errorMessage(error));
  process.exitCode = 1;
});
