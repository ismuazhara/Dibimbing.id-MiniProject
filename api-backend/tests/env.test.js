const test = require("node:test");
const assert = require("node:assert/strict");
const { loadConfig } = require("../src/config/env");

test("environment config validates and parses known values", () => {
  const config = loadConfig({
    PORT: "4000",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/catalog",
    NODE_ENV: "test",
    CORS_ORIGIN: "http://localhost:5500, https://shop.example.com"
  });

  assert.equal(config.port, 4000);
  assert.equal(config.nodeEnv, "test");
  assert.deepEqual(config.corsOrigins, ["http://localhost:5500", "https://shop.example.com"]);
});

test("environment config rejects missing or malformed required values", () => {
  assert.throws(() => loadConfig({}), /DATABASE_URL is required/);
  assert.throws(() => loadConfig({
    PORT: "invalid",
    DATABASE_URL: "postgresql://user:pass@localhost/catalog"
  }), /PORT must be an integer/);
  assert.throws(() => loadConfig({
    DATABASE_URL: "https://example.com/catalog"
  }), /must use the postgres/);
});
