// ══════════════════════════════════════════
// CHECKOUT.GEO — acceso a datos: países, departamentos/estados, ciudades
// Colombia: datos locales (front/data/co-geo.json), instantáneo.
// Resto del mundo: API pública countriesnow.space, bajo demanda y cacheada.
// ══════════════════════════════════════════
window.Checkout = window.Checkout || {};

Checkout.Geo = (function () {
  const COUNTRIESNOW_BASE = "https://countriesnow.space/api/v0.1";
  const COLOMBIA_NAME = "Colombia";

  let _countriesPromise = null;
  let _coGeoPromise = null;
  const _statesCache = new Map();
  const _citiesCache = new Map();

  function getCountries() {
    if (!_countriesPromise) {
      _countriesPromise = fetch("/data/countries.json")
        .then((r) => r.json())
        .catch(() => []);
    }
    return _countriesPromise;
  }

  function getColombiaGeo() {
    if (!_coGeoPromise) {
      _coGeoPromise = fetch("/data/co-geo.json")
        .then((r) => r.json())
        .catch(() => []);
    }
    return _coGeoPromise;
  }

  async function getStatesFor(countryName) {
    if (countryName === COLOMBIA_NAME) {
      const geo = await getColombiaGeo();
      return geo.map((d) => ({ name: d.departamento, code: d.departamento }));
    }
    if (_statesCache.has(countryName)) return _statesCache.get(countryName);

    const p = fetch(`${COUNTRIESNOW_BASE}/countries/states`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: countryName })
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error || !json.data?.states?.length) return [];
        return json.data.states.map((s) => ({ name: s.name, code: s.state_code || s.name }));
      })
      .catch(() => []);

    _statesCache.set(countryName, p);
    return p;
  }

  async function getCitiesFor(countryName, stateName) {
    if (countryName === COLOMBIA_NAME) {
      const geo = await getColombiaGeo();
      const dept = geo.find((d) => d.departamento === stateName);
      return (dept?.ciudades || []).map((c) => ({ name: c }));
    }
    const key = `${countryName}|${stateName}`;
    if (_citiesCache.has(key)) return _citiesCache.get(key);

    const p = fetch(`${COUNTRIESNOW_BASE}/countries/state/cities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: countryName, state: stateName })
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error || !json.data?.length) return [];
        return json.data.map((name) => ({ name }));
      })
      .catch(() => []);

    _citiesCache.set(key, p);
    return p;
  }

  return { getCountries, getStatesFor, getCitiesFor };
})();
