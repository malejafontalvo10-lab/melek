/* =============================================
   MELEK NAKIŞ — script.js v4
   - SPA (navegación por páginas sin scroll entre secciones)
   - Catálogo con accesorios
   - Carrito con botón directo en tarjeta
   - Quick-add panel (color + talla con disponibilidad)
   - Variantes (color × talla) con disponibilidad editable
============================================= */

// ── CONFIGURACIÓN ──────────────────────────
const WHATSAPP_NUMBER = "573502997986";
const INSTAGRAM_URL   = "https://instagram.com/meleknakis.col";
const TIKTOK_URL      = "https://tiktok.com/@melek.col";

// ── ESTADO GLOBAL ──────────────────────────
let products       = [];
let cart           = [];
let currentProduct = null;
let selectedColor  = "";
let selectedSize   = "";

// ── FORMATEAR PRECIO ───────────────────────
function formatPrice(n) {
  return "$ " + n.toLocaleString("es-CO");
}

function getProductImages(product, color = "") {
  if (color && product.fotosPorColor && product.fotosPorColor[color]?.length) {
    return product.fotosPorColor[color];
  }
  return product.fotos || [];
}

function getProductImage(product, color = "") {
  return getProductImages(product, color)[0] || "";
}

// ── INICIALIZACIÓN ─────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  initNav();
  initHeader();
  initSocials();
  initCart();
  initModal();
  initCheckout();
});

// ══════════════════════════════════════════
// SPA — NAVEGACIÓN POR PÁGINAS
// ══════════════════════════════════════════
function showPage(pageId, filter) {
  // Ocultar todas las páginas
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

  // Mostrar la página destino
  const target = document.getElementById("page-" + pageId);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // Si vamos al catálogo, aplicar filtro
  if (pageId === "catalogo") {
    const f = filter || "todos";
    setFilter(f);
  }

  // Marcar link activo en nav
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active-nav"));
  document.querySelectorAll(`.nav-link[data-page="${pageId}"]`).forEach(l => l.classList.add("active-nav"));
}

// Delegar todos los clicks que tengan data-page
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-page]");
  if (!el) return;
  e.preventDefault();
  const page   = el.dataset.page;
  const filter = el.dataset.filter || null;
  showPage(page, filter);
  closeNav();
});

// ══════════════════════════════════════════
// CARGAR PRODUCTOS
// ══════════════════════════════════════════
async function loadProducts() {
  try {
    const res  = await fetch("productos.json");
    const data = await res.json();
    products   = data.productos;
  } catch (e) {
    products = FALLBACK_PRODUCTS;
  }
  renderProducts(products);
}

// ══════════════════════════════════════════
// FILTROS
// ══════════════════════════════════════════
function setFilter(cat) {
  document.querySelectorAll(".filter-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.filter === cat);
  });
  const filtered = cat === "todos" ? products : products.filter(p => p.categoria === cat);
  renderProducts(filtered);
}

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

// ══════════════════════════════════════════
// RENDER GRID DE PRODUCTOS
// ══════════════════════════════════════════
function renderProducts(list) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (list.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:3rem">No hay productos en esta categoría todavía.</p>`;
    return;
  }

  list.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.id = p.id;
    card.style.animationDelay = `${Math.min(i * 45, 260)}ms`;

    const cartDisabled = !p.stock ? "disabled" : "";

    // Obtener colores del producto (de variantes)
    const colors = p.variantes ? Object.keys(p.variantes) : (p.colores || []);

    card.innerHTML = `
      <div class="product-img-wrap">
        <img class="product-img" src="${getProductImage(p)}" alt="${p.nombre}" loading="lazy" />
      </div>
      <div class="product-info">
        <p class="product-cat">${p.categoria}</p>
        <h3 class="product-name">${p.nombre}</h3>
      </div>
      <div class="product-bottom">
        <span class="product-price">${formatPrice(p.precio)}</span>
        <button class="card-cart-btn ${cartDisabled}" data-action="quick-add" data-id="${p.id}" aria-label="Agregar al carrito">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          ${p.stock ? "Agregar" : "Sin stock"}
        </button>
      </div>

      <!-- QUICK ADD PANEL -->
      ${p.stock ? `
      <div class="quick-add-panel" id="qa-${p.id}">
        <span class="qa-label">Color</span>
        <div class="qa-options" id="qa-colors-${p.id}">
          ${colors.map(c => `<button class="qa-opt" data-color="${c}">${c}</button>`).join("")}
        </div>
        <span class="qa-label">Talla</span>
        <div class="qa-options" id="qa-sizes-${p.id}"></div>
        <button class="qa-confirm" id="qa-confirm-${p.id}">
          ✓ Confirmar y agregar
        </button>
      </div>` : ""}
    `;

    // Imagen clickeable → modal detalle
    card.querySelector(".product-img-wrap").addEventListener("click", () => openModal(p));
    card.querySelector(".product-name").addEventListener("click", () => openModal(p));
    card.querySelector(".product-cat").addEventListener("click",  () => openModal(p));

    // Botón carrito → quick-add toggle
    const cartBtn = card.querySelector(".card-cart-btn");
    if (cartBtn && p.stock) {
      cartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleQuickAdd(p.id, card, p);
      });
    }

    grid.appendChild(card);

    // Inicializar selectores quick-add
    if (p.stock && p.variantes) {
      initQuickAdd(p, card);
    }
  });
}

// ── Quick-add: toggle panel ────────────────
function toggleQuickAdd(id, card, product) {
  const panel = card.querySelector(`#qa-${id}`);
  if (!panel) return;

  // Cerrar otros paneles abiertos
  document.querySelectorAll(".quick-add-panel.open").forEach(p => {
    if (p.id !== `qa-${id}`) p.classList.remove("open");
  });

  panel.classList.toggle("open");
}

// ── Quick-add: inicializar selectores ──────
function initQuickAdd(product, card) {
  const colors   = Object.keys(product.variantes);
  const colorWrap = card.querySelector(`#qa-colors-${product.id}`);
  const sizeWrap  = card.querySelector(`#qa-sizes-${product.id}`);
  const confirmBtn = card.querySelector(`#qa-confirm-${product.id}`);
  let selColor = "";
  let selSize  = "";

  // Click en color → actualizar tallas disponibles
  colorWrap.querySelectorAll(".qa-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      colorWrap.querySelectorAll(".qa-opt").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selColor = btn.dataset.color;
      selSize  = "";

      const productImg = card.querySelector(".product-img");
      const colorImage = getProductImage(product, selColor);
      if (productImg && colorImage) productImg.src = colorImage;

      // Renderizar tallas con disponibilidad
      const sizes = product.variantes[selColor];
      sizeWrap.innerHTML = Object.entries(sizes).map(([talla, disponible]) =>
        `<button class="qa-opt ${!disponible ? "unavailable" : ""}" data-size="${talla}" ${!disponible ? "disabled" : ""}>${talla}</button>`
      ).join("");

      // Click en talla
      sizeWrap.querySelectorAll(".qa-opt:not(.unavailable)").forEach(sb => {
        sb.addEventListener("click", () => {
          sizeWrap.querySelectorAll(".qa-opt").forEach(b => b.classList.remove("selected"));
          sb.classList.add("selected");
          selSize = sb.dataset.size;
        });
      });
    });
  });

  // Confirmar → agregar al carrito
  confirmBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!selColor) { showToast("Selecciona un color"); return; }
    if (!selSize)  { showToast("Selecciona una talla"); return; }
    addToCart(product, selColor, selSize);
    card.querySelector(`#qa-${product.id}`).classList.remove("open");
    // Reset
    selColor = ""; selSize = "";
    colorWrap.querySelectorAll(".qa-opt").forEach(b => b.classList.remove("selected"));
    sizeWrap.innerHTML = "";
  });
}

// ══════════════════════════════════════════
// MODAL DE DETALLE
// ══════════════════════════════════════════
function initModal() {
  document.getElementById("modalClose").addEventListener("click", () => closeModal("productModal"));
  document.getElementById("modalBackdrop").addEventListener("click", () => closeModal("productModal"));
}

function openModal(product) {
  currentProduct = product;
  selectedColor  = "";
  selectedSize   = "";

  const modal   = document.getElementById("productModal");
  const content = document.getElementById("modalContent");

  const initialImages = getProductImages(product);

  // Colores desde variantes
  const colors = product.variantes ? Object.keys(product.variantes) : (product.colores || []);
  // Tallas: vacío hasta que se seleccione color (o plano si no hay variantes)
  const hasVariants = !!product.variantes;

  content.innerHTML = `
    <div class="modal-gallery">
      <img class="modal-main-img" id="mainImg" src="${getProductImage(product)}" alt="${product.nombre}" />
      <div class="modal-thumbs" id="thumbs">
        ${initialImages.map((f, i) => `
          <img class="modal-thumb ${i === 0 ? "active" : ""}" src="${f}" alt="Foto ${i+1}" data-src="${f}" loading="lazy" />
        `).join("")}
      </div>
    </div>
    <div class="modal-details">
      <p class="modal-cat">${product.categoria}</p>
      <h2 class="modal-name">${product.nombre}</h2>
      <p class="modal-price">${formatPrice(product.precio)}</p>
      <p class="modal-desc">${product.descripcion}</p>

      <span class="selector-label">Color</span>
      <div class="color-options" id="modalColorOpts">
        ${colors.map(c => `<button class="color-option" data-color="${c}">${c}</button>`).join("")}
      </div>

      <span class="selector-label">Talla</span>
      <div class="size-options" id="modalSizeOpts">
        ${!hasVariants ? (product.tallas || []).map(t => `<button class="size-option" data-size="${t}">${t}</button>`).join("") : '<span style="font-size:0.78rem;color:var(--text-muted)">Primero selecciona un color</span>'}
      </div>

      <button class="add-to-cart-btn" id="addToCartBtn" ${!product.stock ? "disabled" : ""}>
        ${!product.stock ? "Sin stock" : "Añadir al carrito"}
      </button>
    </div>
  `;

  initModalThumbs(content);

  // Color → actualizar tallas con disponibilidad
  const colorOpts = content.querySelector("#modalColorOpts");
  const sizeOpts  = content.querySelector("#modalSizeOpts");

  colorOpts.querySelectorAll(".color-option").forEach(btn => {
    btn.addEventListener("click", () => {
      colorOpts.querySelectorAll(".color-option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedColor = btn.dataset.color;
      selectedSize  = "";
      updateModalImages(product, selectedColor, content);

      if (hasVariants) {
        const sizes = product.variantes[selectedColor];
        sizeOpts.innerHTML = Object.entries(sizes).map(([talla, disponible]) =>
          `<button class="size-option ${!disponible ? "unavailable" : ""}" data-size="${talla}" ${!disponible ? "disabled" : ""}>${talla}</button>`
        ).join("");
        sizeOpts.querySelectorAll(".size-option:not(.unavailable)").forEach(sb => {
          sb.addEventListener("click", () => {
            sizeOpts.querySelectorAll(".size-option").forEach(b => b.classList.remove("selected"));
            sb.classList.add("selected");
            selectedSize = sb.dataset.size;
          });
        });
      }
    });
  });

  // Tallas sin variantes (legacy)
  if (!hasVariants) {
    sizeOpts.querySelectorAll(".size-option").forEach(btn => {
      btn.addEventListener("click", () => {
        sizeOpts.querySelectorAll(".size-option").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedSize = btn.dataset.size;
      });
    });
  }

  // Botón añadir
  const addBtn = content.querySelector("#addToCartBtn");
  if (addBtn && product.stock) {
    addBtn.addEventListener("click", () => {
      if (!selectedColor) { showToast("Selecciona un color"); return; }
      if (!selectedSize)  { showToast("Selecciona una talla"); return; }
      addToCart(product, selectedColor, selectedSize);
      closeModal("productModal");
    });
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function initModalThumbs(content) {
  content.querySelectorAll(".modal-thumb").forEach(thumb => {
    thumb.addEventListener("click", () => {
      document.getElementById("mainImg").src = thumb.dataset.src;
      content.querySelectorAll(".modal-thumb").forEach(t => t.classList.remove("active"));
      thumb.classList.add("active");
    });
  });
}

function updateModalImages(product, color, content) {
  const images = getProductImages(product, color);
  const mainImg = content.querySelector("#mainImg");
  const thumbs = content.querySelector("#thumbs");
  if (!images.length || !mainImg || !thumbs) return;

  mainImg.src = images[0];
  thumbs.innerHTML = images.map((f, i) => `
    <img class="modal-thumb ${i === 0 ? "active" : ""}" src="${f}" alt="Foto ${i+1}" data-src="${f}" loading="lazy" />
  `).join("");
  initModalThumbs(content);
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  document.body.style.overflow = "";
}

// ══════════════════════════════════════════
// CARRITO
// ══════════════════════════════════════════
function initCart() {
  document.getElementById("cartBtn").addEventListener("click", openCart);
  document.getElementById("closeCart").addEventListener("click", closeCart);
}

function addToCart(product, color, size) {
  const existing = cart.find(i => i.id === product.id && i.color === color && i.size === size);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, color, size, qty: 1 });
  }
  updateCartUI();
  openCart();
  showToast(`"${product.nombre}" agregado al carrito`);
}

function removeFromCart(id, color, size) {
  cart = cart.filter(i => !(i.id === id && i.color === color && i.size === size));
  updateCartUI();
}

function cartTotal() {
  return cart.reduce((sum, i) => sum + i.precio * i.qty, 0);
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById("cartCount").textContent = count;

  const itemsEl  = document.getElementById("cartItems");
  const footerEl = document.getElementById("cartFooter");

  if (cart.length === 0) {
    itemsEl.innerHTML  = `<div class="cart-empty">Tu carrito está vacío.<br>¡Explora el catálogo!</div>`;
    footerEl.innerHTML = "";
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${getProductImage(item, item.color)}" alt="${item.nombre}" />
      <div>
        <p class="cart-item-name">${item.nombre}</p>
        <p class="cart-item-details">Color: ${item.color}<br>Talla: ${item.size}<br>Cant: ${item.qty}</p>
        <button class="cart-remove" data-id="${item.id}" data-color="${item.color}" data-size="${item.size}">Eliminar</button>
      </div>
      <span class="cart-item-price">${formatPrice(item.precio * item.qty)}</span>
    </div>
  `).join("");

  footerEl.innerHTML = `
    <div class="cart-total">
      <span>Total</span>
      <strong>${formatPrice(cartTotal())}</strong>
    </div>
    <p class="cart-note">⚠️ Envío no incluido — se calcula aparte</p>
    <button class="checkout-btn" id="checkoutBtn">Finalizar pedido</button>
  `;

  itemsEl.querySelectorAll(".cart-remove").forEach(btn => {
    btn.addEventListener("click", () => removeFromCart(btn.dataset.id, btn.dataset.color, btn.dataset.size));
  });

  document.getElementById("checkoutBtn").addEventListener("click", openCheckout);
}

function openCart() {
  document.getElementById("cartPanel").classList.add("open");
  document.getElementById("overlay").classList.add("active");
  updateCartUI();
}
function closeCart() {
  document.getElementById("cartPanel").classList.remove("open");
  if (!document.getElementById("sideNav").classList.contains("open")) {
    document.getElementById("overlay").classList.remove("active");
  }
}

// ══════════════════════════════════════════
// CHECKOUT
// ══════════════════════════════════════════
function initCheckout() {
  document.getElementById("checkoutClose").addEventListener("click", () => closeModal("checkoutModal"));
  document.getElementById("checkoutBackdrop").addEventListener("click", () => closeModal("checkoutModal"));
  document.getElementById("sendWhatsApp").addEventListener("click", sendOrder);
}

function openCheckout() {
  closeCart();
  document.getElementById("checkoutSummary").innerHTML = cart.map(i => `
    <div class="checkout-summary-item">
      <span>${i.nombre} × ${i.qty} (${i.color} / ${i.size})</span>
      <span>${formatPrice(i.precio * i.qty)}</span>
    </div>
  `).join("") + `
    <div class="checkout-total-row">
      <span>Total productos</span>
      <span>${formatPrice(cartTotal())}</span>
    </div>
  `;
  document.getElementById("checkoutModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function sendOrder() {
  const nombre   = document.getElementById("cf-nombre").value.trim();
  const telefono = document.getElementById("cf-telefono").value.trim();
  const ciudad   = document.getElementById("cf-ciudad").value.trim();
  const dpto     = document.getElementById("cf-dpto").value.trim();
  const direccion= document.getElementById("cf-direccion").value.trim();
  const pago     = document.getElementById("cf-pago").value;
  const notas    = document.getElementById("cf-notas").value.trim();

  if (!nombre || !telefono || !ciudad || !dpto || !direccion || !pago) {
    showToast("Por favor completa todos los campos obligatorios (*)");
    return;
  }

  const items = cart.map(i =>
    `• ${i.nombre} | Color: ${i.color} | Talla: ${i.size} | Cant: ${i.qty} | ${formatPrice(i.precio * i.qty)}`
  ).join("\n");

  const msg = `
🛍️ *NUEVO PEDIDO — MELEK NAKIŞ*

*PRODUCTOS:*
${items}

💰 *Total productos:* ${formatPrice(cartTotal())}
⚠️ Envío no incluido

---
*DATOS DE ENTREGA:*
👤 Nombre: ${nombre}
📱 Teléfono: ${telefono}
🏙️ Ciudad: ${ciudad}, ${dpto}
📍 Dirección: ${direccion}

💳 *Método de pago:* ${pago}
${notas ? `📝 Notas: ${notas}` : ""}

---
¡Hola! Quiero confirmar este pedido. 🌊
  `.trim();

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  closeModal("checkoutModal");
}

// ══════════════════════════════════════════
// NAV LATERAL
// ══════════════════════════════════════════
function initNav() {
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("closeNav");
  const overlay  = document.getElementById("overlay");

  menuBtn.addEventListener("click", () => {
    openNav();
    menuBtn.classList.add("active");
  });
  closeBtn.addEventListener("click", closeNav);
  overlay.addEventListener("click", () => { closeNav(); closeCart(); });

  // Toggle submenu catálogo
  const catToggle = document.getElementById("navCatToggle");
  const subCat    = document.getElementById("sub-catalogo");
  if (catToggle) {
    catToggle.addEventListener("click", () => {
      const isOpen = subCat.classList.contains("open");
      subCat.classList.toggle("open", !isOpen);
      catToggle.classList.toggle("open", !isOpen);
    });
  }
}

function openNav() {
  document.getElementById("sideNav").classList.add("open");
  document.getElementById("overlay").classList.add("active");
}
function closeNav() {
  document.getElementById("sideNav").classList.remove("open");
  document.getElementById("menuBtn").classList.remove("active");
  if (!document.getElementById("cartPanel").classList.contains("open")) {
    document.getElementById("overlay").classList.remove("active");
  }
}

// ══════════════════════════════════════════
// HEADER SCROLL
// ══════════════════════════════════════════
function initHeader() {
  const header = document.querySelector(".top-header");
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 60);
  }, { passive: true });
}

// ══════════════════════════════════════════
// SOCIALS
// ══════════════════════════════════════════
function initSocials() {
  const waMsg = `Hola MELEK NAKIŞ 🌊 ¡Me interesa saber más sobre sus productos!`;
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;
  document.getElementById("floatingWA").href = waUrl;
  document.getElementById("contact-wa").href = waUrl;
  document.getElementById("nav-wa").href     = waUrl;
  document.getElementById("nav-ig").href     = INSTAGRAM_URL;
  document.getElementById("nav-tt").href     = TIKTOK_URL;
  document.getElementById("contact-ig").href = INSTAGRAM_URL;
  document.getElementById("contact-tt").href = TIKTOK_URL;
}

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
function showToast(msg) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

// ══════════════════════════════════════════
// ESC KEY
// ══════════════════════════════════════════
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeModal("productModal");
    closeModal("checkoutModal");
    closeNav();
    closeCart();
    document.querySelectorAll(".quick-add-panel.open").forEach(p => p.classList.remove("open"));
  }
});

// ══════════════════════════════════════════
// FALLBACK PRODUCTS (sin servidor)
// ══════════════════════════════════════════
const FALLBACK_PRODUCTS = [
  {
    id: "top-001", categoria: "tops", nombre: "Top Alma", precio: 85000,
    descripcion: "Top tejido a crochet en punto abierto. Perfecto para la playa. Hecho a mano con hilos importados.",
    stock: true, entregaInmediata: true,
    fotos: [
      "https://images.unsplash.com/photo-1582142407894-ec85a1260626?w=600&q=80",
      "https://images.unsplash.com/photo-1594938298603-c8148c4b4c9c?w=600&q=80"
    ],
    variantes: {
      "Natural": { "XS": true, "S": true,  "M": true,  "L": false },
      "Arena":   { "XS": true, "S": false, "M": true,  "L": true  },
      "Negro":   { "XS": false,"S": true,  "M": true,  "L": true  }
    }
  },
  {
    id: "bikini-001", categoria: "bikinis", nombre: "Bikini Marea", precio: 130000,
    descripcion: "Conjunto de bikini tejido a crochet. Top triángulo + calzón brasilero. Hilo resistente al agua.",
    stock: true, entregaInmediata: true,
    fotos: [
      "https://images.unsplash.com/photo-1570976447640-ac859083963f?w=600&q=80",
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80"
    ],
    variantes: {
      "Natural":      { "XS": true,  "S": true,  "M": true,  "L": false },
      "Negro":        { "XS": true,  "S": true,  "M": true,  "L": true  },
      "Arena dorada": { "XS": false, "S": true,  "M": false, "L": true  }
    }
  },
  {
    id: "bolso-001", categoria: "bolsos", nombre: "Bolso Boho", precio: 110000,
    descripcion: "Bolso tejido a crochet con asa de madera. Espacioso y elegante.",
    stock: true, entregaInmediata: true,
    fotos: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80"
    ],
    variantes: {
      "Natural": { "Único": true  },
      "Camel":   { "Único": true  },
      "Negro":   { "Único": false }
    }
  },
  {
    id: "acc-001", categoria: "accesorios", nombre: "Diadema Boho", precio: 35000,
    descripcion: "Diadema tejida a crochet con flores y detalles de conchas.",
    stock: true, entregaInmediata: true,
    fotos: [
      "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=600&q=80",
      "https://images.unsplash.com/photo-1558618047-3c8e6e0a6c70?w=600&q=80"
    ],
    variantes: {
      "Natural": { "Único": true  },
      "Negro":   { "Único": true  },
      "Camel":   { "Único": false }
    }
  }
];
