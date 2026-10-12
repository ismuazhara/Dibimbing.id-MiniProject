(function exposeProductApi(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ProductApi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createProductApi() {
  class ApiError extends Error {
    constructor(message, status, problem = null) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.problem = problem;
    }
  }

  function problemMessage(problem, status) {
    if (status >= 500) {
      return "The product service couldn't complete the request. Please try again.";
    }

    const fields = problem?.errors && typeof problem.errors === "object"
      ? Object.entries(problem.errors)
          .flatMap(([field, messages]) => (Array.isArray(messages) ? messages : [messages])
            .filter((message) => typeof message === "string")
            .map((message) => `${field}: ${message}`))
      : [];
    const details = [problem?.detail, ...fields].filter(Boolean);
    return details.join(" ") || problem?.title || `Request failed (${status}).`;
  }

  function createApiClient({ baseUrl, fetchImpl = globalThis.fetch } = {}) {
    if (!baseUrl) throw new Error("Product API base URL is not configured.");
    if (typeof fetchImpl !== "function") throw new Error("Fetch is not available.");
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

    async function request(path) {
      let response;
      try {
        response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
          headers: { Accept: "application/json, application/problem+json" }
        });
      } catch {
        throw new ApiError("Unable to reach the product service. Check that the API is running and try again.", 0);
      }

      if (response.status === 204) return null;

      if (!response.ok) {
        let problem = null;
        try {
          problem = await response.json();
        } catch {
          // Non-JSON errors still produce a safe status-based message below.
        }
        throw new ApiError(problemMessage(problem, response.status), response.status, problem);
      }

      try {
        return await response.json();
      } catch {
        throw new ApiError("The product service returned an invalid response. Please try again.", response.status);
      }
    }

    return {
      async getProduct(id) {
        const response = await request(`/api/products/${encodeURIComponent(id)}`);
        if (!response || !response.data || typeof response.data !== "object") {
          throw new ApiError("The product service returned an invalid response. Please try again.", 200);
        }
        return response.data;
      },
      request
    };
  }

  return { ApiError, createApiClient, problemMessage };
});
