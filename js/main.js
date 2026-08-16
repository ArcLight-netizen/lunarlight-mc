(() => {
  'use strict';

  const sidebar = document.getElementById('sidebar');
  const navToggle = document.getElementById('navToggle');
  const navBackdrop = document.getElementById('navBackdrop');
  const navLinks = document.getElementById('navLinks');

  const onScroll = () => {
    sidebar.classList.toggle('scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const closeNav = () => {
    navToggle.classList.remove('open');
    sidebar.classList.remove('open');
    navBackdrop.classList.remove('show');
  };

  const toggleNav = () => {
    const open = navToggle.classList.toggle('open');
    sidebar.classList.toggle('open', open);
    navBackdrop.classList.toggle('show', open);
  };

  navToggle.addEventListener('click', toggleNav);
  navBackdrop.addEventListener('click', closeNav);

  const pages = document.querySelectorAll('.page');
  const navItems = document.querySelectorAll('.side-link');

  const showPage = (target) => {
    pages.forEach((page) => {
      page.classList.toggle('active', page.id === `page-${target}`);
    });
    navItems.forEach((link) => {
      link.classList.toggle('active', link.dataset.target === target);
    });
    closeNav();
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const bindTargets = (container) => {
    container.querySelectorAll('[data-target]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(el.dataset.target);
      });
    });
  };

  bindTargets(navLinks);
  bindTargets(document);

  const isSupported = typeof navigator.clipboard !== 'undefined' && typeof navigator.clipboard.writeText === 'function';

  const fallbackCopy = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  const copyText = (text) => {
    if (isSupported) return navigator.clipboard.writeText(text);
    return Promise.resolve(fallbackCopy(text));
  };

  const flash = (btn, okText) => {
    const original = btn.innerHTML;
    btn.classList.add('copied');
    btn.textContent = okText;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = original;
    }, 1800);
  };

  const copyIpBtn = document.getElementById('copyIp');
  const copyTip = document.getElementById('copyTip');
  let tipTimer = null;

  if (copyIpBtn) {
    copyIpBtn.addEventListener('click', () => {
      copyText('mc.arclight.icu')
        .then(() => {
          copyTip.classList.add('show');
          clearTimeout(tipTimer);
          tipTimer = setTimeout(() => copyTip.classList.remove('show'), 2000);
        })
        .catch(() => {});
    });
  }

  document.querySelectorAll('.copy-btn').forEach((btn) => {
    const text = btn.dataset.copy;
    btn.addEventListener('click', () => {
      copyText(text)
        .then(() => flash(btn, '已复制 ✓'))
        .catch(() => {});
    });
  });

  // ===== 服务器状态实时显示 =====
  const SERVER_HOST = 'mc.arclight.icu';
  const STATUS_API = (host) => `https://api.mcsrvstat.us/3/${host}`;
  const REFRESH_MS = 30000;

  const statusDot = document.getElementById('statusDot');
  const statusState = document.getElementById('statusState');
  const statusVersion = document.getElementById('statusVersion');
  const statusMotd = document.getElementById('statusMotd');
  const statusPlayers = document.getElementById('statusPlayers');
  const statusUpdated = document.getElementById('statusUpdated');
  const statusPlayerList = document.getElementById('statusPlayerList');
  const statusRefresh = document.getElementById('statusRefresh');

  const MC_COLORS = {
    '0': 'black', '1': 'dark-blue', '2': 'dark-green', '3': 'dark-aqua',
    '4': 'dark-red', '5': 'dark-purple', '6': 'gold', '7': 'gray',
    '8': 'dark-gray', '9': 'blue', 'a': 'green', 'b': 'aqua',
    'c': 'red', 'd': 'light-purple', 'e': 'yellow', 'f': 'white'
  };

  const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const parseMotd = (motd) => {
    if (!motd) return '';
    let raw = '';
    if (typeof motd === 'string') {
      raw = motd;
    } else if (Array.isArray(motd)) {
      raw = motd.join('');
    } else if (typeof motd.raw === 'string') {
      raw = motd.raw;
    } else if (typeof motd.raw === 'object' && motd.raw !== null) {
      raw = JSON.stringify(motd.raw);
    } else if (motd.clean && Array.isArray(motd.clean)) {
      raw = motd.clean.join('');
    } else if (typeof motd.clean === 'string') {
      raw = motd.clean;
    } else {
      raw = '';
    }

    let html = '';
    const tokens = raw.split(/(§[0-9a-fk-or])/i);
    let bold = false, italic = false, underline = false, strikethrough = false;
    let colorClass = '';

    tokens.forEach((tok) => {
      if (!tok) return;
      const m = tok.match(/^§([0-9a-fk-or])$/i);
      if (m) {
        const code = m[1].toLowerCase();
        if (code === 'r') {
          bold = italic = underline = strikethrough = false;
          colorClass = '';
        } else if (code === 'l') bold = true;
        else if (code === 'o') italic = true;
        else if (code === 'n') underline = true;
        else if (code === 'm') strikethrough = true;
        else if (code === 'k') return;
        else if (MC_COLORS[code]) {
          colorClass = `mc-${MC_COLORS[code]}`;
        }
        return;
      }

      let inner = escapeHtml(tok);
      let style = colorClass;
      if (bold) style += ' mc-bold';
      if (italic) style += ' mc-italic';
      if (underline) style += ' mc-underline';
      if (strikethrough) style += ' mc-strikethrough';
      html += `<span class="${style.trim()}">${inner}</span>`;
    });

    return html;
  };

  const setState = (cls, text, version) => {
    statusDot.className = `status-dot ${cls}`;
    statusState.textContent = text;
    if (version) {
      statusVersion.textContent = version;
      statusVersion.style.display = 'inline-block';
    } else {
      statusVersion.style.display = 'none';
    }
  };

  const formatTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const loadStatus = async () => {
    statusRefresh.classList.add('spinning');
    try {
      const res = await fetch(STATUS_API(SERVER_HOST), { cache: 'no-store' });
      const data = await res.json();

      if (data.online) {
        setState('online', '服务器在线', data.version || '');
        statusMotd.innerHTML = parseMotd(data.motd);
        const online = (data.players && data.players.online) || 0;
        const max = (data.players && data.players.max) || 0;
        statusPlayers.textContent = `玩家 ${online} / ${max}`;

        const list = (data.players && data.players.list) || [];
        if (list.length > 0) {
          statusPlayerList.innerHTML = '';
          list.slice(0, 12).forEach((name) => {
            const chip = document.createElement('span');
            chip.className = 'player-chip';
            chip.textContent = name;
            statusPlayerList.appendChild(chip);
          });
        } else {
          statusPlayerList.innerHTML = '';
        }
      } else {
        setState('offline', '服务器离线', data.version || '');
        statusMotd.textContent = '服务器暂时无法连接，请稍后再试。';
        statusPlayers.textContent = '玩家 0 / 0';
        statusPlayerList.innerHTML = '';
      }
      statusUpdated.textContent = `更新于 ${formatTime()}`;
    } catch (err) {
      setState('offline', '无法获取服务器状态', '');
      statusMotd.textContent = '网络异常或服务器暂不可达，点击刷新按钮重试。';
      statusPlayers.textContent = '玩家 -- / --';
      statusPlayerList.innerHTML = '';
      statusUpdated.textContent = `更新于 ${formatTime()}`;
    } finally {
      statusRefresh.classList.remove('spinning');
    }
  };

  statusRefresh.addEventListener('click', loadStatus);

  if (statusDot) {
    loadStatus();
    setInterval(loadStatus, REFRESH_MS);
  }
})();
