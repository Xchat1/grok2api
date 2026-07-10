let mobileNavKeydownHandler = null;
let mobileNavResizeHandler = null;

function setActiveNav(container) {
  const path = window.location.pathname;
  const hash = window.location.hash;
  const links = Array.from(container.querySelectorAll('a[data-nav]'));

  const hashMatch = links.find((link) => {
    const target = link.getAttribute('data-nav') || '';
    const [tPath, tHash] = target.split('#');
    if (!tHash) return false;
    const pathMatch = path === tPath || path.startsWith(tPath + '/');
    return pathMatch && hash === `#${tHash}`;
  });

  links.forEach((link) => {
    const target = link.getAttribute('data-nav') || '';
    const [tPath, tHash] = target.split('#');
    const pathMatch = path === tPath || path.startsWith(tPath + '/');

    link.classList.remove('active');
    if (!pathMatch) return;

    if (tHash) {
      if (hash === `#${tHash}`) link.classList.add('active');
      return;
    }

    // Parent route: only highlight when no hash-specific child is active.
    if (!hashMatch) link.classList.add('active');
  });
}

function setupMobileDrawer(container) {
  const toggleBtn = container.querySelector('#mobile-nav-toggle');
  const overlay = container.querySelector('#mobile-nav-overlay');
  const drawer = container.querySelector('#app-sidebar');
  if (!toggleBtn || !overlay || !drawer) return;

  let isOpen = false;
  let hideTimer = null;

  const closeDrawer = () => {
    if (!isOpen) return;
    isOpen = false;
    toggleBtn.setAttribute('aria-expanded', 'false');
    overlay.classList.remove('is-open');
    drawer.classList.remove('is-open');
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      hideTimer = null;
    }, 200);
  };

  const openDrawer = () => {
    if (isOpen) return;
    isOpen = true;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    toggleBtn.setAttribute('aria-expanded', 'true');
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      drawer.classList.add('is-open');
    });
  };

  const toggleDrawer = () => {
    if (isOpen) closeDrawer();
    else openDrawer();
  };

  toggleBtn.addEventListener('click', toggleDrawer);
  overlay.addEventListener('click', closeDrawer);
  drawer.querySelectorAll('a[data-nav]').forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });

  if (mobileNavKeydownHandler) {
    document.removeEventListener('keydown', mobileNavKeydownHandler);
  }
  mobileNavKeydownHandler = (event) => {
    if (event.key === 'Escape') closeDrawer();
  };
  document.addEventListener('keydown', mobileNavKeydownHandler);

  if (mobileNavResizeHandler) {
    window.removeEventListener('resize', mobileNavResizeHandler);
  }
  mobileNavResizeHandler = () => {
    if (window.innerWidth > 1023) closeDrawer();
  };
  window.addEventListener('resize', mobileNavResizeHandler);

  // Re-run when hash changes (e.g. jumping to #available-models)
  window.addEventListener('hashchange', () => {
    setActiveNav(container);
  });
}

async function loadAdminHeader() {
  const container = document.getElementById('app-header');
  if (!container) return;
  try {
    const res = await fetch('/static/common/header.html?v=apple', { cache: 'no-store' });
    if (!res.ok) return;
    container.innerHTML = await res.text();
    setActiveNav(container);
    setupMobileDrawer(container);
    if (typeof updateStorageModeButton === 'function') {
      updateStorageModeButton();
    }
  } catch (e) {
    // Fail silently to avoid breaking page load
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadAdminHeader();
    setupDevReload();
  });
} else {
  loadAdminHeader();
  setupDevReload();
}

function setupDevReload() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocal) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/admin/dev-reload`;
  
  let ws;
  let wasConnected = false;
  let reconnectTimer = null;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      wasConnected = true;
      console.log('[DevReload] Connected to hot reload server');
      if (reconnectTimer) {
        clearInterval(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onclose = () => {
      if (wasConnected) {
        console.log('[DevReload] Connection lost. Reconnecting...');
        startReconnecting();
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  function startReconnecting() {
    if (reconnectTimer) return;
    reconnectTimer = setInterval(() => {
      const testWs = new WebSocket(wsUrl);
      testWs.onopen = () => {
        clearInterval(reconnectTimer);
        console.log('[DevReload] Reconnected! Reloading page...');
        window.location.reload();
      };
      testWs.onerror = () => {
        // Keep trying
      };
    }, 1000);
  }

  connect();
}
