const { z } = require("zod");

const priceSchema = z.number()
  .finite("Must be a finite number")
  .positive("Must be greater than 0")
  .max(9999999999.99, "Must fit NUMERIC(12, 2)")
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, {
    message: "Must have no more than 2 decimal places"
  });

const currencySchema = z.string()
  .regex(/^[A-Z]{3}$/, "Must be a three-letter uppercase currency code");

const variantSchema = z.object({
  color: z.string().trim().min(1, "Must not be empty").max(80),
  size: z.string().trim().min(1, "Must not be empty").max(40),
  quantity: z.number().int().nonnegative()
}).strict();

const variantsSchema = z.array(variantSchema)
  .min(1, "At least one variant is required")
  .superRefine((variants, context) => {
    const seen = new Set();
    variants.forEach((variant, index) => {
      const key = `${variant.color.toLocaleLowerCase("en-US")}\u0000${variant.size.toLocaleLowerCase("en-US")}`;
      if (seen.has(key)) {
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Color and size combination must be unique"
        });
      }
      seen.add(key);
    });
  });

const productInputSchema = z.object({
  name: z.string().trim().min(3).max(120),
  price: priceSchema,
  currency: currencySchema,
  image: z.string().trim().url().refine((value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Must be a valid absolute HTTP or HTTPS URL"),
  variants: variantsSchema,
  description: z.string().trim().min(20)
}).strict();

const productIdSchema = z.string()
  .regex(/^[1-9]\d*$/, "ID must be a positive integer")
  .transform(Number)
  .refine(Number.isSafeInteger, "ID must be a safe positive integer");

function formatZodErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        const parent = issue.path.reduce((result, segment) =>
          typeof segment === "number" ? `${result}[${segment}]` : result ? `${result}.${segment}` : segment, "");
        const path = parent ? `${parent}.${key}` : key;
        errors[path] ||= [];
        errors[path].push("Unrecognized field");
      }
      continue;
    }

    const path = issue.path.length
      ? issue.path.reduce((result, segment) =>
        typeof segment === "number" ? `${result}[${segment}]` : result ? `${result}.${segment}` : segment, "")
      : "body";
    errors[path] ||= [];
    errors[path].push(issue.message);
  }
  return errors;
}

module.exports = {
  formatZodErrors,
  productIdSchema,
  productInputSchema
};
