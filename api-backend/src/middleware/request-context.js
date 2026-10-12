const { randomUUID } = require("node:crypto");

function createRequestContext(logger = console) {
  return (req, res, next) => {
    const startedAt = Date.now();
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    res.on("finish", () => {
      logger.info(JSON.stringify({
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - startedAt
      }));
    });
    next();
  };
}

module.exports = { createRequestContext };
