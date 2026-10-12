const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const yaml = require("yaml");
const { AppError } = require("./errors/app-error");
const { errorMessage } = require("./errors/error-message");
const { createProductRouter } = require("./routes/product.routes");
const { createRequestContext } = require("./middleware/request-context");
const { errorHandler, notFoundHandler } = require("./middleware/error-handler");

const openApiPath = path.resolve(__dirname, "../docs/openapi.yaml");
const openApiYaml = fs.readFileSync(openApiPath, "utf8");
const openApiSpec = yaml.parse(openApiYaml);

function createApp({ productService, corsOrigins = [], dbCheck = async () => {}, logger = console }) {
  if (!productService) {
    throw new Error("A productService implementation is required.");
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(createRequestContext(logger));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new AppError(403, "Origin not allowed", "This origin is not allowed to access the API."));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    exposedHeaders: ["Location", "X-Request-Id"]
  }));
  app.use(express.json({ limit: "1mb", strict: true }));

  app.get("/health/live", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/health/ready", async (req, res, next) => {
    try {
      await dbCheck();
      res.status(200).json({ status: "ready" });
    } catch (error) {
      logger.error(JSON.stringify({
        requestId: req.requestId,
        message: errorMessage(error)
      }));
      next(new AppError(503, "Service unavailable", "The database is not ready."));
    }
  });

  app.get("/api-docs/openapi.yaml", (req, res) => {
    res
      .status(200)
      .setHeader("Content-Type", "application/yaml; charset=utf-8")
      .send(openApiYaml);
  });
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use("/api/products", createProductRouter(productService));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}

module.exports = { createApp };
