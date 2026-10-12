class AppError extends Error {
  constructor(status, title, detail, options = {}) {
    super(detail);
    this.name = "AppError";
    this.status = status;
    this.title = title;
    this.code = options.code;
    this.errors = options.errors;
    const problemSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    this.type = options.type || `https://api.example.com/problems/${problemSlug}`;
  }
}

module.exports = { AppError };
