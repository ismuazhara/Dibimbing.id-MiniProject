const { AppError } = require("../errors/app-error");
const { errorMessage } = require("../errors/error-message");

function notFoundHandler(req, res, next) {
  next(new AppError(404, "Not found", "The requested resource does not exist."));
}

function errorHandler(logger = console) {
  return (error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error.type === "entity.parse.failed") {
      error = new AppError(400, "Invalid JSON", "Request body must contain valid JSON.");
    } else if (error.type === "entity.too.large") {
      error = new AppError(413, "Payload too large", "Request body exceeds the allowed size.");
    }

    const known = error instanceof AppError;
    const status = known ? error.status : 500;
    const title = known ? error.title : "Internal Server Error";
    const detail = known ? error.message : "An unexpected error occurred.";

    if (!known) {
      logger.error(JSON.stringify({
        requestId: req.requestId,
        message: errorMessage(error)
      }));
    }

    const problem = {
      type: known ? error.type : "about:blank",
      title,
      status,
      detail,
      instance: req.originalUrl
    };
    if (known && error.code) problem.code = error.code;
    if (known && error.errors) problem.errors = error.errors;

    res
      .status(status)
      .setHeader("Content-Type", "application/problem+json")
      .json(problem);
  };
}

module.exports = { errorHandler, notFoundHandler };
