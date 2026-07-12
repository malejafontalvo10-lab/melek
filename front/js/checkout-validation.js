// ══════════════════════════════════════════
// CHECKOUT.VALIDATION — reglas + render de errores inline (sin alert())
// ══════════════════════════════════════════
window.Checkout = window.Checkout || {};

Checkout.Validation = (function () {
  const rules = {
    nombre: (v) => v.trim().length >= 3 || "Ingresa tu nombre completo",
    telefono: (v) => /^\d{6,12}$/.test(v.replace(/\D/g, "")) || "Ingresa un teléfono válido",
    pais: (v) => !!v || "Selecciona un país",
    departamento: (v) => !!v || "Selecciona un departamento/estado",
    ciudad: (v) => !!v || "Selecciona una ciudad",
    direccion: (v) => v.trim().length >= 5 || "Ingresa una dirección completa",
    codigoPostal: (v) => v === "" || /^[A-Za-z0-9\- ]{3,10}$/.test(v) || "Código postal inválido"
  };

  function validateField(name, value) {
    const rule = rules[name];
    if (!rule) return true;
    return rule(value ?? "");
  }

  function fieldRow(name) {
    return document.querySelector(`.form-row[data-field="${name}"]`);
  }

  function showError(name, message) {
    const row = fieldRow(name);
    if (!row) return;
    row.classList.add("is-invalid");
    const errEl = document.getElementById(`err-${name}`);
    if (errEl) errEl.textContent = message;
  }

  function clearError(name) {
    const row = fieldRow(name);
    if (!row) return;
    row.classList.remove("is-invalid");
    const errEl = document.getElementById(`err-${name}`);
    if (errEl) errEl.textContent = "";
  }

  function validateAndRender(name, value) {
    const result = validateField(name, value);
    if (result === true) {
      clearError(name);
      return true;
    }
    showError(name, result);
    return false;
  }

  function validateAll(values) {
    let allValid = true;
    Object.keys(rules).forEach((name) => {
      if (!(name in values)) return;
      if (!validateAndRender(name, values[name])) allValid = false;
    });
    return allValid;
  }

  return { rules, validateField, showError, clearError, validateAndRender, validateAll };
})();
