const { AppError } = require("../errors/app-error");
const { formatZodErrors, productIdSchema } = require("../schemas/product.schema");

function validateProductId(req, res, next) {
  const parsed = productIdSchema.safeParse(req.params.id);
  if (!parsed.success) {
    return next(new AppError(400, "Invalid request", "The product id must be a positive integer.", {
      errors: formatZodErrors(parsed.error)
    }));
  }
  req.validatedProductId = parsed.data;
  next();
}

function validateProductBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(400, "Validation failed", "One or more fields are invalid.", {
        errors: formatZodErrors(parsed.error)
      }));
    }
    req.validatedProduct = parsed.data;
    next();
  };
}

function requireJsonBody(req, res, next) {
  if (!req.is("application/json")) {
    return next(new AppError(415, "Unsupported media type", "Content-Type must be application/json."));
  }
  next();
}

module.exports = { requireJsonBody, validateProductBody, validateProductId };
