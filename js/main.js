(() => {
  "use strict";

  const JAVA_HOST = "mc.arclight.icu";
  const BEDROCK_HOST = "be.arclight.icu";
  const BEDROCK_PORT = "54188";
  const STATUS_API = (host) => `https://api.mcsrvstat.us/3/${host}`;
  const REFRESH_MS = 30000;

  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");

  const showToast = (msg) => {
    if (!toast) return;
    if (toastMsg) toastMsg.textContent = msg;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
  };

  const fallbackCopy = (text) => {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  };

  const copyText = (text) => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(text);
    }
    return Promise.resolve(fallbackCopy(text));
  };

  const bindCopy = (el, text, okMsg) => {
    if (!el || !text) return;
    el.addEventListener("click", () => {
      copyText(text)
        .then(() => showToast(okMsg || "已复制到剪贴板"))
        .catch(() => showToast("复制失败，请手动复制"));
    });
  };

  document.querySelectorAll("[data-copy]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      const text = el.getAttribute("data-copy");
      copyText(text)
        .then(() => showToast(el.getAttribute("data-copy-msg") || "已复制到剪贴板"))
        .catch(() => showToast("复制失败，请手动复制"));
    });
  });

  const escapeHtml = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const parseMotd = (motd) => {
    if (!motd) return "";
    let raw = "";
    if (typeof motd === "string") raw = motd;
    else if (Array.isArray(motd)) raw = motd.join("");
    else if (typeof motd.raw === "string") raw = motd.raw;
    else if (motd.clean && Array.isArray(motd.clean)) raw = motd.clean.join(" ");
    else if (typeof motd.clean === "string") raw = motd.clean;
    else raw = "";

    const colors = {
      "0": "#000",
      "1": "#00a",
      "2": "#0a0",
      "3": "#0aa",
      "4": "#a00",
      "5": "#a0a",
      "6": "#fa0",
      "7": "#aaa",
      "8": "#555",
      "9": "#55f",
      a: "#5f5",
      b: "#5ff",
      c: "#f55",
      d: "#f5f",
      e: "#ff5",
      f: "#fff",
    };

    let html = "";
    let color = "#e6d7b8";
    raw.split(/(§[0-9a-fk-or])/i).forEach((tok) => {
      if (!tok) return;
      const m = tok.match(/^§([0-9a-fk-or])$/i);
      if (m) {
        const code = m[1].toLowerCase();
        if (code === "r") color = "#e6d7b8";
        else if (colors[code]) color = colors[code];
        return;
      }
      html += `<span style="color:${color}">${escapeHtml(tok)}</span>`;
    });
    return html || escapeHtml(raw);
  };

  const pingClass = (ms) => {
    if (ms == null) return "timeout";
    if (ms < 80) return "good";
    if (ms < 180) return "medium";
    return "slow";
  };

  const renderPlayers = (listEl, names) => {
    if (!listEl) return;
    if (!names || !names.length) {
      listEl.innerHTML = '<div class="player-empty">当前没有在线玩家</div>';
      return;
    }
    listEl.innerHTML = names
      .slice(0, 24)
      .map((item) => {
        const name = typeof item === "string" ? item : item.name || item;
        const uuid = typeof item === "object" && item.uuid ? item.uuid.replace(/-/g, "") : "";
        const src = uuid
          ? `https://crafatar.com/avatars/${uuid}?size=32&overlay`
          : `https://mc-heads.net/avatar/${encodeURIComponent(name)}/32`;
        return `<div class="player-item"><img class="player-head" src="${src}" alt=""><span class="player-name">${escapeHtml(name)}</span></div>`;
      })
      .join("");
  };

  const fillHomeStatus = (data, delayMs) => {
    const statusOnline = document.getElementById("statusOnline");
    const statusPlayers = document.getElementById("statusPlayers");
    const statusVersion = document.getElementById("statusVersion");
    const statusDelay = document.getElementById("statusDelay");
    const playerList = document.getElementById("playerList");
    if (!statusOnline) return;

    if (data && data.online) {
      statusOnline.innerHTML = '<span class="badge badge-online">在线</span>';
      const online = (data.players && data.players.online) || 0;
      const max = (data.players && data.players.max) || 0;
      statusPlayers.textContent = `${online} / ${max}`;
      statusVersion.textContent = data.version || "Leaf 26.1.2";
      statusDelay.textContent = delayMs != null ? `${delayMs} ms` : "--";
      renderPlayers(playerList, (data.players && data.players.list) || []);
    } else {
      statusOnline.innerHTML = '<span class="badge badge-offline">离线</span>';
      statusPlayers.textContent = "0 / 0";
      statusVersion.textContent = "Leaf 26.1.2";
      statusDelay.textContent = "超时";
      if (playerList) playerList.innerHTML = '<div class="player-empty">无法获取在线玩家</div>';
    }
  };

  const fillNetwork = (javaData, javaMs, bedrockData, bedrockMs) => {
    const header = document.getElementById("serverInfoText");
    const icon = document.getElementById("serverIcon");
    const networkList = document.getElementById("networkList");
    const bedrockList = document.getElementById("bedrockList");
    if (!networkList && !header) return;

    if (header) {
      if (javaData && javaData.online) {
        header.innerHTML = `
          <div class="server-motd">${parseMotd(javaData.motd)}</div>
          <div class="server-version">Java · ${escapeHtml(javaData.version || "全版本兼容")} · 玩家 ${(javaData.players && javaData.players.online) || 0}/${(javaData.players && javaData.players.max) || 0}</div>
        `;
      } else {
        header.innerHTML = '<div class="player-loading">暂时无法获取 MOTD，服务器可能离线。</div>';
      }
    }

    if (icon) {
      const src = javaData && javaData.icon ? javaData.icon : "assets/favicon.png";
      icon.src = src;
      icon.style.display = "block";
    }

    if (networkList) {
      const cls = pingClass(javaMs);
      const pingHtml = javaMs == null ? '<span class="ping-timeout">超时</span>' : `${javaMs}<span class="ms"> ms</span>`;
      networkList.innerHTML = `
        <div class="network-row ${cls}" data-copy="${JAVA_HOST}" data-copy-msg="已复制 Java 版 IP">
          <span class="row-name">Java 主线路</span>
          <span class="row-addr">${JAVA_HOST}</span>
          <span class="row-ping">${pingHtml}</span>
        </div>
      `;
      networkList.querySelectorAll("[data-copy]").forEach((el) => {
        bindCopy(el, el.getAttribute("data-copy"), el.getAttribute("data-copy-msg"));
      });
    }

    if (bedrockList) {
      const cls = pingClass(bedrockMs);
      const pingHtml = bedrockMs == null ? '<span class="ping-timeout">超时</span>' : `${bedrockMs}<span class="ms"> ms</span>`;
      const onlineText = bedrockData && bedrockData.online ? bedrockData.version || "在线" : "检测中";
      bedrockList.innerHTML = `
        <div class="bedrock-row ${cls}" data-copy="${BEDROCK_HOST}:${BEDROCK_PORT}" data-copy-msg="已复制基岩版地址">
          <span class="row-name">基岩版</span>
          <span class="row-addr">${BEDROCK_HOST}:${BEDROCK_PORT} · ${escapeHtml(onlineText)}</span>
          <span class="row-ping">${pingHtml}</span>
        </div>
      `;
      bedrockList.querySelectorAll("[data-copy]").forEach((el) => {
        bindCopy(el, el.getAttribute("data-copy"), el.getAttribute("data-copy-msg"));
      });
    }
  };

  const timedFetch = async (host) => {
    const started = performance.now();
    try {
      const res = await fetch(STATUS_API(host), { cache: "no-store" });
      const data = await res.json();
      const ms = Math.max(1, Math.round(performance.now() - started));
      return { data, ms: data && data.online ? ms : null };
    } catch (err) {
      return { data: null, ms: null };
    }
  };

  const loadStatus = async () => {
    const [java, bedrock] = await Promise.all([timedFetch(JAVA_HOST), timedFetch(`${BEDROCK_HOST}:${BEDROCK_PORT}`)]);
    fillHomeStatus(java.data, java.ms);
    fillNetwork(java.data, java.ms, bedrock.data, bedrock.ms);
  };

  if (document.getElementById("statusOnline") || document.getElementById("networkList")) {
    loadStatus();
    window.setInterval(loadStatus, REFRESH_MS);
  }
})();
