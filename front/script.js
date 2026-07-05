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
let currentUser    = null; // sesión de Supabase Auth, ver initAuth()

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
document.addEventListener("DOMContentLoaded", async () => {
  cart = loadCartLocal();
  initNav();
  initHeader();
  initSocials();
  initCart();
  initModal();
  initCheckout();
  updateCartUI();
  await loadProducts();
  await initAuth(); // si hay sesión activa, reemplaza el carrito local por el del servidor
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

  // Si vamos a la cuenta, cargar el historial de pedidos
  if (pageId === "cuenta" && currentUser) {
    loadUserOrders();
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
const CART_STORAGE_KEY = "melek_cart";

function saveCartLocal() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function loadCartLocal() {
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function initCart() {
  document.getElementById("cartBtn").addEventListener("click", openCart);
  document.getElementById("closeCart").addEventListener("click", closeCart);
}

function addToCart(product, color, size) {
  let item = cart.find(i => i.id === product.id && i.color === color && i.size === size);
  if (item) {
    item.qty++;
  } else {
    item = { ...product, color, size, qty: 1 };
    cart.push(item);
  }
  saveCartLocal();
  if (currentUser) syncCartItemToServer(item);
  updateCartUI();
  openCart();
  showToast(`"${product.nombre}" agregado al carrito`);
}

function removeFromCart(id, color, size) {
  cart = cart.filter(i => !(i.id === id && i.color === color && i.size === size));
  saveCartLocal();
  if (currentUser) removeCartItemFromServer(id, color, size);
  updateCartUI();
}

const SHIPPING_FREE_THRESHOLD = 200000;
const SHIPPING_COST           = 12000;

function cartTotal() {
  return cart.reduce((sum, i) => sum + i.precio * i.qty, 0);
}

function shippingCost() {
  return cartTotal() >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_COST;
}

function orderTotal() {
  return cartTotal() + shippingCost();
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

  const envio = shippingCost();
  footerEl.innerHTML = `
    <div class="cart-total">
      <span>Subtotal</span>
      <strong>${formatPrice(cartTotal())}</strong>
    </div>
    <div class="cart-total">
      <span>Envío</span>
      <strong>${envio === 0 ? "Gratis" : formatPrice(envio)}</strong>
    </div>
    <div class="cart-total">
      <span>Total</span>
      <strong>${formatPrice(orderTotal())}</strong>
    </div>
    <p class="cart-note">${envio === 0 ? "✓ Envío gratis por compra desde " + formatPrice(SHIPPING_FREE_THRESHOLD) : "Envío de " + formatPrice(SHIPPING_COST) + " — gratis desde " + formatPrice(SHIPPING_FREE_THRESHOLD)}</p>
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

  document.querySelectorAll(".payment-option").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".payment-option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      document.getElementById("cf-pago").value = btn.dataset.value;
      updateCheckoutSubmitButton();
    });
  });
}

function resetPaymentSelection() {
  document.getElementById("cf-pago").value = "";
  document.querySelectorAll(".payment-option").forEach(b => b.classList.remove("selected"));
  updateCheckoutSubmitButton();
}

function updateCheckoutSubmitButton() {
  const pago  = document.getElementById("cf-pago").value;
  const btn   = document.getElementById("sendWhatsApp");
  const label = document.getElementById("sendWhatsAppLabel");
  const waIcon = document.getElementById("sendWhatsAppIcon");
  const mpIcon = document.getElementById("sendMPIcon");

  btn.classList.remove("pay-whatsapp", "pay-mercadopago");
  btn.disabled = !pago;

  if (pago === "Mercado Pago") {
    btn.classList.add("pay-mercadopago");
    waIcon.style.display = "none";
    mpIcon.style.display = "";
    label.textContent = "Pagar con Mercado Pago";
  } else if (pago === "Transferencia") {
    btn.classList.add("pay-whatsapp");
    waIcon.style.display = "";
    mpIcon.style.display = "none";
    label.textContent = "Se redirigirá a WhatsApp";
  } else {
    waIcon.style.display = "none";
    mpIcon.style.display = "none";
    label.textContent = "Selecciona un método de pago";
  }
}

function openCheckout() {
  if (!currentUser) {
    closeCart();
    showToast("Inicia sesión para finalizar tu pedido");
    showPage("login");
    return;
  }
  closeCart();
  const envio = shippingCost();
  document.getElementById("checkoutSummary").innerHTML = cart.map(i => `
    <div class="checkout-summary-item">
      <span>${i.nombre} × ${i.qty} (${i.color} / ${i.size})</span>
      <span>${formatPrice(i.precio * i.qty)}</span>
    </div>
  `).join("") + `
    <div class="checkout-summary-item">
      <span>Envío</span>
      <span>${envio === 0 ? "Gratis" : formatPrice(envio)}</span>
    </div>
    <div class="checkout-total-row">
      <span>Total a pagar</span>
      <span>${formatPrice(orderTotal())}</span>
    </div>
  `;
  resetPaymentSelection();
  document.getElementById("checkoutModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

async function sendOrder() {
  if (!currentUser) { showToast("Inicia sesión para finalizar tu pedido"); return; }

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
  if (cart.length === 0) { showToast("Tu carrito está vacío"); return; }

  const submitBtn = document.getElementById("sendWhatsApp");
  submitBtn.disabled = true;

  try {
    const envio = shippingCost();

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: currentUser.id,
      total: orderTotal(),
      costo_envio: envio,
      nombre_contacto: nombre,
      telefono,
      ciudad,
      departamento: dpto,
      direccion,
      metodo_pago: pago,
      notas: notas || null
    }).select("id").single();

    if (error) throw error;

    const itemRows = await Promise.all(cart.map(async i => ({
      order_id: order.id,
      variant_id: await getVariantId(i.id, i.color, i.size),
      nombre_producto: i.nombre,
      color: i.color,
      talla: i.size,
      precio_unitario: i.precio,
      cantidad: i.qty
    })));
    await supabase.from("order_items").insert(itemRows.filter(r => r.variant_id));

    if (pago === "Mercado Pago") {
      // Pago en línea: el pedido se paga en Mercado Pago, no pasa por WhatsApp.
      const { data: pref, error: prefError } = await supabase.functions.invoke("create-preference", {
        body: { order_id: order.id }
      });

      if (prefError || !pref?.init_point) {
        throw prefError || new Error("Mercado Pago no devolvió link de pago");
      }

      await clearCartAfterOrder();
      closeModal("checkoutModal");
      document.getElementById("checkoutForm").reset();
      showToast("Redirigiendo a Mercado Pago...");
      window.location.href = pref.init_point;
      return;
    }

    // Transferencia / llave: se coordina manualmente por WhatsApp, como antes.
    const items = cart.map(i =>
      `• ${i.nombre} | Color: ${i.color} | Talla: ${i.size} | Cant: ${i.qty} | ${formatPrice(i.precio * i.qty)}`
    ).join("\n");

    const msg = `
🛍️ *NUEVO PEDIDO — MELEK NAKIŞ*
📦 Pedido #${order.id.slice(0, 8)}

*PRODUCTOS:*
${items}

💰 *Subtotal:* ${formatPrice(cartTotal())}
🚚 *Envío:* ${envio === 0 ? "Gratis" : formatPrice(envio)}
💳 *Total a pagar:* ${formatPrice(orderTotal())}

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

    await clearCartAfterOrder();
    closeModal("checkoutModal");
    document.getElementById("checkoutForm").reset();
    resetPaymentSelection();
    showToast("¡Pedido creado! Te contactaremos por WhatsApp para coordinar el pago.");
  } catch (err) {
    showToast("No pudimos crear tu pedido, intenta de nuevo");
  } finally {
    submitBtn.disabled = false;
  }
}

async function clearCartAfterOrder() {
  if (currentUser) {
    const cartId = await getOrCreateUserCart(currentUser.id);
    await supabase.from("cart_items").delete().eq("cart_id", cartId);
  }
  cart = [];
  saveCartLocal();
  updateCartUI();
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
// AUTH — LOGIN / REGISTRO / CUENTA
// ══════════════════════════════════════════
async function initAuth() {
  document.getElementById("userBtn").addEventListener("click", (e) => {
    e.preventDefault();
    showPage(currentUser ? "cuenta" : "login");
  });

  document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => setAuthTab(tab.dataset.authTab));
  });

  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("registerForm").addEventListener("submit", handleRegister);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);

  // Mantiene currentUser sincronizado si la sesión expira o se cierra desde otra pestaña
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) { currentUser = null; userCartId = null; updateAuthUI(); }
  });

  await loadCurrentUser();
  // Sesión ya activa al cargar la página (no un login nuevo): el servidor manda sobre el carrito
  if (currentUser) {
    try {
      await loadServerCart();
    } catch (err) {
      // si falla la sincronización, seguimos con el carrito local ya cargado
    }
  }
}

function setAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach(t => t.classList.toggle("active", t.dataset.authTab === tab));
  document.getElementById("loginForm").classList.toggle("active", tab === "login");
  document.getElementById("registerForm").classList.toggle("active", tab === "register");
}

async function loadCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { currentUser = null; updateAuthUI(); return; }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre")
    .eq("id", session.user.id)
    .single();

  currentUser = {
    id: session.user.id,
    email: session.user.email,
    nombre: profile?.nombre || ""
  };
  updateAuthUI();
}

async function handleLogin(e) {
  e.preventDefault();
  const errorEl  = document.getElementById("loginError");
  const submitBtn = document.getElementById("loginSubmit");
  errorEl.textContent = "";

  const email    = document.getElementById("li-email").value.trim();
  const password = document.getElementById("li-password").value;

  submitBtn.disabled = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { errorEl.textContent = error.message; return; }

    await loadCurrentUser();
    await mergeCartOnLogin();
    document.getElementById("loginForm").reset();
    showPage("cuenta");
    showToast("Sesión iniciada");
  } catch (err) {
    errorEl.textContent = "No pudimos conectar. Intenta de nuevo.";
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const errorEl   = document.getElementById("registerError");
  const submitBtn = document.getElementById("registerSubmit");
  errorEl.textContent = "";

  const nombre   = document.getElementById("rg-nombre").value.trim();
  const email    = document.getElementById("rg-email").value.trim();
  const password = document.getElementById("rg-password").value;

  submitBtn.disabled = true;
  try {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre } }
    });
    if (error) { errorEl.textContent = error.message; return; }

    document.getElementById("registerForm").reset();

    if (data.session) {
      await loadCurrentUser();
      await mergeCartOnLogin();
      showPage("cuenta");
      showToast("Cuenta creada");
    } else {
      showToast("Revisa tu correo para confirmar la cuenta");
      setAuthTab("login");
    }
  } catch (err) {
    errorEl.textContent = "No pudimos conectar. Intenta de nuevo.";
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleLogout() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    // seguimos limpiando el estado local aunque falle la llamada de red
  }
  currentUser = null;
  userCartId  = null;
  cart = [];
  saveCartLocal();
  updateCartUI();
  updateAuthUI();
  showPage("inicio");
}

// Refleja el estado de sesión en la nav, el botón de usuario y la página de cuenta.
function updateAuthUI() {
  document.querySelectorAll(".guest-only").forEach(el => el.classList.toggle("is-hidden", !!currentUser));
  document.querySelectorAll(".auth-only").forEach(el => el.classList.toggle("is-hidden", !currentUser));

  document.getElementById("accountNombre").textContent = currentUser?.nombre || "—";
  document.getElementById("accountEmail").textContent  = currentUser?.email  || "—";
}

async function loadUserOrders() {
  const list = document.getElementById("ordersList");
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, estado, total, created_at, order_items(nombre_producto, color, talla, cantidad)")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      list.innerHTML = `<p class="cart-empty">Aún no tienes pedidos.</p>`;
      return;
    }

    list.innerHTML = orders.map(o => `
      <div class="order-card">
        <div class="order-card-head">
          <span>Pedido #${o.id.slice(0, 8)}</span>
          <span class="order-status order-status-${o.estado}">${o.estado}</span>
        </div>
        <p class="order-date">${new Date(o.created_at).toLocaleDateString("es-CO")}</p>
        ${o.order_items.map(it => `<p class="order-item-line">${it.nombre_producto} (${it.color} / ${it.talla}) × ${it.cantidad}</p>`).join("")}
        <p class="order-total">${formatPrice(o.total)}</p>
      </div>
    `).join("");
  } catch (err) {
    list.innerHTML = `<p class="cart-empty">No pudimos cargar tus pedidos.</p>`;
  }
}

// ══════════════════════════════════════════
// CARRITO — SINCRONIZACIÓN CON SUPABASE
// (solo corre si hay sesión iniciada)
// ══════════════════════════════════════════
let userCartId = null;

async function getOrCreateUserCart(userId) {
  if (userCartId) return userCartId;

  const { data: existing } = await supabase.from("carts").select("id").eq("user_id", userId).maybeSingle();
  if (existing) { userCartId = existing.id; return userCartId; }

  const { data: created } = await supabase.from("carts").insert({ user_id: userId }).select("id").single();
  userCartId = created.id;
  return userCartId;
}

async function getVariantId(slug, color, talla) {
  const { data } = await supabase
    .from("product_variants")
    .select("id, products!inner(slug)")
    .eq("products.slug", slug)
    .eq("color", color)
    .eq("talla", talla)
    .maybeSingle();
  return data?.id || null;
}

async function syncCartItemToServer(item) {
  const variantId = await getVariantId(item.id, item.color, item.size);
  if (!variantId) return;
  const cartId = await getOrCreateUserCart(currentUser.id);
  await supabase.from("cart_items").upsert(
    { cart_id: cartId, variant_id: variantId, cantidad: item.qty },
    { onConflict: "cart_id,variant_id" }
  );
}

async function removeCartItemFromServer(id, color, size) {
  const variantId = await getVariantId(id, color, size);
  if (!variantId) return;
  const cartId = await getOrCreateUserCart(currentUser.id);
  await supabase.from("cart_items").delete().eq("cart_id", cartId).eq("variant_id", variantId);
}

// Reemplaza el carrito local por el guardado en Supabase (sesión ya activa al cargar la página)
async function loadServerCart() {
  const cartId = await getOrCreateUserCart(currentUser.id);
  const { data: serverItems } = await supabase
    .from("cart_items")
    .select("cantidad, product_variants(color, talla, products(slug))")
    .eq("cart_id", cartId);

  cart = (serverItems || [])
    .map(si => {
      const slug    = si.product_variants?.products?.slug;
      const product = products.find(p => p.id === slug);
      if (!product) return null;
      return { ...product, color: si.product_variants.color, size: si.product_variants.talla, qty: si.cantidad };
    })
    .filter(Boolean);

  saveCartLocal();
  updateCartUI();
}

// Une el carrito de invitado (localStorage) con el del usuario justo al iniciar sesión
async function mergeCartOnLogin() {
  const cartId = await getOrCreateUserCart(currentUser.id);
  const { data: serverItems } = await supabase
    .from("cart_items")
    .select("cantidad, product_variants(color, talla, products(slug))")
    .eq("cart_id", cartId);

  (serverItems || []).forEach(si => {
    const slug  = si.product_variants?.products?.slug;
    const color = si.product_variants?.color;
    const talla = si.product_variants?.talla;
    if (!slug) return;

    const local = cart.find(i => i.id === slug && i.color === color && i.size === talla);
    if (local) {
      local.qty += si.cantidad;
    } else {
      const product = products.find(p => p.id === slug);
      if (product) cart.push({ ...product, color, size: talla, qty: si.cantidad });
    }
  });

  saveCartLocal();
  updateCartUI();
  await Promise.all(cart.map(syncCartItemToServer));
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
