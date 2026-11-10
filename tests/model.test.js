// Run in Node: node tests/model.test.js  OR open tests/index.html in browser
const assert = require('assert');
const DS = require('../js/data-sources.js');
const M = require('../js/model.js');

const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol;

// 1. Data Provenance Registry Audit Tests (Phase B)
assert(Array.isArray(DS.DATA_SOURCES) && DS.DATA_SOURCES.length >= 15, 'DATA_SOURCES populated');
const seenIds = new Set();
for (const d of DS.DATA_SOURCES) {
  assert(d.id && !seenIds.has(d.id), `Unique ID required: ${d.id}`);
  seenIds.add(d.id);
  assert(d.value !== undefined && d.unit && d.year && d.agency, `Complete metadata for ${d.id}`);
  assert(typeof d.url === 'string' && d.url.startsWith('https://'), `Valid HTTPS URL for ${d.id}`);
  assert(['PASS', 'CONDITIONAL', 'UNVERIFIED'].includes(d.auditStatus), `Valid auditStatus for ${d.id}`);
  assert(['OFFICIAL', 'RESEARCH', 'ASSUMPTION'].includes(d.category), `Valid category for ${d.id}`);
  assert(typeof d.isAssumption === 'boolean', `Boolean isAssumption for ${d.id}`);
  if (d.auditStatus === 'UNVERIFIED') {
    assert(d.inActiveModel === false, `UNVERIFIED source ${d.id} must NOT be in active model`);
  }
}

// Verify mandatory Phase A Audit Corrections in Data Registry
assert(DS.BY_ID.ASSUMP_EVENT_PER_VISITOR_KG.category === 'ASSUMPTION', '0.085 kg/p marked as ASSUMPTION');
assert(DS.BY_ID.ASSUMP_BIN_DENSITY_COMPACTION.category === 'ASSUMPTION', '0.065 kg/L & 3.0x compaction marked as ASSUMPTION');
assert(!String(DS.BY_ID.ZELENIKA_2018_VOLUNTEER_SORTING.value).includes('85'), 'Zelenika 2018 does not use 85-97% as quantitative multiplier');
assert(!String(DS.BY_ID.KHAN_2024_IOT_WASTE_COLLECTION.displayValue).includes('80%'), 'Khan 2024 restricted to IoT dynamic scheduling conclusion');

// 2. Scenario & Mathematical Formula Verification (Phase C)
const S = M.SCENARIOS;
const base = M.simulate(S.baseline);
const smart = M.simulate(S.smart);
const sens = M.simulateSensitivity(100000);
const norm = M.simulate(S.normal);

// Exact Baseline numbers at V = 100,000 (0.085 kg/person)
assert(near(base.totalWasteGenerated, 8500.0, 0.01), 'Baseline total = 8,500.00 kg');
assert(near(base.sourceReductionPct, 0.0, 0.001), 'Baseline source reduction = 0.00%');
assert(near(base.recycledWaste, 2728.5, 0.01), 'Baseline recycled = 2,728.50 kg (32.10%)');
assert(near(base.residualWaste, 5771.5, 0.01), 'Baseline residual = 5,771.50 kg');
assert(near(base.residualReductionPct, 0.0, 0.001), 'Baseline residual reduction = 0.00%');

// Exact Smart Green (Base) numbers at V = 100,000
assert(near(smart.totalWasteGenerated, 7661.05, 0.02), 'Smart Green total = 7,661.05 kg');
assert(near(smart.sourceWasteReductionKg, 838.95, 0.02), 'Smart Green source reduction = 838.95 kg');
assert(near(smart.sourceReductionPct, 9.87, 0.02), 'Smart Green source reduction rate = 9.87%');
assert(near(smart.recycledWaste, 4498.54, 0.02), 'Smart Green recycled = 4,498.54 kg (58.72%)');
assert(near(smart.residualWaste, 3162.51, 0.02), 'Smart Green residual = 3,162.51 kg');
assert(near(smart.residualWasteReductionKg, 2608.99, 0.02), 'Smart Green residual reduction = 2,608.99 kg');
assert(near(smart.residualReductionPct, 45.20, 0.02), 'Smart Green residual reduction rate = 45.20% (replaces irreproducible 41.6%)');

// Exact Sensitivity Analysis tiers (Conservative, Base, Aggressive)
assert(near(sens.conservative.totalWasteGenerated, 8052.22, 0.02), 'Conservative total = 8,052.22 kg');
assert(near(sens.conservative.sourceReductionPct, 5.27, 0.02), 'Conservative source reduction = 5.27%');
assert(near(sens.conservative.residualWaste, 4483.43, 0.02), 'Conservative residual = 4,483.43 kg');
assert(near(sens.conservative.residualReductionPct, 22.32, 0.02), 'Conservative residual reduction = 22.32%');

assert(near(sens.aggressive.totalWasteGenerated, 6923.08, 0.02), 'Aggressive total = 6,923.08 kg');
assert(near(sens.aggressive.sourceReductionPct, 18.55, 0.02), 'Aggressive source reduction = 18.55%');
assert(near(sens.aggressive.residualWaste, 2514.06, 0.02), 'Aggressive residual = 2,514.06 kg');
assert(near(sens.aggressive.residualReductionPct, 56.44, 0.02), 'Aggressive residual reduction = 56.44%');

// 3. Mass Balance & Non-Overlapping Independence of Measures (No Double Counting)
for (const [scName, r] of Object.entries({
  Baseline: base,
  SmartGreen: smart,
  Conservative: sens.conservative,
  Base: sens.base,
  Aggressive: sens.aggressive,
  WeekdayRef: norm,
})) {
  // Mass Balance #1: Source Prevented + Total Generated == Baseline Potential
  assert(
    near(r.sourceWasteReductionKg + r.totalWasteGenerated, r.baselineTotal, 1e-6),
    `${scName} Mass Balance #1 (Source Reduction + Generated == Baseline Total)`
  );
  // Mass Balance #2: Recycled + Residual == Total Generated
  assert(
    near(r.recycledWaste + r.residualWaste, r.totalWasteGenerated, 1e-6),
    `${scName} Mass Balance #2 (Recycled + Residual == Total Generated)`
  );
  // Mass Balance #3: Sum of Station Captured Loads + Uncaptured Plaza Litter == Total Generated
  const sumStationLoad = r.bins.reduce((s, b) => s + b.loadKg, 0);
  assert(
    near(sumStationLoad, r.capturedKg, 1e-6) &&
      near(r.capturedKg + r.litterWaste, r.totalWasteGenerated, 1e-6),
    `${scName} Mass Balance #3 (Captured Station Load + Uncaptured Litter == Total Generated)`
  );
  // Mass Balance #4: Contained Station Load + Station Overflow + Uncaptured Litter == Total Generated
  const sumContained = r.bins.reduce((s, b) => s + (b.loadKg - b.overflowKg), 0);
  assert(
    near(sumContained + r.overflowWaste + r.litterWaste, r.totalWasteGenerated, 1e-6),
    `${scName} Mass Balance #4 (Contained + Overflow + Litter == Total Generated)`
  );
}

const verifiedEntries = DS.DATA_SOURCES.filter((d) => d.auditStatus !== 'UNVERIFIED');
const unverifiedEntries = DS.DATA_SOURCES.filter((d) => d.auditStatus === 'UNVERIFIED');
assert(verifiedEntries.length === 18, 'Exactly 18 verified data sources (PASS + CONDITIONAL)');
assert(unverifiedEntries.length === 2, 'Exactly 2 UNVERIFIED entries flagged and excluded');
assert(DS.getActiveModelSources().length === 17, 'Exactly 17 active model sources (excluding 2026-06 partial & 2 unverified)');

const sortOnly = M.simulate(Object.assign({}, S.baseline, { sorting: true, diversionMode: 'on' }));
assert(near(sortOnly.totalWasteGenerated, base.totalWasteGenerated, 1e-6), 'Toggling sorting must NOT change Total Waste Generated');
assert(sortOnly.recycledWaste > base.recycledWaste, 'Toggling sorting increases Recycled Waste');

const pkgOnly = M.simulate(Object.assign({}, S.baseline, { packagingCut: 20 }));
assert(near(pkgOnly.gen.cups, base.gen.cups, 1e-6), 'Packaging cut must NOT affect cup generation');
assert(near(pkgOnly.gen.packaging, base.gen.packaging * 0.8, 1e-6), '20% packaging cut reduces packaging by 20%');

// 4. Adjustability of Bin Count, Capacity, Density, Compaction, Collections & Capture Rate
assert(smart.avgFill < base.avgFill, 'Smart Green has lower bin fill than Baseline');
assert(smart.overflowWaste < base.overflowWaste, 'Smart Green has less overflow waste than Baseline');
assert(smart.litterWaste < base.litterWaste, 'Smart Green (18 stations) has less litter than Baseline (10 stations)');

const higherDensity = M.simulate(Object.assign({}, S.baseline, { bulkDensityKgPerL: 0.10 }));
assert(higherDensity.stationCapacityKg > base.stationCapacityKg, 'Higher bulk density increases station capacity (kg)');
assert(higherDensity.overflowWaste < base.overflowWaste, 'Higher station capacity reduces overflow waste');

const higherCompaction = M.simulate(Object.assign({}, S.baseline, { compactionRatio: 3.0 }));
assert(near(higherCompaction.stationCapacityKg, base.stationCapacityKg * 3.0, 0.01), '3.0x compaction triples station capacity');

const lowerCapture = M.simulate(Object.assign({}, S.baseline, { captureEfficiency: 60 }));
assert(lowerCapture.litterWaste > base.litterWaste, 'Lower capture efficiency increases litter waste');

const noBins = M.simulate(Object.assign({}, S.baseline, { bins: [] }));
assert(near(noBins.litterWaste, noBins.totalWasteGenerated, 1e-6), '0 stations => 100% uncaptured litter');

console.log('--- Scenario Verification Summary (V = 100,000) ---');
for (const [k, r] of Object.entries({
  'Baseline': base,
  'Sens-Conservative': sens.conservative,
  'SmartGreen (Base)': smart,
  'Sens-Aggressive': sens.aggressive,
  'Weekday-Ref (15k)': norm,
})) {
  console.log(
    k.padEnd(18),
    `Total: ${r.totalWasteGenerated.toFixed(2)}kg | SrcRed: ${r.sourceReductionPct.toFixed(2)}% | Rec: ${r.recycledWaste.toFixed(2)}kg | Res: ${r.residualWaste.toFixed(2)}kg | ResRed: ${r.residualReductionPct.toFixed(2)}% | Ovfl: ${r.overflowWaste.toFixed(2)}kg | Litter: ${r.litterWaste.toFixed(2)}kg | Cap: ${r.stationCapacityKg.toFixed(1)}kg`
  );
}
console.log(`Active verified data sources: ${DS.getActiveModelSources().length} / ${DS.DATA_SOURCES.length} total`);
console.log('All Phase B & Phase C model tests passed ✅');
