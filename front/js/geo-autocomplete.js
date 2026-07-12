// ══════════════════════════════════════════
// GEO AUTOCOMPLETE — combobox genérico reutilizable
// País / Departamento / Ciudad / Teléfono, sin conocer Supabase ni el checkout.
// ══════════════════════════════════════════
(function () {
  let instanceCounter = 0;

  class GeoAutocomplete {
    constructor(opts) {
      this.inputEl = opts.inputEl;
      this.hiddenEl = opts.hiddenEl || null;
      this.wrapperEl = opts.wrapperEl;
      this.placeholder = opts.placeholder || "";
      this.minChars = opts.minChars ?? 0;
      this.fetchItems = opts.fetchItems;
      this.renderIcon = opts.renderIcon || null;
      this.getLabel = opts.getLabel;
      this.getRowLabel = opts.getRowLabel || opts.getLabel;
      this.getSublabel = opts.getSublabel || null;
      this.getValue = opts.getValue || null;
      this.onSelect = opts.onSelect || (() => {});
      this.emptyMessage = opts.emptyMessage || "Sin resultados";
      this.allowFreeText = !!opts.allowFreeText;

      this._id = `geo-combobox-${++instanceCounter}`;
      this._items = [];
      this._activeIndex = -1;
      this._requestToken = 0;
      this._selected = null;
      this._open = false;

      this._buildPanel();
      this._bindEvents();
      this.setDisabled(!!opts.disabled);
      if (this.inputEl.placeholder === undefined || !this.inputEl.placeholder) {
        this.inputEl.placeholder = this.placeholder;
      }
    }

    _buildPanel() {
      this.panel = document.createElement("ul");
      this.panel.className = "combobox-panel is-hidden";
      this.panel.id = `${this._id}-listbox`;
      this.panel.setAttribute("role", "listbox");
      this.wrapperEl.style.position = this.wrapperEl.style.position || "relative";
      this.wrapperEl.appendChild(this.panel);

      this.inputEl.setAttribute("role", "combobox");
      this.inputEl.setAttribute("aria-autocomplete", "list");
      this.inputEl.setAttribute("aria-expanded", "false");
      this.inputEl.setAttribute("aria-controls", this.panel.id);
      this.inputEl.setAttribute("autocomplete", "off");
    }

    _bindEvents() {
      const debouncedInput = window.debounce(() => this._handleQuery(this.inputEl.value), 200);

      this.inputEl.addEventListener("focus", () => {
        if (this.inputEl.disabled) return;
        this._handleQuery(this.inputEl.value);
      });
      this.inputEl.addEventListener("input", () => {
        if (this.inputEl.disabled) return;
        debouncedInput();
      });
      this.inputEl.addEventListener("keydown", (e) => this._handleKeydown(e));
      this.inputEl.addEventListener("blur", () => {
        // Se retrasa para permitir que el click (mousedown) en una opción se registre antes de cerrar.
        setTimeout(() => {
          this._close();
          if (this.allowFreeText) return;
          if (this._selected) {
            // Revierte cualquier texto sin confirmar de vuelta a la última selección válida.
            this.inputEl.value = this.getLabel(this._selected);
          } else if (this.inputEl.value !== "") {
            this.inputEl.value = "";
            if (this.hiddenEl) this.hiddenEl.value = "";
          }
        }, 150);
      });

      document.addEventListener("click", (e) => {
        if (this._open && !this.wrapperEl.contains(e.target)) this._close();
      });
    }

    async _handleQuery(query) {
      if (query.length < this.minChars) { this._close(); return; }
      const token = ++this._requestToken;
      this._renderLoading();
      let items = [];
      try {
        items = await this.fetchItems(query);
      } catch (err) {
        items = [];
      }
      if (token !== this._requestToken) return; // respuesta obsoleta, se descarta
      this._items = items || [];
      this._activeIndex = -1;
      this._renderList();
      this._open = true;
      this.inputEl.setAttribute("aria-expanded", "true");
    }

    _renderLoading() {
      this.panel.classList.remove("is-hidden");
      this.panel.innerHTML = `
        <li class="combobox-skeleton-row"></li>
        <li class="combobox-skeleton-row"></li>
        <li class="combobox-skeleton-row"></li>
      `;
      this._open = true;
    }

    _renderList() {
      if (this._items.length === 0) {
        this.panel.innerHTML = `<li class="combobox-empty">${this.emptyMessage}</li>`;
        this.panel.classList.remove("is-hidden");
        return;
      }
      this.panel.innerHTML = this._items.map((item, i) => `
        <li id="${this._id}-opt-${i}" role="option" aria-selected="false" class="combobox-option" data-index="${i}">
          ${this.renderIcon ? this.renderIcon(item) : ""}
          <span class="combobox-option-label">${this.getRowLabel(item)}</span>
          ${this.getSublabel ? `<span class="combobox-option-sublabel">${this.getSublabel(item)}</span>` : ""}
        </li>
      `).join("");
      this.panel.classList.remove("is-hidden");

      this.panel.querySelectorAll(".combobox-option").forEach((row) => {
        row.addEventListener("mousedown", (e) => {
          e.preventDefault(); // evita que el input pierda foco antes del click
          const idx = Number(row.dataset.index);
          this._select(this._items[idx]);
        });
      });
    }

    _handleKeydown(e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!this._open) { this._handleQuery(this.inputEl.value); return; }
        this._activeIndex = Math.min(this._activeIndex + 1, this._items.length - 1);
        this._highlight();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this._activeIndex = Math.max(this._activeIndex - 1, 0);
        this._highlight();
      } else if (e.key === "Enter") {
        if (this._open && this._activeIndex >= 0) {
          e.preventDefault();
          this._select(this._items[this._activeIndex]);
        }
      } else if (e.key === "Escape") {
        this._close();
      } else if (e.key === "Tab") {
        this._close();
      }
    }

    _highlight() {
      const rows = this.panel.querySelectorAll(".combobox-option");
      rows.forEach((row, i) => {
        const active = i === this._activeIndex;
        row.classList.toggle("combobox-option--active", active);
        row.setAttribute("aria-selected", String(active));
      });
      if (this._activeIndex >= 0) {
        this.inputEl.setAttribute("aria-activedescendant", `${this._id}-opt-${this._activeIndex}`);
        rows[this._activeIndex]?.scrollIntoView({ block: "nearest" });
      } else {
        this.inputEl.removeAttribute("aria-activedescendant");
      }
    }

    _select(item) {
      this._selected = item;
      this.inputEl.value = this.getLabel(item);
      if (this.hiddenEl) {
        this.hiddenEl.value = this.getValue ? this.getValue(item) : (item.iso2 || item.code || item.name || "");
      }
      this._close();
      this.onSelect(item);
    }

    _close() {
      this._open = false;
      this.panel.classList.add("is-hidden");
      this.inputEl.setAttribute("aria-expanded", "false");
      this.inputEl.removeAttribute("aria-activedescendant");
    }

    setDisabled(disabled) {
      this.inputEl.disabled = disabled;
      this.inputEl.placeholder = disabled ? this._disabledPlaceholder || this.inputEl.placeholder : this.placeholder;
    }

    setDisabledPlaceholder(text) {
      this._disabledPlaceholder = text;
      if (this.inputEl.disabled) this.inputEl.placeholder = text;
    }

    clear() {
      this._selected = null;
      this._items = [];
      this.inputEl.value = "";
      if (this.hiddenEl) this.hiddenEl.value = "";
      this._close();
    }

    getSelected() {
      return this._selected;
    }

    select(item) {
      this._select(item);
    }
  }

  window.GeoAutocomplete = GeoAutocomplete;
})();
