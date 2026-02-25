(function initSyncAuth(globalObj) {
  function createClient(options) {
    const authTokenKey = String(options?.authTokenKey || "kids_star_auth_token");
    const authUserKey = String(options?.authUserKey || "kids_star_auth_user");
    const getServerSync = typeof options?.getServerSync === "function"
      ? options.getServerSync
      : () => ({});
    const createSnapshotData = typeof options?.createSnapshotData === "function"
      ? options.createSnapshotData
      : () => ({});

    const authState = {
      token: localStorage.getItem(authTokenKey) || "",
      username: localStorage.getItem(authUserKey) || ""
    };

    function saveAuthState() {
      if (authState.token) localStorage.setItem(authTokenKey, authState.token);
      else localStorage.removeItem(authTokenKey);
      if (authState.username) localStorage.setItem(authUserKey, authState.username);
      else localStorage.removeItem(authUserKey);
    }

    function clearAuthState() {
      authState.token = "";
      authState.username = "";
      saveAuthState();
    }

    async function apiFetch(url, requestOptions = {}) {
      const cacheMode = requestOptions.cache || "no-store";
      const headers = {
        ...(requestOptions.headers || {})
      };
      if (authState.token) headers.Authorization = `Bearer ${authState.token}`;
      return fetch(url, { ...requestOptions, cache: cacheMode, headers });
    }

    async function registerAccount(username, password) {
      const response = await apiFetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        return { ok: false, message: data?.message || `注册失败(${response.status})` };
      }
      return { ok: true, data };
    }

    async function loginAccount(username, password) {
      const response = await apiFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        return { ok: false, message: data?.message || `登录失败(${response.status})` };
      }
      return { ok: true, data };
    }

    async function fetchMe() {
      if (!authState.token) return { ok: false };
      const response = await apiFetch("/api/me", { method: "GET" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) return { ok: false };
      return { ok: true, username: data.username };
    }

    async function logoutAccount() {
      await apiFetch("/api/logout", { method: "POST" }).catch(() => null);
      clearAuthState();
    }

    const syncAdapter = {
      mode: "server-sqlite",
      async getStatus() {
        if (!authState.token) {
          return {
            mode: this.mode,
            canSync: false,
            message: "请先登录账户"
          };
        }

        try {
          const response = await apiFetch("/api/health", { method: "GET" });
          if (!response.ok) {
            return {
              mode: this.mode,
              canSync: false,
              message: `服务器不可用（${response.status}）`
            };
          }
          return {
            mode: this.mode,
            canSync: true,
            message: "服务器连接正常"
          };
        } catch {
          return {
            mode: this.mode,
            canSync: false,
            message: "服务器连接失败，请检查 /api 反向代理"
          };
        }
      },
      async push(snapshot = createSnapshotData()) {
        if (!authState.token) return { ok: false, message: "请先登录账户" };
        const serverSync = getServerSync();
        const expectedVersion = typeof serverSync?.version === "number"
          ? Math.max(0, Math.floor(serverSync.version))
          : 0;
        const body = {
          data: snapshot,
          expectedVersion
        };

        let response = await apiFetch("/api/state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        if (response.status === 409) {
          const conflict = await response.json().catch(() => ({}));
          return {
            ok: false,
            conflict: true,
            message: conflict.message || "数据版本冲突，请先同步最新数据",
            serverVersion: typeof conflict.serverVersion === "number" ? conflict.serverVersion : undefined,
            clientVersion: expectedVersion
          };
        }

        if (!response.ok) {
          const text = await response.text();
          return { ok: false, message: `保存失败：${text || response.status}` };
        }

        const result = await response.json().catch(() => ({}));
        if (serverSync && typeof serverSync === "object") {
          serverSync.lastSyncAt = Date.now();
          serverSync.lastSyncStatus = "自动保存成功";
          if (typeof result.version === "number") serverSync.version = result.version;
        }

        return {
          ok: true,
          message: "已保存到服务器"
        };
      },
      async pull() {
        if (!authState.token) return { ok: false, message: "请先登录账户" };
        const response = await apiFetch(`/api/state?t=${Date.now()}`, { method: "GET" });

        if (!response.ok) {
          const text = await response.text();
          return { ok: false, message: `读取失败：${text || response.status}` };
        }

        const payload = await response.json();
        if (!payload?.ok || !payload?.data) {
          return { ok: false, message: "服务器暂无可用数据", version: payload?.version || 0 };
        }

        return { ok: true, message: "已从服务器拉取", data: payload.data, version: payload.version || 0 };
      }
    };

    return {
      authState,
      saveAuthState,
      clearAuthState,
      apiFetch,
      registerAccount,
      loginAccount,
      fetchMe,
      logoutAccount,
      syncAdapter
    };
  }

  globalObj.KSRSyncAuth = {
    createClient
  };
}(window));
