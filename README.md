# 🎄 Smart Christmasland – Data-Anchored Festival Waste Simulator

Interactive 3D map simulator exploring how visitor crowds, bin placement, reusable cups, eco-packaging, volunteer sorting, and smart collection change waste outcomes at **New Taipei City Christmasland** (Citizen Plaza, Banqiao). Connects to SDGs 11, 12, 17, Taiwan–Philippines youth collaboration, and an **International Case Study on Waste Reduction in the Philippines (Davao City & Ateneo de Davao University)**.

> 📊 **Data Provenance & Transparency:** Anchored to official statistics from Taiwan's Ministry of Environment (`MOENV`) and the New Taipei City Government (`NTPC`). Scenario outputs are **simulated model estimates** driven by explicit, user-adjustable model assumptions (`js/data-sources.js` & `js/model.js`). The Philippines case study (`#case-study-ph`) is a **qualitative policy and institutional reference**—no Philippine statistics or invented reduction percentages are inserted into the Taiwan waste-generation model.

## Run

No build step, no npm required. Any static server works (needs internet for MapLibre & Chart.js CDNs + vector tiles):

```powershell
cd smart_christmasland
python -m http.server 8080
```

Open http://localhost:8080 . Model & provenance tests: http://localhost:8080/tests/ (or `node tests/model.test.js` if Node is installed).

## Stack & Data Architecture

| Piece | Source |
|---|---|
| Map rendering | MapLibre GL JS 4 (CDN) |
| Base map + **3D buildings** | OpenStreetMap via OpenFreeMap vector tiles; OSM `building` footprints extruded by `render_height` |
| Charts | Chart.js 4 (CDN) |
| Data Provenance Registry | `js/data-sources.js` (20 structured entries: 18 verified `PASS`/`CONDITIONAL` + 2 excluded `UNVERIFIED`; categorized into `OFFICIAL`, `RESEARCH`, `ASSUMPTION`) |
| Simulation Engine | `js/model.js` (pure functions, 4-stage non-overlapping mass-balance equations) |

## Features

- **4 Scenario Modes**:
  1. `Baseline (一般活動模式)`: Conventional festival waste handling without extra interventions.
  2. `Smart Green (智慧綠色減量)`: Self-brought/Ucup reusable cups, eco-packaging cut, stationed volunteer sorting guides, expanded stations, compaction, and IoT-scheduled pickups.
  3. `Sensitivity Analysis (敏感度分析)`: Side-by-side comparison of **Conservative**, **Base**, and **Aggressive** assumption bounds.
  4. `Normal Weekday Reference (平日參考)`: Non-festival baseline (15,000 evening visitors).
- **10 Interactive Controls**: Visitors, cup substitution (`reuse`), eco-packaging cut (`packagingCut`), collections per evening, volunteer sorting toggle, station count (`+ Add` / `− Remove` / `Reset` / drag on 3D map), station volume (`L`), bulk density (`kg/L`), compaction ratio (`×`), capture radius (`m`), and capture efficiency (`%`).
- **7+2 KPI Cards**: `Total Waste Generated`, `Source Waste Reduction`, `Recycled Waste`, `Residual Waste`, `Residual Waste Reduction`, `Overflow Waste`, `Litter Waste`, `Avg. Peak Bin Fill`, and `Overflow & Litter Risk`.
- **International Case Study — Philippines (`#case-study-ph`)**:
  - **Davao City (City-Level Governance)**: 4-stream source segregation (`Biodegradable`, `Recyclable`, `Residual Waste`, `Special Waste`) under **City Ordinance No. 0361-10 (amended by Ordinance No. 0987-22)**, distinct from single-use plastic regulation under **City Ordinance No. 0500-21**, alongside CENRO compliance and enforcement realities.
  - **Ateneo de Davao University (`Ecoteneo` Campus Practices)**: Single-use plastic ban (`Policy 2018-071`), reusable tumblers/containers, eco-bags, multi-stream segregation, composting/gardening, water/energy conservation, and Clean-As-You-Go (`CLAYGO`) norms.
  - **6-Row Adaptation Matrix & 6 Verified Official Sources**: Maps documented Philippines practices to proposed Smart Christmasland applications without conflating qualitative suggestions with quantitative model parameters.
- **Information & Data Provenance (`#method`)**: Interactive filterable table (`All`, `Official Statistics`, `Research Literature`, `Model Assumptions`, `Unverified / Excluded`) with clickable source URLs and usage constraints.

## Files

```text
index.html                  Main simulator, Philippines case study (#case-study-ph), and provenance registry (#method)
css/style.css               Responsive dark-glass UI design system (desktop & mobile)
js/data-sources.js          Phase B structured data provenance registry (20 entries)
js/model.js                 Phase C waste generation, diversion, capacity & spatial capture engine
js/app.js                   3D MapLibre map, draggable bin markers, Chart.js charts & provenance table
tests/index.html            Browser test runner
tests/model.test.js         Automated test suite (data audit, mass balance, non-overlapping measures, sensitivity)
docs/phase-a-audit.md       Independent Data Audit report & mandatory corrections
docs/research-progress.md   Complete research, mathematical verification & development log
```

## Credits

Map data © OpenStreetMap contributors · Tiles: OpenFreeMap · MapLibre GL JS · Chart.js · Official Taiwan statistics: MOENV & New Taipei City Government · Philippines case study sources: City Government of Davao & Ateneo de Davao University (`Ecoteneo`).
