function errorMessage(error) {
  if (Array.isArray(error?.errors) && error.errors.length) {
    const causes = error.errors
      .map((cause) => cause.message)
      .filter(Boolean);
    if (causes.length) return causes.join("; ");
  }
  return error?.message || error?.code || error?.name || "Unknown error";
}

module.exports = { errorMessage };
