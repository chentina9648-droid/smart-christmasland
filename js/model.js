/* Smart Christmasland – Waste & Collection Simulation Model (Phase C Upgrade)
 * Integrates official New Taipei City / MOENV baseline anchors with transparent,
 * non-overlapping mathematical formulas and explicit model assumptions.
 * Pure functions, dual-compatible with Browser (window.WasteModel) and Node (CommonJS).
 */
(function (root) {
  const DataSources =
    typeof module !== 'undefined' && module.exports
      ? require('./data-sources.js')
      : root.WasteDataSources;

  const ASSUMPTIONS = {
    // Official anchor: New Taipei City 2025 MSW = 1,919,573 t / 4,045,301 pop / 365 d = 1.300 kg/person/day.
    // Model assumption: stayHours = 3.5 h (3.5/24 of day) × activityConsumptionFactor = 0.45 => ~0.085 kg/visitor/evening.
    cityDailyPerCapitaKg: 1.30,
    assumedStayHours: 3.5, // [MODEL ASSUMPTION]
    assumedActivityFactor: 0.45, // [MODEL ASSUMPTION]
    // Provisional per-visitor waste generation by stream (kg / visitor / evening) -> sum = 0.0850 kg
    perVisitor: {
      cups: 0.0153, // 18% (beverage cups)
      packaging: 0.0357, // 42% (food boxes, trays, wrappers)
      food: 0.0238, // 28% (food scraps & liquids)
      other: 0.0102, // 12% (napkins, skewers, general trash)
    },
    cupReuseLoss: 0.10, // [MODEL ASSUMPTION] 10% loss / non-return in open plaza (vs. 6–10% in enclosed Ucup venues)
    smartPackagingCut: 0.10, // [MODEL ASSUMPTION] 10% source reduction via eco-packaging in Smart Green base
    diversion: {
      // [MODEL ASSUMPTION] Share diverted to recycling/composting by stream:
      // 'off' (~32.1% overall) calibrated against Taipei NYE empirical field recycling rate (34.53%).
      off: { cups: 0.50, packaging: 0.45, food: 0.15, other: 0.00 },
      // 'on' (~58.7% overall) with stationed volunteer sorting guides (supported qualitatively by Zelenika et al., 2018),
      // bounded below New Taipei City's 65.90% municipal household ceiling.
      on: { cups: 0.80, packaging: 0.70, food: 0.55, other: 0.10 },
      conservative: { cups: 0.65, packaging: 0.55, food: 0.35, other: 0.05 },
      aggressive: { cups: 0.85, packaging: 0.75, food: 0.65, other: 0.15 },
    },
    // Bin physics (all adjustable, marked as MODEL ASSUMPTION to be field-calibrated):
    // 1 station cluster = 8 × 240L bins (2 four-stream sets) = 1,920 L default volume
    stationVolumeL: 1920,
    bulkDensityKgPerL: 0.065, // [MODEL ASSUMPTION] uncompacted mixed festival waste density (kg/L)
    compactionRatioBaseline: 1.0, // uncompacted traditional bins
    compactionRatioSmart: 2.5, // [MODEL ASSUMPTION] smart compacting/managed station multiplier (1.0x–3.0x)
    binCapacityKg: 124.8, // default uncompacted: 1920 L * 0.065 kg/L * 1.0 = 124.8 kg
    peakFactor: 1.3, // [MODEL ASSUMPTION] evening peak accumulation factor vs. average interval
    captureRadiusM: 220, // [MODEL ASSUMPTION] maximum walking distance (m) to a waste station
    captureEfficiency: 100, // adjustable % scalar (50–100%) on spatial distance-decay capture
    decayM: 25,
  };

  // Calibrated to official New Taipei Christmasland zones (Citizen Plaza, Banqiao Station, Wanping Park, Fuzhong/Corridor)
  const HOTSPOTS = [
    { id: 'tree', name: 'Main Christmas tree (Citizen Plaza)', lng: 121.4653, lat: 25.0128, w: 3 },
    { id: 'station', name: 'Banqiao Station Plaza stalls', lng: 121.4627, lat: 25.0137, w: 2 },
    { id: 'food', name: 'Citizen Plaza food & drink zone', lng: 121.4668, lat: 25.0118, w: 3 },
    { id: 'park', name: 'Wanping Urban Park light zone', lng: 121.4684, lat: 25.0103, w: 2.5 },
    { id: 'mall', name: 'Mega City Mall entrance', lng: 121.4672, lat: 25.0133, w: 1.5 },
    { id: 'stage', name: 'Main concert stage area', lng: 121.465, lat: 25.0112, w: 2 },
    { id: 'corridor', name: 'Xianmin Blvd skywalk corridor', lng: 121.4655, lat: 25.0145, w: 1.2 },
  ];

  const BASE_BINS = [
    [121.4646, 25.0131], [121.4632, 25.0140], [121.4660, 25.0124], [121.4675, 25.0112],
    [121.4690, 25.0098], [121.4645, 25.0108], [121.4668, 25.0138], [121.4652, 25.0150],
    [121.4620, 25.0128], [121.4700, 25.0115],
  ];
  const SMART_EXTRA_BINS = [
    [121.4655, 25.0126], [121.4667, 25.0120], [121.4670, 25.0116], [121.4683, 25.0105],
    [121.4629, 25.0135], [121.4652, 25.0113], [121.4673, 25.0131], [121.4657, 25.0143],
  ];

  const SENSITIVITY_PRESETS = {
    conservative: {
      key: 'conservative',
      label: 'Conservative (保守假設)',
      desc: 'Low intervention adoption: 20% reusable/self-brought cups (12% loss), 5% eco-packaging cut, moderate sorting improvement (44.3% diversion), 14 stations, 1.5× compaction, 3 pickups/evening.',
      visitors: 100000,
      reuse: 20,
      cupReuseLoss: 0.12,
      packagingCut: 5,
      sorting: true,
      diversionMode: 'conservative',
      collections: 3,
      stationVolumeL: 1920,
      bulkDensityKgPerL: 0.065,
      compactionRatio: 1.5,
      captureRadiusM: 220,
      captureEfficiency: 100,
      bins: BASE_BINS.concat(SMART_EXTRA_BINS.slice(0, 4)),
    },
    base: {
      key: 'base',
      label: 'Base (基準假設)',
      desc: 'Standard Smart Green assumptions: 35% reusable/self-brought cups (10% loss), 10% eco-packaging cut, volunteer-guided sorting (58.7% diversion), 18 stations, 2.5× compaction, 5 pickups/evening.',
      visitors: 100000,
      reuse: 35,
      cupReuseLoss: 0.10,
      packagingCut: 10,
      sorting: true,
      diversionMode: 'on',
      collections: 5,
      stationVolumeL: 1920,
      bulkDensityKgPerL: 0.065,
      compactionRatio: 2.5,
      captureRadiusM: 220,
      captureEfficiency: 100,
      bins: BASE_BINS.concat(SMART_EXTRA_BINS),
    },
    aggressive: {
      key: 'aggressive',
      label: 'Aggressive (積極假設)',
      desc: 'High deposit-return & policy enforcement: 60% reusable/self-brought cups (6% loss, matching Ucup 94% return), 20% eco-packaging cut, high sorting purity (63.7% diversion), 18 stations, 3.0× compaction, 6 pickups/evening.',
      visitors: 100000,
      reuse: 60,
      cupReuseLoss: 0.06,
      packagingCut: 20,
      sorting: true,
      diversionMode: 'aggressive',
      collections: 6,
      stationVolumeL: 1920,
      bulkDensityKgPerL: 0.065,
      compactionRatio: 3.0,
      captureRadiusM: 220,
      captureEfficiency: 100,
      bins: BASE_BINS.concat(SMART_EXTRA_BINS),
    },
  };

  const SCENARIOS = {
    baseline: {
      label: 'Baseline (一般活動模式)',
      desc: 'Conventional festival waste handling without extra source-reduction or volunteer sorting guides: 100,000 evening visitors (model baseline), 0% extra cup substitution, 0% eco-packaging cut, unguided sorting (32.1% diversion), 10 uncompacted stations (1.0×), 2 collections/evening.',
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
      bins: BASE_BINS,
    },
    smart: {
      label: 'Smart Green (智慧綠色減量)',
      desc: 'Integrated source reduction & smart operations: 35% self-brought/Ucup reusable cups (10% loss), 10% eco-packaging cut, stationed volunteer sorting guides (58.7% diversion), 18 stations, 2.5× compaction (to be calibrated) and IoT-scheduled 5 collections/evening.',
      visitors: 100000,
      reuse: 35,
      cupReuseLoss: 0.10,
      packagingCut: 10,
      collections: 5,
      sorting: true,
      diversionMode: 'on',
      stationVolumeL: 1920,
      bulkDensityKgPerL: 0.065,
      compactionRatio: 2.5,
      captureRadiusM: 220,
      captureEfficiency: 100,
      bins: BASE_BINS.concat(SMART_EXTRA_BINS),
    },
    sensitivity: {
      label: 'Sensitivity Analysis (敏感度分析)',
      desc: 'Compare Conservative, Base, and Aggressive assumption bounds side-by-side to evaluate how parameter uncertainty affects source reduction, residual waste reduction, and bin overflow risk.',
      visitors: 100000,
      reuse: 35,
      cupReuseLoss: 0.10,
      packagingCut: 10,
      collections: 5,
      sorting: true,
      diversionMode: 'on',
      sensitivityTier: 'base',
      stationVolumeL: 1920,
      bulkDensityKgPerL: 0.065,
      compactionRatio: 2.5,
      captureRadiusM: 220,
      captureEfficiency: 100,
      bins: BASE_BINS.concat(SMART_EXTRA_BINS),
    },
    normal: {
      label: 'Normal Weekday Reference',
      desc: 'Ordinary non-festival weekday evening in Citizen Plaza: 15,000 casual visitors/commuters, standard bins and routine 2× collection.',
      visitors: 15000,
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
      bins: BASE_BINS,
    },
  };
  // Backward-compatible alias for legacy references
  SCENARIOS.festival = SCENARIOS.baseline;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function distM(a, b) {
    const R = 6371000, toR = Math.PI / 180;
    const dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
    const x = dLng * Math.cos(((a.lat + b.lat) / 2) * toR);
    return Math.sqrt(x * x + dLat * dLat) * R;
  }

  /** Compute station capacity (kg per pickup) from volume (L), bulk density (kg/L), and compaction ratio. */
  function computeStationCapacityKg(p) {
    if (typeof p.binCapacityKg === 'number' && p.binCapacityKg > 0 && p.useFixedCapacity) {
      return p.binCapacityKg;
    }
    const volL = typeof p.stationVolumeL === 'number' ? p.stationVolumeL : ASSUMPTIONS.stationVolumeL;
    const density = typeof p.bulkDensityKgPerL === 'number' ? p.bulkDensityKgPerL : ASSUMPTIONS.bulkDensityKgPerL;
    const compact = typeof p.compactionRatio === 'number' ? p.compactionRatio : ASSUMPTIONS.compactionRatioBaseline;
    return Math.max(1, volL * density * compact);
  }

  /**
   * Waste generated by stream (kg) after source reduction measures.
   * Note: cup reuse and eco-packaging cut are strictly independent; sorting does NOT alter generation.
   */
  function generated(p) {
    const A = p.perVisitor || ASSUMPTIONS.perVisitor;
    const visitors = Math.max(0, Number(p.visitors) || 0);
    const reuseShare = clamp((Number(p.reuse) || 0) / 100, 0, 1);
    const cupLoss = typeof p.cupReuseLoss === 'number' ? clamp(p.cupReuseLoss, 0, 1) : ASSUMPTIONS.cupReuseLoss;
    const pkgCutShare =
      typeof p.packagingCut === 'number'
        ? clamp(p.packagingCut / 100, 0, 1)
        : 0;

    const cups = visitors * A.cups * (1 - reuseShare * (1 - cupLoss));
    const packaging = visitors * A.packaging * (1 - pkgCutShare);
    const food = visitors * A.food;
    const other = visitors * A.other;
    return { cups, packaging, food, other };
  }

  function resolveDiversion(p) {
    if (p.diversion && typeof p.diversion === 'object') return p.diversion;
    if (p.diversionMode && ASSUMPTIONS.diversion[p.diversionMode]) {
      return ASSUMPTIONS.diversion[p.diversionMode];
    }
    return ASSUMPTIONS.diversion[p.sorting ? 'on' : 'off'];
  }

  function simulateCore(p) {
    const gen = generated(p);
    const div = resolveDiversion(p);
    const total = gen.cups + gen.packaging + gen.food + gen.other;
    const recycled = Object.keys(gen).reduce((s, k) => s + gen[k] * (div[k] || 0), 0);
    const residual = total - recycled;

    const radiusM = typeof p.captureRadiusM === 'number' ? Math.max(10, p.captureRadiusM) : ASSUMPTIONS.captureRadiusM;
    const capEff = typeof p.captureEfficiency === 'number' ? clamp(p.captureEfficiency / 100, 0, 1) : 1.0;
    const collections = Math.max(1, Number(p.collections) || 1);
    const peakFactor = typeof p.peakFactor === 'number' ? p.peakFactor : ASSUMPTIONS.peakFactor;
    const cap = computeStationCapacityKg(p);

    const sumW = HOTSPOTS.reduce((s, h) => s + h.w, 0);
    const rawBins = Array.isArray(p.bins) ? p.bins : BASE_BINS;
    const bins = rawBins.map((b, i) => ({ id: i, lng: b[0], lat: b[1], loadKg: 0, capacityKg: cap }));
    let litter = 0;

    const spots = HOTSPOTS.map((h) => {
      const waste = (total * h.w) / sumW;
      let captured = 0;
      if (bins.length) {
        const d = bins.map((b) => distM(h, b));
        const dMin = Math.min(...d);
        const capture = capEff * Math.max(0, 1 - dMin / radiusM);
        captured = waste * capture;
        const wts = d.map((x) => (x <= radiusM ? 1 / Math.pow(x + ASSUMPTIONS.decayM, 2) : 0));
        const sw = wts.reduce((s, x) => s + x, 0);
        if (sw > 0) bins.forEach((b, i) => (b.loadKg += (captured * wts[i]) / sw));
        else captured = 0;
      }
      const lost = waste - captured;
      litter += lost;
      return Object.assign({}, h, { wasteKg: waste, litterKg: lost });
    });

    bins.forEach((b) => {
      b.fill = ((b.loadKg / collections) * peakFactor) / cap;
      b.overflowKg = Math.max(0, b.loadKg * peakFactor - cap * collections) / peakFactor;
    });

    const overflowKg = bins.reduce((s, b) => s + b.overflowKg, 0);
    const capturedKg = Math.max(0, total - litter);
    const overflowing = bins.filter((b) => b.fill > 1).length;
    const atRisk = bins.filter((b) => b.fill >= 0.7).length;
    const avgFill = bins.length ? bins.reduce((s, b) => s + b.fill, 0) / bins.length : 0;

    return {
      gen,
      total,
      totalWasteGenerated: total,
      recycled,
      recycledWaste: recycled,
      residual,
      residualWaste: residual,
      litter,
      litterWaste: litter,
      capturedKg,
      overflowKg,
      overflowWaste: overflowKg,
      stationCapacityKg: cap,
      bins,
      spots,
      overflowing,
      atRisk,
      avgFill,
      diversionRatePct: total > 0 ? (recycled / total) * 100 : 0,
      riskLevel: riskLevel(bins.length ? overflowing / bins.length : 1, litter / Math.max(total, 1)),
    };
  }

  function simulate(p) {
    const cur = simulateCore(p);
    const baseCfg = Object.assign({}, SCENARIOS.baseline, {
      visitors: p.visitors,
      perVisitor: p.perVisitor || ASSUMPTIONS.perVisitor,
    });
    const base = simulateCore(baseCfg);

    // Unified Positive Reduction Rate Formula: (Baseline - Scenario) / Baseline * 100%
    const sourceWasteReductionKg = base.total - cur.total;
    const sourceReductionPct = base.total > 0 ? ((base.total - cur.total) / base.total) * 100 : 0;
    const residualWasteReductionKg = base.residual - cur.residual;
    const residualReductionPct = base.residual > 0 ? ((base.residual - cur.residual) / base.residual) * 100 : 0;

    return Object.assign({}, cur, {
      baselineTotal: base.total,
      baselineResidual: base.residual,
      sourceWasteReductionKg,
      sourceReductionPct,
      residualWasteReductionKg,
      residualReductionPct,
    });
  }

  function riskLevel(overflowShare, litterShare) {
    const s = overflowShare + litterShare * 2;
    if (s >= 0.4) return 'High';
    if (s >= 0.12) return 'Medium';
    return 'Low';
  }

  /**
   * Residual-waste reduction rate (%) vs. Baseline at the same visitor count.
   * Unified positive formula: (Baseline - Scenario) / Baseline * 100%.
   */
  function reductionVsBaseline(p) {
    return simulate(p).residualReductionPct;
  }

  /** Source-waste reduction rate (%) vs. Baseline at the same visitor count. */
  function sourceReductionVsBaseline(p) {
    return simulate(p).sourceReductionPct;
  }

  /** Run Conservative, Base, and Aggressive sensitivity tiers at the specified visitor count. */
  function simulateSensitivity(visitorsOverride) {
    const v = typeof visitorsOverride === 'number' ? visitorsOverride : 100000;
    return {
      baseline: simulate(Object.assign({}, SCENARIOS.baseline, { visitors: v })),
      conservative: simulate(Object.assign({}, SENSITIVITY_PRESETS.conservative, { visitors: v })),
      base: simulate(Object.assign({}, SENSITIVITY_PRESETS.base, { visitors: v })),
      aggressive: simulate(Object.assign({}, SENSITIVITY_PRESETS.aggressive, { visitors: v })),
    };
  }

  const api = {
    ASSUMPTIONS,
    HOTSPOTS,
    SCENARIOS,
    SENSITIVITY_PRESETS,
    BASE_BINS,
    SMART_EXTRA_BINS,
    DataSources,
    distM,
    computeStationCapacityKg,
    generated,
    simulate,
    reductionVsBaseline,
    sourceReductionVsBaseline,
    simulateSensitivity,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WasteModel = api;
})(this);
