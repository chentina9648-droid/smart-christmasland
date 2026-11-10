/* Smart Christmasland – UI, 3D Map, Charts & Data Provenance Renderer */
(function () {
  const M = window.WasteModel;
  const DS = window.WasteDataSources;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const fmtDec = (n, d = 1) => Number(n).toFixed(d);
  const CENTER = [121.4658, 25.0124];

  const state = {
    scenario: 'baseline',
    sensitivityTier: 'base',
    visitors: 100000,
    reuse: 0,
    cupReuseLoss: 0.10,
    packagingCut: 0,
    collections: 2,
    sorting: false,
    diversionMode: 'off',
    stationVolumeL: 1920,
    bulkDensityKgPerL: 0.065,
    compactionRatio: 1.0,
    captureRadiusM: 220,
    captureEfficiency: 100,
    bins: [],
  };

  let addMode = false;
  let mapReady = false;
  const markers = [];
  const charts = {};

  // ---------- Map ----------
  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/dark',
    center: CENTER,
    zoom: 16.2,
    pitch: 55,
    bearing: -20,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  window.__map = map;

  map.on('styleimagemissing', (e) => {
    if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
  });

  map.on('load', () => {
    const symLayer = map.getStyle().layers.find((l) => l.type === 'symbol');
    const firstSymbol = symLayer ? symLayer.id : undefined;
    map.addLayer(
      {
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 10], 0, '#1e2a4a', 60, '#34507f', 150, '#5b7fc0'],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.85,
        },
      },
      firstSymbol
    );

    map.addSource('heat', { type: 'geojson', data: emptyFC() });
    map.addLayer({
      id: 'heat',
      type: 'heatmap',
      source: 'heat',
      paint: {
        'heatmap-weight': ['get', 'w'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 14, 0.8, 18, 2],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 14, 18, 18, 60],
        'heatmap-opacity': 0.75,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, '#2dd4bf',
          0.45, '#facc15',
          0.7, '#fb923c',
          1, '#ef4444',
        ],
      },
    });

    map.addSource('spots', { type: 'geojson', data: emptyFC() });
    map.addLayer({
      id: 'spots',
      type: 'circle',
      source: 'spots',
      paint: {
        'circle-radius': 7,
        'circle-color': '#c084fc',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2,
      },
    });
    map.on('click', 'spots', (e) => {
      const p = e.features[0].properties;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(
          `<b>${p.name}</b><br>Waste generated: ${fmt(p.waste)} kg<br>Uncaptured litter: ${fmt(p.litter)} kg<br><em>Simulated model estimate</em>`
        )
        .addTo(map);
    });
    map.on('mouseenter', 'spots', () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', 'spots', () => (map.getCanvas().style.cursor = ''));

    mapReady = true;
    render();
  });

  map.on('click', (e) => {
    if (!addMode) return;
    addMode = false;
    $('btn-add-bin').classList.remove('active');
    map.getCanvas().style.cursor = '';
    state.bins.push([e.lngLat.lng, e.lngLat.lat]);
    rebuildMarkers();
    render();
  });

  function emptyFC() {
    return { type: 'FeatureCollection', features: [] };
  }

  function rng(seed) {
    let s = seed;
    return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  }

  function heatFC(res) {
    const feats = [];
    const maxW = Math.max(...res.spots.map((s) => s.wasteKg), 1);
    res.spots.forEach((s, i) => {
      const r = rng(i + 1);
      const litterShare = s.litterKg / Math.max(s.wasteKg, 1);
      const intensity = (s.wasteKg / maxW) * (0.35 + 0.65 * litterShare);
      for (let k = 0; k < 14; k++) {
        feats.push(pt(s.lng + (r() - 0.5) * 0.0012, s.lat + (r() - 0.5) * 0.0010, intensity));
      }
    });
    res.bins.forEach((b) => {
      if (b.fill > 0.7) feats.push(pt(b.lng, b.lat, Math.min(1.5, b.fill - 0.4)));
    });
    return { type: 'FeatureCollection', features: feats };
  }
  const pt = (lng, lat, w) => ({
    type: 'Feature',
    properties: { w },
    geometry: { type: 'Point', coordinates: [lng, lat] },
  });

  function rebuildMarkers() {
    markers.forEach((m) => m.remove());
    markers.length = 0;
    state.bins.forEach((b, i) => {
      const el = document.createElement('div');
      el.className = 'bin-marker';
      el.id = `bin-${i}`;
      el.innerHTML = '<span class="ico">🗑️</span><span class="pct"></span>';
      const mk = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(b).addTo(map);
      mk.on('dragend', () => {
        const ll = mk.getLngLat();
        state.bins[i] = [ll.lng, ll.lat];
        render();
      });
      markers.push(mk);
    });
  }

  // ---------- Controls & Scenarios ----------
  function syncInputsFromState() {
    $('in-visitors').value = state.visitors;
    $('in-reuse').value = state.reuse;
    if ($('in-pkg-cut')) $('in-pkg-cut').value = state.packagingCut;
    $('in-collect').value = state.collections;
    $('in-sorting').checked = state.sorting;
    if ($('in-vol')) $('in-vol').value = state.stationVolumeL;
    if ($('in-density')) $('in-density').value = state.bulkDensityKgPerL;
    if ($('in-compact')) $('in-compact').value = state.compactionRatio;
    if ($('in-radius')) $('in-radius').value = state.captureRadiusM;
    if ($('in-cap-eff')) $('in-cap-eff').value = state.captureEfficiency;
  }

  function applyScenario(key) {
    const s = M.SCENARIOS[key] || M.SCENARIOS.baseline;
    Object.assign(state, {
      scenario: key,
      visitors: s.visitors,
      reuse: s.reuse,
      cupReuseLoss: s.cupReuseLoss !== undefined ? s.cupReuseLoss : 0.10,
      packagingCut: s.packagingCut !== undefined ? s.packagingCut : 0,
      collections: s.collections,
      sorting: s.sorting,
      diversionMode: s.diversionMode || (s.sorting ? 'on' : 'off'),
      stationVolumeL: s.stationVolumeL !== undefined ? s.stationVolumeL : 1920,
      bulkDensityKgPerL: s.bulkDensityKgPerL !== undefined ? s.bulkDensityKgPerL : 0.065,
      compactionRatio: s.compactionRatio !== undefined ? s.compactionRatio : 1.0,
      captureRadiusM: s.captureRadiusM !== undefined ? s.captureRadiusM : 220,
      captureEfficiency: s.captureEfficiency !== undefined ? s.captureEfficiency : 100,
      bins: s.bins.map((b) => b.slice()),
    });

    if (key === 'sensitivity') {
      applySensitivityTier(state.sensitivityTier || 'base', false);
    }

    const sensBar = $('sensitivity-bar');
    if (sensBar) sensBar.hidden = key !== 'sensitivity';

    syncInputsFromState();
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.scenario === key));
    $('scenario-desc').textContent = s.desc;
    rebuildMarkers();
    render();
  }

  function applySensitivityTier(tierKey, shouldRender = true) {
    const preset = M.SENSITIVITY_PRESETS[tierKey] || M.SENSITIVITY_PRESETS.base;
    state.sensitivityTier = tierKey;
    Object.assign(state, {
      reuse: preset.reuse,
      cupReuseLoss: preset.cupReuseLoss,
      packagingCut: preset.packagingCut,
      collections: preset.collections,
      sorting: preset.sorting,
      diversionMode: preset.diversionMode,
      stationVolumeL: preset.stationVolumeL,
      bulkDensityKgPerL: preset.bulkDensityKgPerL,
      compactionRatio: preset.compactionRatio,
      captureRadiusM: preset.captureRadiusM,
      captureEfficiency: preset.captureEfficiency,
      bins: preset.bins.map((b) => b.slice()),
    });
    document.querySelectorAll('.sens-tier-btn').forEach((b) => b.classList.toggle('active', b.dataset.tier === tierKey));
    if ($('scenario-desc') && state.scenario === 'sensitivity') {
      $('scenario-desc').textContent = preset.desc;
    }
    syncInputsFromState();
    if (shouldRender) {
      rebuildMarkers();
      render();
    }
  }

  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => applyScenario(t.dataset.scenario)));
  document.querySelectorAll('.sens-tier-btn').forEach((b) => b.addEventListener('click', () => applySensitivityTier(b.dataset.tier, true)));

  $('in-visitors').addEventListener('input', (e) => { state.visitors = +e.target.value; render(); });
  $('in-reuse').addEventListener('input', (e) => { state.reuse = +e.target.value; render(); });
  if ($('in-pkg-cut')) $('in-pkg-cut').addEventListener('input', (e) => { state.packagingCut = +e.target.value; render(); });
  $('in-collect').addEventListener('input', (e) => { state.collections = +e.target.value; render(); });
  $('in-sorting').addEventListener('change', (e) => {
    state.sorting = e.target.checked;
    state.diversionMode = state.sorting ? (state.scenario === 'sensitivity' ? M.SENSITIVITY_PRESETS[state.sensitivityTier].diversionMode : 'on') : 'off';
    render();
  });
  if ($('in-vol')) $('in-vol').addEventListener('input', (e) => { state.stationVolumeL = +e.target.value; render(); });
  if ($('in-density')) $('in-density').addEventListener('input', (e) => { state.bulkDensityKgPerL = +e.target.value; render(); });
  if ($('in-compact')) $('in-compact').addEventListener('input', (e) => { state.compactionRatio = +e.target.value; render(); });
  if ($('in-radius')) $('in-radius').addEventListener('input', (e) => { state.captureRadiusM = +e.target.value; render(); });
  if ($('in-cap-eff')) $('in-cap-eff').addEventListener('input', (e) => { state.captureEfficiency = +e.target.value; render(); });

  $('btn-add-bin').addEventListener('click', () => {
    addMode = !addMode;
    $('btn-add-bin').classList.toggle('active', addMode);
    map.getCanvas().style.cursor = addMode ? 'crosshair' : '';
  });
  $('btn-remove-bin').addEventListener('click', () => { state.bins.pop(); rebuildMarkers(); render(); });
  $('btn-reset-bins').addEventListener('click', () => {
    const baseBins =
      state.scenario === 'sensitivity'
        ? M.SENSITIVITY_PRESETS[state.sensitivityTier].bins
        : (M.SCENARIOS[state.scenario] || M.SCENARIOS.baseline).bins;
    state.bins = baseBins.map((b) => b.slice());
    rebuildMarkers();
    render();
  });
  $('lyr-heat').addEventListener('change', (e) => mapReady && map.setLayoutProperty('heat', 'visibility', e.target.checked ? 'visible' : 'none'));
  $('lyr-3d').addEventListener('change', (e) => {
    if (!mapReady) return;
    map.setLayoutProperty('buildings-3d', 'visibility', e.target.checked ? 'visible' : 'none');
    map.easeTo({ pitch: e.target.checked ? 55 : 0 });
  });

  // ---------- Charts ----------
  Chart.defaults.color = '#cbd5e1';
  Chart.defaults.font.family = 'Inter, sans-serif';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.08)';

  function initCharts() {
    charts.compare = new Chart($('chart-compare'), {
      type: 'bar',
      data: {
        labels: [
          'Baseline (Model)',
          'Sens: Conservative',
          'Smart Green (Base)',
          'Sens: Aggressive',
          'Your Settings',
        ],
        datasets: [
          { label: 'Recycled / Composted (kg, Simulated)', data: [], backgroundColor: '#34d399', stack: 's' },
          { label: 'Residual Waste (kg, Simulated)', data: [], backgroundColor: '#f87171', stack: 's' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, title: { display: true, text: 'kg / evening (Simulated Model Estimate)' } },
        },
      },
    });
    charts.mix = new Chart($('chart-mix'), {
      type: 'doughnut',
      data: {
        labels: ['Beverage Cups (18% base)', 'Food Packaging (42% base)', 'Food Waste (28% base)', 'Other Trash (12% base)'],
        datasets: [{ data: [], backgroundColor: ['#38bdf8', '#fbbf24', '#a3e635', '#c084fc'], borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right' } } },
    });
    charts.bins = new Chart($('chart-bins'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Peak fill before pickup (%)', data: [], backgroundColor: [] }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, suggestedMax: 120, title: { display: true, text: '% of station capacity' } } },
        plugins: { legend: { display: false } },
      },
    });
  }

  const fillColor = (f) => (f > 1 ? '#ef4444' : f >= 0.7 ? '#f59e0b' : '#22c55e');

  function formatPositiveReduction(pct) {
    if (Math.abs(pct) < 0.05) return '0.0%';
    return `${pct.toFixed(1)}%`;
  }

  function renderSensitivityTable(visitors) {
    const tbody = $('sens-table-body');
    if (!tbody) return;
    const sens = M.simulateSensitivity(visitors);
    const rows = [
      { label: 'Baseline (一般活動基準)', cfg: M.SCENARIOS.baseline, r: sens.baseline },
      { label: 'Conservative (保守假設)', cfg: M.SENSITIVITY_PRESETS.conservative, r: sens.conservative },
      { label: 'Base / Smart Green (基準假設)', cfg: M.SENSITIVITY_PRESETS.base, r: sens.base },
      { label: 'Aggressive (積極假設)', cfg: M.SENSITIVITY_PRESETS.aggressive, r: sens.aggressive },
    ];
    tbody.innerHTML = rows
      .map(
        (row) => `
      <tr>
        <td><b>${row.label}</b></td>
        <td>${row.cfg.reuse}% (損耗 ${Math.round((row.cfg.cupReuseLoss || 0.1) * 100)}%)</td>
        <td>${row.cfg.packagingCut || 0}%</td>
        <td>${fmt(row.r.total)} kg</td>
        <td><b>${formatPositiveReduction(row.r.sourceReductionPct)}</b> (${fmt(row.r.sourceWasteReductionKg)} kg)</td>
        <td>${fmt(row.r.recycled)} kg (${fmtDec(row.r.diversionRatePct, 1)}%)</td>
        <td>${fmt(row.r.residual)} kg</td>
        <td><b class="text-green">${formatPositiveReduction(row.r.residualReductionPct)}</b> (${fmt(row.r.residualWasteReductionKg)} kg)</td>
        <td>${fmt(row.r.overflowKg)} kg / ${fmt(row.r.litter)} kg</td>
      </tr>`
      )
      .join('');
  }

  // ---------- Render ----------
  function render() {
    const p = {
      visitors: state.visitors,
      reuse: state.reuse,
      cupReuseLoss: state.cupReuseLoss,
      packagingCut: state.packagingCut,
      collections: state.collections,
      sorting: state.sorting,
      diversionMode: state.diversionMode,
      stationVolumeL: state.stationVolumeL,
      bulkDensityKgPerL: state.bulkDensityKgPerL,
      compactionRatio: state.compactionRatio,
      captureRadiusM: state.captureRadiusM,
      captureEfficiency: state.captureEfficiency,
      bins: state.bins,
    };
    const res = M.simulate(p);

    $('out-visitors').textContent = fmt(state.visitors);
    $('out-reuse').textContent = `${state.reuse}%`;
    if ($('out-pkg-cut')) $('out-pkg-cut').textContent = `${state.packagingCut}%`;
    $('out-collect').textContent = `${state.collections}×`;
    $('bin-count').textContent = state.bins.length;
    if ($('out-station-cap')) $('out-station-cap').textContent = fmtDec(res.stationCapacityKg, 1);
    if ($('out-vol')) $('out-vol').textContent = `${state.stationVolumeL} L (${Math.round(state.stationVolumeL / 240)}×240L)`;
    if ($('out-density')) $('out-density').textContent = `${state.bulkDensityKgPerL.toFixed(3)} kg/L`;
    if ($('out-compact')) $('out-compact').textContent = `${state.compactionRatio.toFixed(1)}×`;
    if ($('out-radius')) $('out-radius').textContent = `${state.captureRadiusM} m`;
    if ($('out-cap-eff')) $('out-cap-eff').textContent = `${state.captureEfficiency}%`;

    // 7+2 KPIs
    setKpi('kpi-waste', fmt(res.total));
    if ($('kpi-source-red')) {
      setKpi('kpi-source-red', formatPositiveReduction(res.sourceReductionPct), res.sourceReductionPct > 3 ? 'low' : '');
      $('kpi-source-red-sub').textContent = `${fmt(res.sourceWasteReductionKg)} kg prevented at source`;
    }
    if ($('kpi-recycled')) {
      setKpi('kpi-recycled', fmt(res.recycled), res.diversionRatePct >= 50 ? 'low' : '');
      $('kpi-recycled-sub').textContent = `${fmtDec(res.diversionRatePct, 1)}% diversion rate`;
    }
    setKpi('kpi-landfill', fmt(res.residual));
    setKpi('kpi-reduction', formatPositiveReduction(res.residualReductionPct), res.residualReductionPct > 5 ? 'low' : '');
    if ($('kpi-reduction-sub')) {
      $('kpi-reduction-sub').textContent = `${fmt(res.residualWasteReductionKg)} kg reduced vs. Baseline`;
    }
    if ($('kpi-overflow')) {
      setKpi('kpi-overflow', fmt(res.overflowKg), res.overflowKg > 0 ? 'high' : 'low');
      $('kpi-overflow-sub').textContent = `${res.overflowing}/${res.bins.length} stations >100% cap`;
    }
    if ($('kpi-litter')) {
      setKpi('kpi-litter', fmt(res.litter), res.litter / Math.max(res.total, 1) > 0.2 ? 'medium' : 'low');
      $('kpi-litter-sub').textContent = `${fmt(res.capturedKg)} kg captured by stations`;
    }
    setKpi('kpi-fill', `${Math.round(res.avgFill * 100)}%`);
    setKpi('kpi-risk', res.riskLevel, res.riskLevel.toLowerCase());
    $('kpi-risk-sub').textContent = `${res.overflowing} overflowing · ${res.atRisk} ≥70% · ${fmt(res.litter)} kg uncaptured`;

    renderSensitivityTable(state.visitors);

    // Markers
    res.bins.forEach((b, i) => {
      const el = markers[i] ? markers[i].getElement() : null;
      if (!el) return;
      el.style.setProperty('--c', fillColor(b.fill));
      el.querySelector('.pct').textContent = `${Math.round(b.fill * 100)}%`;
      el.title = `Station ${i + 1}: load ${fmt(b.loadKg)} kg/evening, cap ${fmtDec(res.stationCapacityKg, 1)} kg/pickup, peak fill ${Math.round(b.fill * 100)}%, overflow ${fmt(b.overflowKg)} kg`;
    });

    // Charts
    const sens = M.simulateSensitivity(state.visitors);
    const cmp = [sens.baseline, sens.conservative, sens.base, sens.aggressive, res];
    charts.compare.data.datasets[0].data = cmp.map((r) => Math.round(r.recycled));
    charts.compare.data.datasets[1].data = cmp.map((r) => Math.round(r.residual));
    charts.compare.update();

    charts.mix.data.datasets[0].data = [res.gen.cups, res.gen.packaging, res.gen.food, res.gen.other].map(Math.round);
    charts.mix.update();

    charts.bins.data.labels = res.bins.map((_, i) => `Stn ${i + 1}`);
    charts.bins.data.datasets[0].data = res.bins.map((b) => Math.round(b.fill * 100));
    charts.bins.data.datasets[0].backgroundColor = res.bins.map((b) => fillColor(b.fill));
    charts.bins.update();

    if (mapReady) {
      map.getSource('heat').setData(heatFC(res));
      map.getSource('spots').setData({
        type: 'FeatureCollection',
        features: res.spots.map((s) => ({
          type: 'Feature',
          properties: { name: s.name, waste: s.wasteKg, litter: s.litterKg },
          geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        })),
      });
    }
  }

  function setKpi(id, val, cls) {
    const el = $(id);
    if (!el) return;
    const b = el.querySelector('b');
    if (b.textContent !== val) {
      b.textContent = val;
      b.classList.remove('bump');
      void b.offsetWidth;
      b.classList.add('bump');
    }
    el.dataset.level = cls || '';
  }

  // ---------- Provenance Table Renderer ----------
  function renderProvenanceTable(filterCat = 'ALL') {
    const tbody = $('provenance-tbody');
    if (!tbody || !DS) return;
    const all = DS.DATA_SOURCES;
    if ($('cnt-all')) $('cnt-all').textContent = all.length;

    let list = all;
    if (filterCat === 'UNVERIFIED') {
      list = all.filter((d) => d.auditStatus === 'UNVERIFIED');
    } else if (filterCat !== 'ALL') {
      list = all.filter((d) => d.category === filterCat && d.auditStatus !== 'UNVERIFIED');
    }
    tbody.innerHTML = list
      .map((d) => {
        const catCls = d.category.toLowerCase();
        const statusCls = d.auditStatus.toLowerCase();
        const assumpBadge = d.isAssumption
          ? '<span class="badge assump-yes">是 (模型假設)</span>'
          : '<span class="badge assump-no">否 (官方/研究)</span>';
        const activeBadge = d.inActiveModel
          ? '<span class="badge active-yes">已納入模型</span>'
          : '<span class="badge active-no">未納入 (僅背景/排除)</span>';

        return `
        <tr data-category="${d.category}" data-status="${d.auditStatus}">
          <td>
            <b>${d.name}</b><br />
            <code class="id-code">${d.id}</code>
          </td>
          <td>
            <b>${d.displayValue || d.value}</b><br />
            <small class="muted">單位: ${d.unit}</small>
          </td>
          <td>${d.year}</td>
          <td>
            ${d.agency}<br />
            <span class="badge cat-${catCls}">${d.category}</span>
          </td>
          <td>
            <span class="badge status-${statusCls}">${d.auditStatus}</span><br />
            ${assumpBadge}<br />
            ${activeBadge}
          </td>
          <td>
            <a href="${d.url}" target="_blank" rel="noopener noreferrer" class="prov-link">${d.url}</a>
          </td>
          <td class="lim-cell">
            <p><b>使用限制：</b>${d.limitations}</p>
            <p class="role-note"><b>模型角色：</b>${d.formulaRole}</p>
          </td>
        </tr>`;
      })
      .join('');
  }

  document.querySelectorAll('.filter-btns .btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btns .btn').forEach((b) => {
        b.classList.remove('active');
        b.classList.add('ghost');
      });
      btn.classList.add('active');
      btn.classList.remove('ghost');
      renderProvenanceTable(btn.dataset.filter);
    });
  });

  initCharts();
  renderProvenanceTable('ALL');
  applyScenario('baseline');
})();
