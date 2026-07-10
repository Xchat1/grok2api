let apiKey = '';
let metricsTimer = null;

let hourlyChart = null;
let dailyChart = null;
let modelsChart = null;

function $(id) {
  return document.getElementById(id);
}

function setText(id, v) {
  const el = $(id);
  if (!el) return;
  el.textContent = v;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return `${n.toFixed(1)}%`;
}

function isAutoRefresh() {
  const el = $('auto-refresh');
  return !!(el && el.checked);
}

function buildCharts() {
  const hourlyEl = $('chart-hourly');
  const dailyEl = $('chart-daily');
  const modelsEl = $('chart-models');
  if (!hourlyEl || !dailyEl || !modelsEl) return;

  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { 
      legend: { 
        display: true,
        labels: { color: '#1d1d1f' }
      } 
    },
    scales: {
      x: { 
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: '#86868b' }
      },
      y: { 
        beginAtZero: true, 
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: '#86868b' }
      }
    }
  };

  hourlyChart = new Chart(hourlyEl, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: '成功', data: [], borderColor: '#34c759', backgroundColor: 'rgba(52,199,89,0.1)', tension: 0.35, fill: true },
      { label: '失败', data: [], borderColor: '#ff3b30', backgroundColor: 'rgba(255,59,48,0.08)', tension: 0.35, fill: true },
    ]},
    options: baseOpts
  });

  dailyChart = new Chart(dailyEl, {
    type: 'bar',
    data: { labels: [], datasets: [
      { label: '成功', data: [], backgroundColor: '#34c759' },
      { label: '失败', data: [], backgroundColor: '#ff3b30' },
    ]},
    options: { ...baseOpts, scales: { x: baseOpts.scales.x, y: baseOpts.scales.y } }
  });

  modelsChart = new Chart(modelsEl, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [
      '#0066cc', '#34c759', '#ff9500', '#ff3b30', '#af52de',
      '#5ac8fa', '#4cd964', '#ffcc00', '#8e8e93', '#ff2d55'
    ]}]},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { 
        legend: { 
          position: 'right',
          labels: { color: '#1d1d1f' }
        } 
      }
    }
  });
}

async function fetchMetrics() {
  const res = await fetch('/api/v1/admin/metrics', { headers: buildAuthHeaders(apiKey) });
  if (res.status === 401) {
    handleUnauthorized();
    return null;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function updateMetricsUI(data) {
  const t = data.tokens || {};
  const invalid = safeNum(t.expired) + safeNum(t.disabled);

  setText('m-token-total', safeNum(t.total).toLocaleString());
  setText('m-token-active', safeNum(t.active).toLocaleString());
  setText('m-token-cooling', safeNum(t.cooling).toLocaleString());
  setText('m-token-invalid', invalid.toLocaleString());
  setText('m-total-calls', safeNum(t.total_calls).toLocaleString());

  const rs = data.request_stats || {};
  const sum = rs.summary || {};
  setText('m-req-total', safeNum(sum.total).toLocaleString());
  setText('m-req-success', safeNum(sum.success).toLocaleString());
  setText('m-req-failed', safeNum(sum.failed).toLocaleString());
  setText('m-success-rate', formatPercent(safeNum(sum.success_rate)));

  const cache = data.cache || {};
  const li = cache.local_image || { count: 0, size_mb: 0 };
  const lv = cache.local_video || { count: 0, size_mb: 0 };
  setText('m-local-image', `${safeNum(li.count)} / ${safeNum(li.size_mb)} MB`);
  setText('m-local-video', `${safeNum(lv.count)} / ${safeNum(lv.size_mb)} MB`);

  const hourly = Array.isArray(rs.hourly) ? rs.hourly : [];
  const daily = Array.isArray(rs.daily) ? rs.daily : [];
  const models = Array.isArray(rs.models) ? rs.models : [];

  if (hourlyChart) {
    hourlyChart.data.labels = hourly.map((x) => x.hour || '');
    hourlyChart.data.datasets[0].data = hourly.map((x) => safeNum(x.success));
    hourlyChart.data.datasets[1].data = hourly.map((x) => safeNum(x.failed));
    hourlyChart.update();
  }
  if (dailyChart) {
    dailyChart.data.labels = daily.map((x) => x.date || '');
    dailyChart.data.datasets[0].data = daily.map((x) => safeNum(x.success));
    dailyChart.data.datasets[1].data = daily.map((x) => safeNum(x.failed));
    dailyChart.update();
  }
  if (modelsChart) {
    modelsChart.data.labels = models.map((x) => x.model || '');
    modelsChart.data.datasets[0].data = models.map((x) => safeNum(x.count));
    modelsChart.update();
  }
}

async function refreshMetricsOnce(silent = false) {
  try {
    const data = await fetchMetrics();
    if (!data) return;
    updateMetricsUI(data);
  } catch (e) {
    if (!silent) showToast(`刷新失败: ${e.message || e}`, 'error');
  }
}

function setupEvents() {
  const btn = $('btn-refresh');
  if (btn) {
    btn.addEventListener('click', async () => {
      await refreshMetricsOnce(false);
    });
  }

  const btnClear = $('btn-clear-metrics');
  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      if (!confirm('确定要清空本地常用指标记录吗？请求统计与趋势图表将全部重置。')) return;
      try {
        const res = await fetch('/api/v1/admin/metrics/clear', { method: 'POST', headers: buildAuthHeaders(apiKey) });
        if (res.status === 401) { handleUnauthorized(); return; }
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (data.success) {
          showToast(data.message || '已清空');
          await refreshMetricsOnce(false);
        } else throw new Error(data.detail || data.message || '清空失败');
      } catch (e) {
        showToast('清空失败: ' + (e.message || e), 'error');
      }
    });
  }
}

function startTimers() {
  stopTimers();
  metricsTimer = setInterval(() => {
    if (!isAutoRefresh()) return;
    refreshMetricsOnce(true);
  }, 5000);
}

function stopTimers() {
  if (metricsTimer) clearInterval(metricsTimer);
  metricsTimer = null;
}

async function init() {
  apiKey = await ensureApiKey();
  if (apiKey === null) return;
  buildCharts();
  setupEvents();
  await refreshMetricsOnce(true);
  startTimers();
}

window.onload = init;
