const cart = [];
let product = null;
let selectedColor = null;
let selectedSize = null;
let quantity = 1;
let activeImage = 0;
let galleryImages = [];
let toastTimer;

const cartDrawer = document.querySelector(".cart-drawer");
const backdrop = document.querySelector(".drawer-backdrop");
const toast = document.querySelector(".toast");
const sizeDialog = document.querySelector(".size-dialog");
const imageDialog = document.querySelector(".image-dialog");
const productState = document.querySelector("#product-state");
const productLayout = document.querySelector(".product-layout");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function currentVariant() {
  return product?.variants.find((variant) =>
    variant.color === selectedColor && variant.size === selectedSize
  ) || null;
}

function formatMoney(value, currencyCode) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode
  }).format(value);
}

function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector(".cart-count").textContent = count;
  document.querySelector(".cart-count").setAttribute("aria-label", `${count} items in bag`);
  document.querySelector(".drawer-count").textContent = `(${count})`;

  const totals = new Map();
  cart.forEach((item) => {
    totals.set(item.currency, (totals.get(item.currency) || 0) + item.price * item.quantity);
  });
  if (!totals.size) totals.set("USD", 0);
  const subtotal = document.querySelector(".subtotal");
  subtotal.replaceChildren();
  [...totals.entries()].sort(([left], [right]) => left.localeCompare(right)).forEach(([code, amount]) => {
    const row = document.createElement("div");
    row.className = "subtotal-row";
    const label = document.createElement("span");
    label.textContent = totals.size > 1 ? `Subtotal (${code})` : "Subtotal";
    const value = document.createElement("strong");
    value.textContent = formatMoney(amount, code);
    row.append(label, value);
    subtotal.append(row);
  });

  const content = document.querySelector(".cart-content");
  content.replaceChildren();
  if (!cart.length) {
    const empty = document.createElement("div");
    empty.className = "empty-cart";
    const title = document.createElement("h3");
    title.textContent = "Your cart is empty";
    const message = document.createElement("p");
    message.textContent = "Find something warm for the trail.";
    empty.append(title, message);
    content.append(empty);
  } else {
    cart.forEach((item, index) => {
      const row = document.createElement("article");
      row.className = "cart-item";

      const image = document.createElement("img");
      image.src = item.image;
      image.alt = "";

      const details = document.createElement("div");
      const name = document.createElement("h3");
      name.textContent = item.name;
      const variation = document.createElement("p");
      variation.textContent = [item.color, item.size].filter(Boolean).join(" · ") || "One size";
      const price = document.createElement("span");
      price.className = "cart-item-price";
      price.textContent = formatMoney(item.price * item.quantity, item.currency);

      const controls = document.createElement("div");
      controls.className = "cart-quantity";
      controls.setAttribute("aria-label", `Change ${item.name} quantity`);
      const decrease = document.createElement("button");
      decrease.type = "button";
      decrease.dataset.cartStep = "-1";
      decrease.dataset.index = index;
      decrease.setAttribute("aria-label", "Decrease quantity");
      decrease.textContent = "−";
      const countLabel = document.createElement("span");
      countLabel.textContent = item.quantity;
      const increase = document.createElement("button");
      increase.type = "button";
      increase.dataset.cartStep = "1";
      increase.dataset.index = index;
      increase.disabled = Number.isInteger(item.maxStock) && item.quantity >= item.maxStock;
      increase.setAttribute("aria-label", increase.disabled ? "Maximum available quantity" : "Increase quantity");
      increase.textContent = "+";
      controls.append(decrease, countLabel, increase);
      details.append(name, variation, price, controls);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-item";
      remove.dataset.remove = index;
      remove.textContent = "Remove";
      row.append(image, details, remove);
      content.append(row);
    });
  }

  const socks = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector(".bundle-progress").textContent = socks >= 3
    ? "Your 15% sock bundle discount is ready at checkout!"
    : `Add ${3 - socks} more sock${3 - socks === 1 ? "" : "s"} to unlock 15% off.`;
}

function openCart() {
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  document.body.classList.add("drawer-open");
  cartDrawer.querySelector(".drawer-close").focus();
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
  document.body.classList.remove("drawer-open");
  document.querySelector(".cart-toggle").focus();
}

function addItem(item) {
  const match = cart.find((cartItem) =>
    cartItem.productId === item.productId &&
    cartItem.name === item.name &&
    cartItem.currency === item.currency &&
    cartItem.size === item.size &&
    cartItem.color === item.color
  );
  if (match) {
    const totalQuantity = match.quantity + item.quantity;
    if (Number.isInteger(match.maxStock) && totalQuantity > match.maxStock) return false;
    match.quantity = totalQuantity;
  } else {
    cart.push(item);
  }
  updateCart();
  return true;
}

function setActiveImage(index) {
  if (!galleryImages.length) return;
  activeImage = Math.max(0, Math.min(index, galleryImages.length - 1));
  const image = galleryImages[activeImage];
  const mainImage = document.querySelector(".main-image");
  mainImage.src = image.src;
  mainImage.alt = image.alt;
  document.querySelector(".image-count").textContent = `${activeImage + 1} / ${galleryImages.length}`;
  document.querySelectorAll(".thumbnail").forEach((button, buttonIndex) => {
    const active = buttonIndex === activeImage;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", String(active));
  });
  imageDialog.querySelector("img").src = image.src;
  imageDialog.querySelector("img").alt = image.alt;
}

function updatePurchaseControls() {
  const variant = currentVariant();
  const maxQuantity = variant?.quantity || 0;
  quantity = Math.max(1, Math.min(quantity, maxQuantity || 1));
  document.querySelector(".quantity-value").textContent = quantity;
  document.querySelector(".quantity-change[data-step='-1']").disabled = quantity <= 1;
  document.querySelector(".quantity-change[data-step='1']").disabled = !variant || quantity >= maxQuantity;
  document.querySelector(".add-to-cart").disabled = !variant || maxQuantity < 1;
}

function selectSize(size) {
  selectedSize = size;
  quantity = 1;
  document.querySelector(".selected-size-label").textContent = size;
  document.querySelector(".selection-message").textContent = "";
  document.querySelectorAll(".size-button").forEach((button) => {
    const active = button.dataset.size === size;
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const variant = currentVariant();
  document.querySelector(".size-help").textContent = variant
    ? variant.quantity > 0 ? `${variant.quantity} available` : "Sold out"
    : "This size is not available in the selected color.";
  updatePurchaseControls();
}

function renderSizes() {
  const sizes = [...new Set(product.variants
    .filter((variant) => variant.color === selectedColor)
    .map((variant) => variant.size))];
  const container = document.querySelector(".size-buttons");
  container.replaceChildren();
  document.querySelector(".selected-size-label").textContent = "Choose a size";
  document.querySelector(".size-help").textContent = sizes.length
    ? "Choose a size to see current stock."
    : "No sizes are available for this color.";

  sizes.forEach((size) => {
    const variant = product.variants.find((item) =>
      item.color === selectedColor && item.size === size
    );
    const button = document.createElement("button");
    button.type = "button";
    button.className = "size-button";
    button.dataset.size = size;
    button.setAttribute("aria-pressed", "false");
    button.disabled = variant.quantity === 0;
    button.textContent = variant.quantity === 0 ? `${size} · Sold out` : size;
    button.setAttribute("aria-label", variant.quantity === 0
      ? `${size}, sold out`
      : `${size}, ${variant.quantity} available`);
    button.addEventListener("click", () => selectSize(size));
    container.append(button);
  });
  updatePurchaseControls();
}

function renderColors() {
  const colors = [...new Set(product.variants.map((variant) => variant.color))];
  const container = document.querySelector(".swatches");
  container.replaceChildren();
  selectedColor = colors.find((color) => product.variants.some((variant) =>
    variant.color === color && variant.quantity > 0
  )) || colors[0] || null;

  colors.forEach((color) => {
    const colorVariants = product.variants.filter((variant) => variant.color === color);
    const soldOut = colorVariants.every((variant) => variant.quantity === 0);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.dataset.color = color;
    button.disabled = soldOut;
    button.setAttribute("aria-label", soldOut ? `${color}, sold out` : color);
    button.setAttribute("aria-pressed", String(color === selectedColor));
    button.textContent = soldOut ? `${color} · Sold out` : color;
    button.classList.toggle("is-selected", color === selectedColor);
    button.addEventListener("click", () => {
      selectedColor = color;
      selectedSize = null;
      quantity = 1;
      document.querySelector(".selected-color-label").textContent = color;
      document.querySelectorAll(".swatch").forEach((swatch) => {
        const active = swatch.dataset.color === color;
        swatch.classList.toggle("is-selected", active);
        swatch.setAttribute("aria-pressed", String(active));
      });
      document.querySelector(".selection-message").textContent = "";
      renderSizes();
    });
    container.append(button);
  });

  document.querySelector(".selected-color-label").textContent = selectedColor || "Unavailable";
  if (selectedColor) {
    renderSizes();
  } else {
    renderSizes();
  }
}

function renderSizeGuides() {
  const sizes = [...new Set(product.variants.map((variant) => variant.size))];
  for (const container of document.querySelectorAll(".product-size-list, .dialog-size-list")) {
    container.replaceChildren();
    if (!sizes.length) {
      const message = document.createElement("p");
      message.textContent = "No sizes are currently listed.";
      container.append(message);
      continue;
    }
    sizes.forEach((size) => {
      const cell = document.createElement("div");
      const label = document.createElement("strong");
      label.textContent = size;
      const info = document.createElement("span");
      info.textContent = "See available stock above.";
      cell.append(label, info);
      container.append(cell);
    });
  }
}

function validateProduct(data) {
  let imageIsHttp = false;
  try {
    const imageUrl = new URL(data?.image);
    imageIsHttp = ["http:", "https:"].includes(imageUrl.protocol);
  } catch {
    imageIsHttp = false;
  }
  if (!data || typeof data !== "object" ||
      !Number.isInteger(data.id) ||
      typeof data.name !== "string" ||
      !data.name.trim() ||
      typeof data.description !== "string" ||
      typeof data.image !== "string" ||
      !imageIsHttp ||
      !Number.isFinite(data.price) ||
      data.price <= 0 ||
      typeof data.currency !== "string" ||
      !/^[A-Z]{3}$/.test(data.currency) ||
      !Array.isArray(data.variants) ||
      data.variants.some((variant) =>
        !variant ||
        typeof variant.color !== "string" ||
        !variant.color.trim() ||
        typeof variant.size !== "string" ||
        !variant.size.trim() ||
        !Number.isInteger(variant.quantity) ||
        variant.quantity < 0
      )) {
    throw new Error("The product service returned incomplete product data. Please try again.");
  }
}

function renderProduct(data) {
  validateProduct(data);
  product = data;
  const name = data.name.trim();
  document.title = `${name} | United By Blue`;
  document.querySelector('meta[name="description"]').content = data.description;
  document.querySelector("#product-title").textContent = name;
  document.querySelector(".product-breadcrumb").textContent = name;
  document.querySelector(".price").textContent = formatMoney(data.price, data.currency);
  document.querySelector(".price-caption").textContent = data.currency;
  document.querySelector(".details-title").textContent = name;
  document.querySelector(".product-description").textContent = data.description;
  galleryImages = [{ src: data.image, alt: name }];
  activeImage = 0;
  const thumbnails = document.querySelector(".thumbnail-list");
  thumbnails.replaceChildren();
  const thumbnail = document.createElement("button");
  thumbnail.type = "button";
  thumbnail.className = "thumbnail is-active";
  thumbnail.setAttribute("aria-label", `View ${name}`);
  thumbnail.setAttribute("aria-current", "true");
  const thumbnailImage = document.createElement("img");
  thumbnailImage.src = data.image;
  thumbnailImage.alt = "";
  thumbnail.append(thumbnailImage);
  thumbnail.addEventListener("click", () => setActiveImage(0));
  thumbnails.append(thumbnail);
  document.querySelectorAll(".image-arrow").forEach((button) => {
    button.hidden = galleryImages.length < 2;
  });

  renderColors();
  renderSizeGuides();
  document.querySelectorAll(".product-dependent").forEach((section) => {
    section.hidden = false;
  });
  productLayout.hidden = false;
  productLayout.setAttribute("aria-busy", "false");
  productState.hidden = true;
  setActiveImage(0);
  updatePurchaseControls();
}

function showProductState(message, { retry = false } = {}) {
  product = null;
  productLayout.hidden = true;
  productLayout.setAttribute("aria-busy", "false");
  document.querySelectorAll(".product-dependent").forEach((section) => {
    section.hidden = true;
  });
  productState.replaceChildren();
  const text = document.createElement("span");
  text.textContent = message;
  productState.append(text);
  if (retry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "api-retry";
    button.textContent = "Try again";
    button.addEventListener("click", loadProduct);
    productState.append(button);
  }
  productState.hidden = false;
  productState.setAttribute("role", "alert");
}

async function loadProduct() {
  productState.hidden = false;
  productState.setAttribute("role", "status");
  productState.textContent = "Loading product…";
  productLayout.hidden = true;
  productLayout.setAttribute("aria-busy", "true");
  document.querySelectorAll(".product-dependent").forEach((section) => {
    section.hidden = true;
  });
  document.querySelector(".add-to-cart").disabled = true;

  if (window.PRODUCT_CONFIG_ERROR) {
    showProductState(`Product API configuration error: ${window.PRODUCT_CONFIG_ERROR}`);
    return;
  }

  try {
    const api = window.ProductApi.createApiClient({
      baseUrl: window.PRODUCT_CONFIG.apiBaseUrl
    });
    const data = await api.getProduct(window.PRODUCT_CONFIG.productId);
    renderProduct(data);
  } catch (error) {
    const notFound = error.status === 404;
    showProductState(
      notFound ? "This product could not be found." : error.message || "Unable to load this product.",
      { retry: !notFound && (error.status === 0 || error.status >= 500 || error.status === 429 || error.status === 200) }
    );
  }
}

document.querySelector(".quantity-change[data-step='-1']").addEventListener("click", () => {
  quantity = Math.max(1, quantity - 1);
  updatePurchaseControls();
});
document.querySelector(".quantity-change[data-step='1']").addEventListener("click", () => {
  const variant = currentVariant();
  if (variant) quantity = Math.min(variant.quantity, quantity + 1);
  updatePurchaseControls();
});

document.querySelector(".add-to-cart").addEventListener("click", () => {
  const variant = currentVariant();
  if (!variant || variant.quantity < 1) {
    document.querySelector(".selection-message").textContent = "Choose an available color and size before adding to your bag.";
    return;
  }
  const added = addItem({
    productId: product.id,
    name: product.name,
    color: variant.color,
    size: variant.size,
    quantity,
    maxStock: variant.quantity,
    price: product.price,
    currency: product.currency,
    image: product.image
  });
  if (!added) {
    document.querySelector(".selection-message").textContent = "Your bag already contains the available stock for this variation.";
    return;
  }
  document.querySelector(".selection-message").textContent = "";
  showToast("Added to your bag.");
  openCart();
});

document.querySelector(".cart-toggle").addEventListener("click", openCart);
document.querySelector(".drawer-close").addEventListener("click", closeCart);
document.querySelector(".continue-shopping").addEventListener("click", closeCart);
backdrop.addEventListener("click", closeCart);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cartDrawer.classList.contains("is-open")) closeCart();
  if (event.key === "ArrowRight" && imageDialog.open) setActiveImage(activeImage + 1);
  if (event.key === "ArrowLeft" && imageDialog.open) setActiveImage(activeImage - 1);
});

document.querySelector(".cart-content").addEventListener("click", (event) => {
  const stepButton = event.target.closest("[data-cart-step]");
  const removeButton = event.target.closest("[data-remove]");
  if (stepButton) {
    const index = Number(stepButton.dataset.index);
    const item = cart[index];
    if (!item) return;
    const nextQuantity = item.quantity + Number(stepButton.dataset.cartStep);
    if (nextQuantity <= 0) cart.splice(index, 1);
    else if (!Number.isInteger(item.maxStock) || nextQuantity <= item.maxStock) {
      item.quantity = nextQuantity;
    } else {
      showToast("You have reached the available stock for this variation.");
      return;
    }
    updateCart();
  }
  if (removeButton) {
    cart.splice(Number(removeButton.dataset.remove), 1);
    updateCart();
  }
});

document.querySelectorAll("[data-open-size-guide]").forEach((button) => {
  button.addEventListener("click", () => sizeDialog.showModal());
});
document.querySelector(".dialog-done").addEventListener("click", () => sizeDialog.close());
document.querySelector(".size-dialog .dialog-close").addEventListener("click", () => sizeDialog.close());

document.querySelector(".main-image-button").addEventListener("click", () => {
  setActiveImage(activeImage);
  imageDialog.showModal();
});
document.querySelector(".image-dialog-close").addEventListener("click", () => imageDialog.close());
document.querySelector(".image-prev").addEventListener("click", () => setActiveImage(activeImage - 1));
document.querySelector(".image-next").addEventListener("click", () => setActiveImage(activeImage + 1));

document.querySelectorAll("[data-quick-add]").forEach((button) => {
  button.addEventListener("click", () => {
    const added = addItem({
      productId: null,
      name: button.dataset.quickAdd,
      size: "",
      color: "",
      quantity: 1,
      maxStock: null,
      price: button.dataset.quickAdd.includes("Trail Sock") ? 32 : button.dataset.quickAdd.includes("Yak Wool") ? 28 : 44,
      currency: "USD",
      image: button.closest(".recommendation-card").querySelector("img").src
    });
    if (!added) return;
    showToast(`${button.dataset.quickAdd} added to your bag.`);
  });
});

document.querySelectorAll("[data-scroll]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".product-cards").scrollBy({
      left: Number(button.dataset.scroll) * document.querySelector(".product-cards").clientWidth * 0.7,
      behavior: "smooth"
    });
  });
});

document.querySelector(".checkout-button").addEventListener("click", () => {
  showToast(cart.length ? "Checkout is a demo in this product page recreation." : "Your bag is empty.");
});
document.querySelector("[data-review]").addEventListener("click", () => showToast("Reviews are not available yet."));

const menuToggle = document.querySelector(".menu-toggle");
menuToggle.addEventListener("click", () => {
  const nav = document.querySelector(".main-nav");
  const open = nav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});

updateCart();
loadProduct();
