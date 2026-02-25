(function initStore(globalObj) {
  function createStore(options) {
    const storageKey = String(options?.storageKey || "app_state_v1");
    const legacyStorageKey = String(options?.legacyStorageKey || "");
    const defaultData = options?.defaultData || {};

    function load() {
      const raw = localStorage.getItem(storageKey);
      const legacyRaw = legacyStorageKey ? localStorage.getItem(legacyStorageKey) : "";
      const source = raw || legacyRaw;
      if (!source) return structuredClone(defaultData);
      try {
        return JSON.parse(source);
      } catch {
        return structuredClone(defaultData);
      }
    }

    const state = load();

    function persist() {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }

    return {
      state,
      persist
    };
  }

  globalObj.KSRStore = {
    createStore
  };
}(window));
