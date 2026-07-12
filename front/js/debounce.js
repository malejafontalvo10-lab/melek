// ══════════════════════════════════════════
// DEBOUNCE — utilidad compartida
// ══════════════════════════════════════════
window.debounce = function debounce(fn, wait = 250) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
};
