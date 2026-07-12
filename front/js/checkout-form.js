// ══════════════════════════════════════════
// CHECKOUT.FORM — conecta los 4 comboboxes (país envío, departamento, ciudad,
// país teléfono), la cascada de datos geográficos, el autofill desde el
// perfil guardado y expone los valores listos para enviar el pedido.
// ══════════════════════════════════════════
window.Checkout = window.Checkout || {};

Checkout.Form = (function () {
  const DEFAULT_PHONE_ISO2 = "CO";
  // Por ahora solo se envía a Colombia: el campo "País" queda oculto (ver .is-hidden
  // en index.html) y se preselecciona automáticamente para no bloquear la cascada.
  const SHIPPING_COUNTRY_ISO2 = "CO";

  let countryCombo, deptCombo, cityCombo, phoneCombo;
  let initialized = false;

  const state = { country: null, department: null, city: null, phoneCountry: null };

  function $(id) { return document.getElementById(id); }

  function flagIcon(item) {
    if (!item?.iso2) return "";
    return `<span class="fi fi-${item.iso2.toLowerCase()} combobox-flag"></span>`;
  }

  // Quita acentos/diéresis (Türkiye -> turkiye) para que "tur" encuentre "Türkiye".
  const DIACRITICS_RE = new RegExp("[̀-ͯ]", "g");
  function normalize(s) {
    return s.normalize("NFD").replace(DIACRITICS_RE, "").toLowerCase();
  }

  function filterByName(list, query) {
    const q = normalize(query.trim());
    if (!q) return list;
    return list.filter((i) => normalize(i.name).includes(q));
  }

  function filterCountries(list, query) {
    const q = normalize(query.trim());
    if (!q) return list;
    return list.filter((c) => normalize(c.name).includes(q) || c.iso2.toLowerCase() === q);
  }

  function filterPhoneCountries(list, query) {
    const q = normalize(query.trim()).replace("+", "");
    if (!q) return list;
    return list.filter((c) =>
      normalize(c.name).includes(q) ||
      c.dialCode.replace("+", "").includes(q) ||
      c.iso2.toLowerCase() === q
    );
  }

  // ── Fallback a texto libre cuando la API no tiene datos ──
  function showDeptFreeText(active) {
    $("deptWrapper").classList.toggle("is-hidden", active);
    $("cf-dpto-freetext").classList.toggle("is-hidden", !active);
  }
  function showCityFreeText(active) {
    $("cityWrapper").classList.toggle("is-hidden", active);
    $("cf-ciudad-freetext").classList.toggle("is-hidden", !active);
  }

  // ── Cascada ──
  function resetDepartment(placeholder) {
    state.department = null;
    deptCombo.clear();
    $("cf-dpto-freetext").value = "";
    showDeptFreeText(false);
    deptCombo.setDisabled(true);
    deptCombo.setDisabledPlaceholder(placeholder);
  }

  function resetCity(placeholder) {
    state.city = null;
    cityCombo.clear();
    $("cf-ciudad-freetext").value = "";
    showCityFreeText(false);
    cityCombo.setDisabled(true);
    cityCombo.setDisabledPlaceholder(placeholder);
  }

  function handleCountrySelect(item) {
    state.country = item;
    resetDepartment(item ? "Cargando..." : "Selecciona un país primero");
    resetCity("Selecciona un departamento primero");
    Checkout.Validation.validateAndRender("pais", item ? item.iso2 : "");
    if (!item) return;

    Checkout.Geo.getStatesFor(item.name).then((states) => {
      if (state.country !== item) return; // el país cambió mientras cargaba
      if (!states.length) {
        // Sin departamentos/estados disponibles para este país: tampoco hay forma
        // de consultar ciudades (la API las pide por estado), así que ambos campos
        // pasan a texto libre de una vez, en vez de dejar "ciudad" bloqueada para siempre.
        showDeptFreeText(true);
        showCityFreeText(true);
      } else {
        deptCombo.setDisabled(false);
        deptCombo.setDisabledPlaceholder("");
      }
    });
  }

  function handleDepartmentSelect(item) {
    state.department = item;
    resetCity(item ? "Cargando..." : "Selecciona un departamento primero");
    Checkout.Validation.validateAndRender("departamento", item ? item.name : "");
    if (!item || !state.country) return;

    Checkout.Geo.getCitiesFor(state.country.name, item.name).then((cities) => {
      if (state.department !== item) return; // el departamento cambió mientras cargaba
      if (!cities.length) {
        showCityFreeText(true);
      } else {
        cityCombo.setDisabled(false);
        cityCombo.setDisabledPlaceholder("");
      }
    });
  }

  function handleCitySelect(item) {
    state.city = item;
    Checkout.Validation.validateAndRender("ciudad", item ? item.name : "");
  }

  function handlePhoneCountrySelect(item) {
    state.phoneCountry = item;
    if (item) {
      $("cf-phone-dial").value = item.dialCode;
      $("cf-phone-flag").className = `phone-flag-indicator fi fi-${item.iso2.toLowerCase()}`;
    }
    // No se valida aquí: el país del teléfono se preselecciona automáticamente
    // (Colombia por defecto) y no debe mostrar un error antes de que el usuario escriba el número.
  }

  function init() {
    if (initialized) return;
    initialized = true;

    countryCombo = new GeoAutocomplete({
      inputEl: $("cf-pais"), hiddenEl: $("cf-pais-iso2"), wrapperEl: $("countryWrapper"),
      placeholder: "Buscar país...", minChars: 0,
      fetchItems: (q) => Checkout.Geo.getCountries().then((list) => filterCountries(list, q)),
      renderIcon: flagIcon, getLabel: (c) => c.name, getValue: (c) => c.iso2,
      onSelect: handleCountrySelect, emptyMessage: "No se encontró el país"
    });

    deptCombo = new GeoAutocomplete({
      inputEl: $("cf-dpto"), hiddenEl: $("cf-dpto-code"), wrapperEl: $("deptWrapper"),
      placeholder: "Departamento / Estado", minChars: 0, disabled: true,
      fetchItems: (q) => state.country
        ? Checkout.Geo.getStatesFor(state.country.name).then((list) => filterByName(list, q))
        : Promise.resolve([]),
      getLabel: (d) => d.name, getValue: (d) => d.code,
      onSelect: handleDepartmentSelect, emptyMessage: "No hay departamentos disponibles"
    });
    deptCombo.setDisabledPlaceholder("Selecciona un país primero");

    cityCombo = new GeoAutocomplete({
      inputEl: $("cf-ciudad"), wrapperEl: $("cityWrapper"),
      placeholder: "Ciudad", minChars: 0, disabled: true,
      fetchItems: (q) => (state.country && state.department)
        ? Checkout.Geo.getCitiesFor(state.country.name, state.department.name).then((list) => filterByName(list, q))
        : Promise.resolve([]),
      getLabel: (c) => c.name,
      onSelect: handleCitySelect, emptyMessage: "No hay ciudades disponibles"
    });
    cityCombo.setDisabledPlaceholder("Selecciona un departamento primero");

    phoneCombo = new GeoAutocomplete({
      inputEl: $("cf-phone-country"), hiddenEl: $("cf-phone-iso2"), wrapperEl: $("phoneCountryWrapper"),
      placeholder: "País", minChars: 0,
      fetchItems: (q) => Checkout.Geo.getCountries().then((list) => filterPhoneCountries(list, q)),
      renderIcon: flagIcon, getLabel: (c) => c.dialCode, getRowLabel: (c) => c.name,
      getSublabel: (c) => c.dialCode, getValue: (c) => c.iso2,
      onSelect: handlePhoneCountrySelect, emptyMessage: "No se encontró el país"
    });

    // Toggle de fallback: al escribir en el texto libre, valida igual que el combobox
    $("cf-dpto-freetext").addEventListener("blur", () => {
      Checkout.Validation.validateAndRender("departamento", $("cf-dpto-freetext").value);
    });
    $("cf-ciudad-freetext").addEventListener("blur", () => {
      Checkout.Validation.validateAndRender("ciudad", $("cf-ciudad-freetext").value);
    });

    $("cf-nombre").addEventListener("blur", () => Checkout.Validation.validateAndRender("nombre", $("cf-nombre").value));
    $("cf-direccion").addEventListener("blur", () => Checkout.Validation.validateAndRender("direccion", $("cf-direccion").value));
    $("cf-codigo-postal").addEventListener("blur", () => Checkout.Validation.validateAndRender("codigoPostal", $("cf-codigo-postal").value));

    const validatePhoneLive = window.debounce(() => {
      Checkout.Validation.validateAndRender("telefono", $("cf-telefono-numero").value);
    }, 300);
    $("cf-telefono-numero").addEventListener("input", validatePhoneLive);
    $("cf-telefono-numero").addEventListener("blur", () => {
      Checkout.Validation.validateAndRender("telefono", $("cf-telefono-numero").value);
    });

    // País de teléfono por defecto: Colombia
    Checkout.Geo.getCountries().then((list) => {
      const co = list.find((c) => c.iso2 === DEFAULT_PHONE_ISO2);
      if (co) selectPhoneCountry(co);
    });

    selectDefaultShippingCountry();
  }

  function selectDefaultShippingCountry() {
    Checkout.Geo.getCountries().then((list) => {
      const co = list.find((c) => c.iso2 === SHIPPING_COUNTRY_ISO2);
      if (co) selectCountry(co);
    });
  }

  function selectPhoneCountry(item) {
    phoneCombo.select(item);
  }

  function selectCountry(item) {
    countryCombo.select(item);
  }

  function selectDepartment(item) {
    deptCombo.select(item);
  }

  function selectCity(item) {
    cityCombo.select(item);
  }

  function resetAll() {
    state.country = null; state.department = null; state.city = null;
    countryCombo.clear();
    resetDepartment("Selecciona un país primero");
    resetCity("Selecciona un departamento primero");
    $("cf-codigo-postal").value = "";
    $("cf-telefono-numero").value = "";
    ["nombre", "telefono", "pais", "departamento", "ciudad", "direccion", "codigoPostal"].forEach(Checkout.Validation.clearError);
    Checkout.Geo.getCountries().then((list) => {
      const co = list.find((c) => c.iso2 === DEFAULT_PHONE_ISO2);
      if (co) selectPhoneCountry(co);
    });
    selectDefaultShippingCountry();
  }

  // ── Autofill desde el último pedido/perfil guardado ──
  async function prefillFromProfile(userId) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("pais, pais_iso2, departamento, ciudad, direccion, codigo_postal, phone_dial_code, phone_country_iso2, telefono")
        .eq("id", userId)
        .single();

      if (!profile) return;

      if (profile.direccion) $("cf-direccion").value = profile.direccion;
      if (profile.codigo_postal) $("cf-codigo-postal").value = profile.codigo_postal;

      if (profile.phone_country_iso2) {
        const countries = await Checkout.Geo.getCountries();
        const phoneCountry = countries.find((c) => c.iso2 === profile.phone_country_iso2);
        if (phoneCountry) selectPhoneCountry(phoneCountry);
      }
      if (profile.telefono) {
        const dial = $("cf-phone-dial").value || "";
        const numberOnly = profile.telefono.replace(dial, "").replace(/\D/g, "");
        $("cf-telefono-numero").value = numberOnly;
      }

      if (profile.pais_iso2) {
        const countries = await Checkout.Geo.getCountries();
        const country = countries.find((c) => c.iso2 === profile.pais_iso2);
        if (country) {
          selectCountry(country);
          const states = await Checkout.Geo.getStatesFor(country.name);
          if (profile.departamento) {
            const dept = states.find((s) => s.name === profile.departamento);
            if (dept) {
              selectDepartment(dept);
              const cities = await Checkout.Geo.getCitiesFor(country.name, dept.name);
              if (profile.ciudad) {
                const city = cities.find((c) => c.name === profile.ciudad);
                if (city) selectCity(city);
                else if ($("cf-ciudad-freetext").classList.contains("is-hidden") === false) {
                  $("cf-ciudad-freetext").value = profile.ciudad;
                }
              }
            } else if ($("cf-dpto-freetext").classList.contains("is-hidden") === false) {
              $("cf-dpto-freetext").value = profile.departamento;
              if (profile.ciudad) $("cf-ciudad-freetext").value = profile.ciudad;
            }
          }
        }
      }
    } catch (err) {
      // Sin datos guardados aún, o falló la consulta: el formulario queda vacío, se llena a mano.
    }
  }

  // ── Valores listos para enviar el pedido ──
  function getSelectedGeo() {
    const deptFallbackActive = !$("cf-dpto-freetext").classList.contains("is-hidden");
    const cityFallbackActive = !$("cf-ciudad-freetext").classList.contains("is-hidden");

    const department = deptFallbackActive
      ? { name: $("cf-dpto-freetext").value.trim(), code: null }
      : state.department;

    const city = cityFallbackActive
      ? { name: $("cf-ciudad-freetext").value.trim() }
      : state.city;

    return {
      country: state.country,
      department,
      city,
      postalCode: $("cf-codigo-postal").value.trim()
    };
  }

  function getPhonePayload() {
    const iso2 = $("cf-phone-iso2").value;
    const dial = $("cf-phone-dial").value;
    const number = $("cf-telefono-numero").value.replace(/\D/g, "");
    return {
      phoneCountryIso2: iso2,
      phoneDialCode: dial,
      phoneNumber: number,
      phoneDisplay: dial && number ? `${dial} ${number}` : number
    };
  }

  return { init, resetAll, prefillFromProfile, getSelectedGeo, getPhonePayload };
})();
