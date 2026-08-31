// ============================================================
// NestMart Hardware — Main Application Logic
// ============================================================

// ---------- State ----------
let products = [];
let cart = JSON.parse(localStorage.getItem("nestmart_cart")) || [];

// ---------- Helpers ----------
function formatPrice(price) {
  return "Rp " + price.toLocaleString("id-ID");
}

function saveCart() {
  localStorage.setItem("nestmart_cart", JSON.stringify(cart));
}

function updateCartBadge() {
  const total = cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll("#cart-count").forEach((el) => {
    el.textContent = total;
  });
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// ---------- Fetch Products ----------
async function fetchProducts() {
  try {
    const res = await fetch("isi.json");
    if (!res.ok) throw new Error("Gagal memuat data");
    products = await res.json();
    return products;
  } catch (err) {
    console.error(err);
    return [];
  }
}

// ---------- Render Product Card ----------
function createProductCard(product) {
  const card = document.createElement("div");
  card.className = "product-card";

  const inCart = cart.find((c) => c.id === product.id);
  const qtyInCart = inCart ? inCart.qty : 0;

  card.innerHTML = `
    <img src="${product.image}" alt="${product.name}" class="card-img" loading="lazy"
         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22180%22><rect fill=%22%23111%22 width=%22200%22 height=%22180%22/><text fill=%22%23555%22 x=%22100%22 y=%2295%22 text-anchor=%22middle%22 font-size=%2214%22>No Image</text></svg>'">
    <div class="card-body">
      <span class="card-category">${product.category}</span>
      <h3 class="card-title">${product.name}</h3>
      <p class="card-specs">${product.specs}</p>
      <div class="card-bottom">
        <span class="card-price">${formatPrice(product.price)}</span>
        <span class="card-rating">★ ${product.rating} (${product.reviews})</span>
      </div>
      <div class="card-actions">
        <button class="btn-small btn-outline btn-detail" data-id="${product.id}">Detail</button>
        <button class="btn-small btn-add btn-add-cart" data-id="${product.id}">
          ${qtyInCart > 0 ? `+ Keranjang (${qtyInCart})` : "+ Keranjang"}
        </button>
      </div>
    </div>
  `;

  // Event: Add to cart
  card.querySelector(".btn-add-cart").addEventListener("click", (e) => {
    e.stopPropagation();
    addToCart(product.id);
    // Re-render this card to update button text
    refreshCurrentView();
  });

  // Event: Show detail
  card.querySelector(".btn-detail").addEventListener("click", (e) => {
    e.stopPropagation();
    showDetailModal(product);
  });

  return card;
}

// ---------- Cart Operations ----------
function addToCart(productId) {
  const existing = cart.find((c) => c.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      qty: 1,
    });
  }
  saveCart();
  updateCartBadge();
  showToast("Produk ditambahkan ke keranjang!");
}

function removeFromCart(productId) {
  cart = cart.filter((c) => c.id !== productId);
  saveCart();
  updateCartBadge();
  refreshCurrentView();
}

function updateCartQty(productId, delta) {
  const item = cart.find((c) => c.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId);
    return;
  }
  saveCart();
  updateCartBadge();
  refreshCurrentView();
}

// ---------- Detail Modal ----------
function showDetailModal(product) {
  const modal = document.getElementById("detail-modal");
  const body = document.getElementById("modal-body");
  if (!modal || !body) return;

  body.innerHTML = `
    <img src="${product.image}" alt="${product.name}" class="modal-img"
         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22280%22><rect fill=%22%23111%22 width=%22400%22 height=%22280%22/><text fill=%22%23555%22 x=%22200%22 y=%22145%22 text-anchor=%22middle%22 font-size=%2216%22>No Image</text></svg>'">
    <span class="modal-category">${product.category} — ${product.brand}</span>
    <h3>${product.name}</h3>
    <p class="modal-price">${formatPrice(product.price)}</p>
    <p class="modal-rating">★ ${product.rating} / 5 — ${product.reviews} ulasan</p>
    <p class="modal-specs"><strong>Spesifikasi:</strong> ${product.specs}</p>
    <p class="modal-desc">${product.description}</p>
    <p class="modal-stock">Stok: ${product.stock} unit</p>
    <button class="btn-primary btn-add-cart-modal" data-id="${product.id}">+ Tambah ke Keranjang</button>
  `;

  body.querySelector(".btn-add-cart-modal").addEventListener("click", () => {
    addToCart(product.id);
    refreshCurrentView();
  });

  modal.classList.add("open");
}

function closeModal() {
  const modal = document.getElementById("detail-modal");
  if (modal) modal.classList.remove("open");
}

// ---------- Page: Landing (index.html) ----------
async function renderLandingPage() {
  const grid = document.getElementById("hot-grid");
  if (!grid) return;

  await fetchProducts();
  updateCartBadge();

  const hotProducts = products.filter((p) => p.isHot);
  grid.innerHTML = "";
  hotProducts.forEach((p) => grid.appendChild(createProductCard(p)));
}

// ---------- Page: Products (products.html) ----------
async function renderProductsPage() {
  const grid = document.getElementById("product-grid");
  const catSelect = document.getElementById("filter-category");
  const brandSelect = document.getElementById("filter-brand");
  const priceRange = document.getElementById("filter-price");
  const priceLabel = document.getElementById("price-label");
  const resultCount = document.getElementById("result-count");
  const resetBtn = document.getElementById("filter-reset");

  if (!grid) return;

  await fetchProducts();
  updateCartBadge();

  // Populate filter dropdowns
  const categories = [...new Set(products.map((p) => p.category))].sort();
  const brands = [...new Set(products.map((p) => p.brand))].sort();

  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    catSelect.appendChild(opt);
  });

  brands.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    brandSelect.appendChild(opt);
  });

  // Max price
  const maxPrice = Math.max(...products.map((p) => p.price));
  priceRange.max = maxPrice;
  priceRange.value = maxPrice;
  priceLabel.textContent = formatPrice(maxPrice);

  function applyFilters() {
    const cat = catSelect.value;
    const brand = brandSelect.value;
    const maxP = parseInt(priceRange.value);

    let filtered = products;
    if (cat) filtered = filtered.filter((p) => p.category === cat);
    if (brand) filtered = filtered.filter((p) => p.brand === brand);
    filtered = filtered.filter((p) => p.price <= maxP);

    resultCount.textContent = `(${filtered.length} produk)`;
    grid.innerHTML = "";
    if (filtered.length === 0) {
      grid.innerHTML =
        '<p class="loading-text">Tidak ada produk yang cocok.</p>';
      return;
    }
    filtered.forEach((p) => grid.appendChild(createProductCard(p)));
  }

  catSelect.addEventListener("change", applyFilters);
  brandSelect.addEventListener("change", applyFilters);
  priceRange.addEventListener("input", () => {
    priceLabel.textContent = formatPrice(parseInt(priceRange.value));
    applyFilters();
  });
  resetBtn.addEventListener("click", () => {
    catSelect.value = "";
    brandSelect.value = "";
    priceRange.value = maxPrice;
    priceLabel.textContent = formatPrice(maxPrice);
    applyFilters();
  });

  applyFilters();
}

// ---------- Page: Cart (cart.html) ----------
function renderCartPage() {
  updateCartBadge();

  const emptyEl = document.getElementById("cart-empty");
  const contentEl = document.getElementById("cart-content");
  const itemsEl = document.getElementById("cart-items");
  const summaryItems = document.getElementById("summary-items");
  const summaryTotal = document.getElementById("summary-total");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (!emptyEl || !contentEl) return;

  if (cart.length === 0) {
    emptyEl.style.display = "block";
    contentEl.style.display = "none";
    return;
  }

  emptyEl.style.display = "none";
  contentEl.style.display = "block";

  itemsEl.innerHTML = "";
  cart.forEach((item) => {
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item-img"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2270%22 height=%2270%22><rect fill=%22%23111%22 width=%2270%22 height=%2270%22/></svg>'">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p class="cart-item-price">${formatPrice(item.price)}</p>
      </div>
      <div class="cart-item-qty">
        <button class="qty-dec" data-id="${item.id}">−</button>
        <span>${item.qty}</span>
        <button class="qty-inc" data-id="${item.id}">+</button>
      </div>
      <button class="cart-item-remove" data-id="${item.id}" title="Hapus">🗑️</button>
    `;

    div
      .querySelector(".qty-dec")
      .addEventListener("click", () => updateCartQty(item.id, -1));
    div
      .querySelector(".qty-inc")
      .addEventListener("click", () => updateCartQty(item.id, 1));
    div
      .querySelector(".cart-item-remove")
      .addEventListener("click", () => removeFromCart(item.id));

    itemsEl.appendChild(div);
  });

  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  summaryItems.textContent = totalItems;
  summaryTotal.textContent = formatPrice(totalPrice);

  // Checkout — require login
  checkoutBtn.onclick = () => {
    if (cart.length === 0) return;
    const session = getSession();
    if (!session) {
      showToast("🔒 Silakan login terlebih dahulu untuk checkout.");
      openAuthModal("login");
      return;
    }
    cart = [];
    saveCart();
    updateCartBadge();
    showToast("✅ Pesanan berhasil! Terima kasih, " + session.name + ".");
    renderCartPage();
  };
}

// ---------- Refresh current view ----------
function refreshCurrentView() {
  const path = window.location.pathname.replace(/\/$/, "");
  if (
    path.endsWith("index.html") ||
    path === "" ||
    path.endsWith("NestMart Hardware")
  ) {
    renderLandingPage();
  } else if (path.endsWith("products.html")) {
    renderProductsPage();
  } else if (path.endsWith("cart.html")) {
    renderCartPage();
  }
}

// ---------- Auth ----------
const USERS_KEY = "nestmart_users";
const SESSION_KEY = "nestmart_session";

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function openAuthModal(tab = "login") {
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.classList.add("open");
  switchAuthTab(tab);
  document.getElementById("auth-error").textContent = "";
  document.getElementById("auth-form").reset();
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.remove("open");
}

function switchAuthTab(tab) {
  const tabs = document.querySelectorAll(".auth-tab");
  const nameGroup = document.getElementById("auth-name-group");
  const submitBtn = document.getElementById("auth-submit");
  const nameInput = document.getElementById("auth-name");

  tabs.forEach((t) => t.classList.remove("active"));
  const activeTab = document.querySelector(`.auth-tab[data-tab="${tab}"]`);
  if (activeTab) activeTab.classList.add("active");

  if (tab === "register") {
    nameGroup.style.display = "block";
    nameInput.required = true;
    submitBtn.textContent = "Register";
  } else {
    nameGroup.style.display = "none";
    nameInput.required = false;
    submitBtn.textContent = "Login";
  }
}

function handleAuthSubmit(e) {
  e.preventDefault();

  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const name = document.getElementById("auth-name").value.trim();
  const errorEl = document.getElementById("auth-error");
  const isRegister =
    document.getElementById("auth-name-group").style.display !== "none";

  errorEl.textContent = "";

  if (!email || !password) {
    errorEl.textContent = "Email dan password wajib diisi.";
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = "Password minimal 6 karakter.";
    return;
  }

  const users = getUsers();

  if (isRegister) {
    if (!name) {
      errorEl.textContent = "Nama wajib diisi.";
      return;
    }
    const exists = users.find((u) => u.email === email);
    if (exists) {
      errorEl.textContent = "Email sudah terdaftar. Silakan login.";
      return;
    }
    const newUser = { name, email, password };
    users.push(newUser);
    saveUsers(users);
    saveSession({ name, email });
    closeAuthModal();
    updateUserUI();
    showToast("✅ Registrasi berhasil! Selamat datang, " + name + ".");
    refreshCurrentView();
  } else {
    const user = users.find(
      (u) => u.email === email && u.password === password,
    );
    if (!user) {
      errorEl.textContent = "Email atau password salah.";
      return;
    }
    saveSession({ name: user.name, email: user.email });
    closeAuthModal();
    updateUserUI();
    showToast("✅ Login berhasil! Selamat datang, " + user.name + ".");
    refreshCurrentView();
  }
}

function logout() {
  clearSession();
  updateUserUI();
  showToast("👋 Anda telah logout.");
  refreshCurrentView();
}

function updateUserUI() {
  const area = document.getElementById("user-area");
  if (!area) return;

  const session = getSession();

  if (session) {
    const initial = session.name.charAt(0).toUpperCase();
    area.innerHTML = `
      <div class="user-menu" id="user-menu">
        <div class="user-avatar">${initial}</div>
        <span class="user-name">${session.name}</span>
        <div class="user-dropdown" id="user-dropdown">
          <button disabled style="color:var(--text-muted);font-size:0.75rem;padding:0.4rem 1rem;">
            ${session.email}
          </button>
          <button class="logout-btn" id="btn-logout">Logout</button>
        </div>
      </div>
    `;

    const menu = document.getElementById("user-menu");
    const dropdown = document.getElementById("user-dropdown");

    menu.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });

    document.addEventListener("click", () => {
      dropdown.classList.remove("open");
    });

    document.getElementById("btn-logout").addEventListener("click", (e) => {
      e.stopPropagation();
      logout();
    });
  } else {
    area.innerHTML = `
      <button class="btn-login-nav" id="btn-login-nav">Login</button>
    `;
    document.getElementById("btn-login-nav").addEventListener("click", () => {
      openAuthModal("login");
    });
  }
}

// ---------- Global Init ----------
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname.replace(/\/$/, "");

  // Modal close handlers
  const modal = document.getElementById("detail-modal");
  const modalClose = document.getElementById("modal-close");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }
  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeAuthModal();
    }
  });

  // Auth modal handlers
  const authModal = document.getElementById("auth-modal");
  const authModalClose = document.getElementById("auth-modal-close");
  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }
  if (authModalClose) {
    authModalClose.addEventListener("click", closeAuthModal);
  }

  // Auth tabs
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchAuthTab(tab.dataset.tab));
  });

  // Auth form submit
  const authForm = document.getElementById("auth-form");
  if (authForm) {
    authForm.addEventListener("submit", handleAuthSubmit);
  }

  // Init user UI
  updateUserUI();

  // Route to page
  if (
    path.endsWith("index.html") ||
    path === "" ||
    path.endsWith("NestMart Hardware")
  ) {
    renderLandingPage();
  } else if (path.endsWith("products.html")) {
    renderProductsPage();
  } else if (path.endsWith("cart.html")) {
    renderCartPage();
  }
});
