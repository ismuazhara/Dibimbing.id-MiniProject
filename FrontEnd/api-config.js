(function configureProductApi() {
  const params = new URLSearchParams(window.location.search);
  const baseUrl = params.get("apiBaseUrl") || "http://localhost:3000";
  const productId = params.get("productId") || "1";

  try {
    const url = new URL(baseUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("Use an HTTP(S) API URL without credentials.");
    }
    if (!/^[1-9]\d*$/.test(productId)) {
      throw new Error("Product ID must be a positive integer.");
    }

    window.PRODUCT_CONFIG = {
      apiBaseUrl: url.toString().replace(/\/+$/, ""),
      productId
    };
  } catch (error) {
    window.PRODUCT_CONFIG_ERROR = error.message;
  }
})();
