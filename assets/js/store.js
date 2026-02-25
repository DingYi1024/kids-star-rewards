(function initStore(globalObj) {
  function createStore(options) {
    const storageKey = String(options?.storageKey || "app_state_v1");
    const legacyStorageKey = String(options?.legacyStorageKey || "");
    const checksumKey = `${storageKey}__checksum`;
    const defaultData = options?.defaultData || {};

    function checksum(text) {
      const seed = "ksr-lite-sign-v1::pepper";
      const input = `${seed}|${text}`;
      let hash = 2166136261;
      for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(16).padStart(8, "0");
    }

    function load() {
      const raw = localStorage.getItem(storageKey);
      const legacyRaw = legacyStorageKey ? localStorage.getItem(legacyStorageKey) : "";
      const source = raw || legacyRaw;
      if (!source) {
        return {
          state: structuredClone(defaultData),
          meta: { tamperedAtLoad: false }
        };
      }
      try {
        const parsed = JSON.parse(source);
        const storedChecksum = localStorage.getItem(checksumKey);
        const tamperedAtLoad = Boolean(raw && storedChecksum && storedChecksum !== checksum(source));
        return {
          state: parsed,
          meta: { tamperedAtLoad }
        };
      } catch {
        return {
          state: structuredClone(defaultData),
          meta: { tamperedAtLoad: true }
        };
      }
    }

    const loaded = load();
    const state = loaded.state;
    const meta = loaded.meta || { tamperedAtLoad: false };

    function persist() {
      const text = JSON.stringify(state);
      localStorage.setItem(storageKey, text);
      localStorage.setItem(checksumKey, checksum(text));
    }

    return {
      state,
      persist,
      meta
    };
  }

  globalObj.KSRStore = {
    createStore
  };
}(window));
