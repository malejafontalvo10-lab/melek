/* =============================================
   MELEK NAKIŞ — admin.js
   Panel admin: marcar pedidos como pagados/enviados
   sin entrar a Supabase. Protegido por RLS (profiles.is_admin);
   este script solo controla qué se muestra, no qué se puede leer/escribir.
============================================= */

const ESTADOS = {
  pending:   "Pendiente de pago",
  paid:      "Pagado",
  shipped:   "Enviado",
  failed:    "Pago fallido",
  cancelled: "Cancelado"
};

let ordersCache      = [];
let currentFilter    = "all";
let realtimeChannel  = null;
let shippingOrderId  = null;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("adminLoginForm").addEventListener("submit", handleAdminLogin);
  document.getElementById("adminLogoutBtn").addEventListener("click", handleAdminLogout);
  document.getElementById("adminUnauthorizedLogout").addEventListener("click", handleAdminLogout);

  document.querySelectorAll(".admin-filter-btn").forEach(btn =>
    btn.addEventListener("click", () => setFilter(btn.dataset.filter))
  );
  document.getElementById("adminSearch").addEventListener("input", renderOrders);

  document.getElementById("shipForm").addEventListener("submit", confirmShip);
  document.getElementById("shipCancel").addEventListener("click", closeShipModal);
  document.getElementById("shipModal").addEventListener("click", (e) => {
    if (e.target.id === "shipModal") closeShipModal();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      teardownRealtime();
      showLogin();
    }
  });

  await checkAdminSession();
});

// ── SESIÓN / AUTORIZACIÓN ──────────────────
async function checkAdminSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { showLogin(); return; }
  await verifyAdmin(session.user.id);
}

async function verifyAdmin(userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (error || !profile?.is_admin) {
    showUnauthorized();
    return;
  }

  showDashboard();
  await loadOrders();
  subscribeRealtime();
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const errorEl  = document.getElementById("adminLoginError");
  const submitBtn = document.getElementById("adminLoginSubmit");
  errorEl.textContent = "";

  const email    = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;

  submitBtn.disabled = true;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { errorEl.textContent = "Credenciales incorrectas"; return; }
    await verifyAdmin(data.user.id);
  } catch (err) {
    errorEl.textContent = "No pudimos conectar. Intenta de nuevo.";
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleAdminLogout() {
  teardownRealtime();
  try { await supabase.auth.signOut(); } catch (err) { /* seguimos igual */ }
  ordersCache = [];
  document.getElementById("adminLoginForm").reset();
  showLogin();
}

function showLogin() {
  document.getElementById("adminLogin").classList.remove("is-hidden");
  document.getElementById("adminUnauthorized").classList.add("is-hidden");
  document.getElementById("adminDashboard").classList.add("is-hidden");
}
function showUnauthorized() {
  document.getElementById("adminLogin").classList.add("is-hidden");
  document.getElementById("adminUnauthorized").classList.remove("is-hidden");
  document.getElementById("adminDashboard").classList.add("is-hidden");
}
function showDashboard() {
  document.getElementById("adminLogin").classList.add("is-hidden");
  document.getElementById("adminUnauthorized").classList.add("is-hidden");
  document.getElementById("adminDashboard").classList.remove("is-hidden");
}

// ── CARGA DE PEDIDOS ───────────────────────
async function loadOrders() {
  const list = document.getElementById("ordersAdminList");
  list.innerHTML = `<p class="admin-empty">Cargando pedidos...</p>`;

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(nombre_producto, color, talla, cantidad, precio_unitario)")
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p class="admin-empty">No pudimos cargar los pedidos.</p>`;
    return;
  }

  ordersCache = data || [];
  renderOrders();
}

// ── TIEMPO REAL: pedidos nuevos o cambios se ven sin refrescar ──
function subscribeRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = supabase
    .channel("admin-orders")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, handleRealtimeChange)
    .subscribe();
}

function teardownRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

function handleRealtimeChange(payload) {
  if (payload.eventType === "DELETE") {
    ordersCache = ordersCache.filter(o => o.id !== payload.old.id);
    renderOrders();
    return;
  }
  const isNew = payload.eventType === "INSERT";
  fetchAndUpsertOrder(payload.new.id, isNew);
}

async function fetchAndUpsertOrder(id, isNew) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(nombre_producto, color, talla, cantidad, precio_unitario)")
    .eq("id", id)
    .single();
  if (error || !data) return;

  const idx = ordersCache.findIndex(o => o.id === id);
  if (idx >= 0) ordersCache[idx] = data;
  else ordersCache.unshift(data);

  if (isNew) showToast("¡Nuevo pedido recibido!");
  renderOrders();
}

// ── FILTROS Y BÚSQUEDA ─────────────────────
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll(".admin-filter-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.filter === filter)
  );
  renderOrders();
}

function renderOrders() {
  const list = document.getElementById("ordersAdminList");
  const q = document.getElementById("adminSearch").value.trim().toLowerCase();

  let orders = ordersCache;
  if (currentFilter !== "all") orders = orders.filter(o => o.estado === currentFilter);
  if (q) {
    orders = orders.filter(o =>
      (o.nombre_contacto || "").toLowerCase().includes(q) ||
      (o.telefono || "").toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    );
  }

  if (orders.length === 0) {
    list.innerHTML = `<p class="admin-empty">No hay pedidos en esta vista.</p>`;
    return;
  }

  list.innerHTML = orders.map(orderCardHTML).join("");

  list.querySelectorAll("[data-pay-id]").forEach(btn =>
    btn.addEventListener("click", () => markPaid(btn.dataset.payId))
  );
  list.querySelectorAll("[data-ship-id]").forEach(btn =>
    btn.addEventListener("click", () => openShipModal(btn.dataset.shipId))
  );
}

function orderCardHTML(o) {
  const items = o.order_items.map(it => `
    <p class="admin-item-line">${esc(it.nombre_producto)} (${esc(it.color)} / ${esc(it.talla)}) × ${it.cantidad} — ${formatPrice(it.precio_unitario * it.cantidad)}</p>
  `).join("");

  const trackingHTML = o.estado === "shipped"
    ? `<p class="admin-tracking">Guía: <strong>${esc(o.guia_envio) || "—"}</strong>${o.transportadora ? ` · ${esc(o.transportadora)}` : ""}</p>`
    : "";

  const actions = `
    ${o.estado === "pending" ? `<button class="admin-btn admin-btn-pay" data-pay-id="${o.id}">Marcar como pagado</button>` : ""}
    ${(o.estado === "paid" || o.estado === "pending") ? `<button class="admin-btn admin-btn-ship" data-ship-id="${o.id}">Marcar como enviado</button>` : ""}
  `;

  return `
    <div class="admin-order-card">
      <div class="admin-order-head">
        <span class="admin-order-id">Pedido #${o.id.slice(0, 8)}</span>
        <span class="admin-order-status admin-status-${o.estado}">${ESTADOS[o.estado] || o.estado}</span>
      </div>
      <p class="admin-order-date">${new Date(o.created_at).toLocaleString("es-CO")}</p>
      <div class="admin-order-body">
        <p class="admin-order-client">
          <strong>${esc(o.nombre_contacto)}</strong> · ${esc(o.telefono)}<br/>
          ${esc(o.direccion)}, ${esc(o.ciudad)}, ${esc(o.departamento)}<br/>
          Pago: ${esc(o.metodo_pago)}${o.notas ? ` · Notas: ${esc(o.notas)}` : ""}
        </p>
        <div class="admin-order-items">${items}</div>
        <p class="admin-order-total">Envío: ${formatPrice(o.costo_envio)} · Total: ${formatPrice(o.total)}</p>
        ${trackingHTML}
      </div>
      <div class="admin-order-actions">${actions}</div>
    </div>
  `;
}

// ── ACCIONES ────────────────────────────────
async function markPaid(id) {
  if (!confirm("¿Marcar este pedido como pagado?")) return;
  const { error } = await supabase.from("orders").update({ estado: "paid" }).eq("id", id);
  if (error) { showToast("No se pudo actualizar el pedido"); return; }
  showToast("Pedido marcado como pagado");
}

function openShipModal(id) {
  shippingOrderId = id;
  document.getElementById("shipTransportadora").value = "";
  document.getElementById("shipGuia").value = "";
  document.getElementById("shipModal").classList.remove("is-hidden");
  document.getElementById("shipGuia").focus();
}

function closeShipModal() {
  shippingOrderId = null;
  document.getElementById("shipModal").classList.add("is-hidden");
}

async function confirmShip(e) {
  e.preventDefault();
  if (!shippingOrderId) return;

  const transportadora = document.getElementById("shipTransportadora").value.trim();
  const guia = document.getElementById("shipGuia").value.trim();
  if (!guia) { showToast("Ingresa el número de guía"); return; }

  const submitBtn = document.getElementById("shipSubmit");
  submitBtn.disabled = true;
  try {
    const { error } = await supabase.from("orders").update({
      estado: "shipped",
      transportadora: transportadora || null,
      guia_envio: guia,
      enviado_at: new Date().toISOString()
    }).eq("id", shippingOrderId);
    if (error) throw error;

    showToast("Pedido marcado como enviado");
    closeShipModal();
  } catch (err) {
    showToast("No se pudo marcar el pedido como enviado");
  } finally {
    submitBtn.disabled = false;
  }
}

// ── UTILIDADES ──────────────────────────────
function formatPrice(n) {
  return "$ " + Number(n || 0).toLocaleString("es-CO");
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

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
