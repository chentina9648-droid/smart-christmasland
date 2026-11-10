# Smart Christmasland 研究與系統升級開發進度紀錄 (`research-progress.md`)

## 1. 專案目標與核心升級原則
本專案將原有的 `smart_christmasland` 3D 節慶廢棄物模擬器，從「100% 教學拍腦袋假設（含硬湊之 `-53%` 殘餘減量率）」升級為**「以官方統計數據定錨、研究文獻支持機制、模型假設透明揭露」**之決策支援模擬系統，並完整保留原有 MapLibre GL 3D 建築模型、熱力圖、可拖曳垃圾站與 Chart.js 互動圖表。

---

## 2. 各階段完成進度摘要

### Stage 0：現有模型診斷（已完成）
- 清查舊版 [js/model.js](../js/model.js) 與 [js/app.js](../js/app.js) 全部常數位置。
- 解構舊版 `-53%` 來源：舊版總產生量僅減 `15.93%`（`7,200 → 6,052.8 kg`），但因假設無分類回收率僅 `7.0%`、有分類暴增至 `47.8%`，加上勾選 `sorting` 偷砍 `20%` 餐飲包裝，使殘餘垃圾由 `6,696 kg` 降至 `3,159.84 kg`（`52.81%` 四捨五入為 `-53%`）。
- 找出舊版「源頭減塑與末端分類混綁重複計算」及「桶容量未考慮鬆散容積密度」等結構問題。

### Phase A & Independent Data Audit：官方數據檢索與獨立審查（已完成，詳見 [`docs/phase-a-audit.md`](./phase-a-audit.md)）
- 蒐集並交叉驗算 2023–2025 完整年度官方統計：
  - **新北市一般廢棄物統計（`STAT_P_45` / `STAT_P_127`）**：2025 年（民國 114 年）總產生量 `1,919,573` 公噸（一般垃圾 `654,543` + 資源回收 `1,170,692` + 廚餘 `94,338` 公噸，回收率 `65.90%`）。
  - **新北市人口數**：2025 年底 `4,045,301` 人（板橋區 `549,762` 人），推得市政每人每日一般廢棄物產生量 `1.300 kg/人·日`。
  - **新北歡樂耶誕城官方總人次**：2023 年 `>762 萬`（46 天，日均 `165,652` 人次）、2024 年 `>770 萬`（48 天，日均 `160,417` 人次）。
  - **雙北大型戶外節慶實測代理基準（臺北跨年晚會 2024–2026）**：2024 跨年總量 `22.3` 公噸（一般 `14.6` + 資收 `7.7` 公噸，現場回收率 `34.53%`，設 `66` 處回收站 / `264` 個大型桶）。
  - **循環杯與自備杯政策統計**：新北 Ucup 封閉／半封閉場域平均歸還率 `90%–94%`；環境部自備飲料杯政策提升自備率至 `17%`。
- 完成五項審查強制修正：
  1. `0.085 kg/person` 之停留時間 `3.5 h` 與活動消費轉換係數 `0.45` 標示為模型假設（`ASSUMPTION`）。
  2. `Zelenika et al. (2018)` 僅引用「駐點志工降低分類桶異物污染」定性結論，不使用 `85–97%` 作為量化係數。
  3. `Khan et al. (2024)` 僅引用「IoT 感測輔助清運排程最佳化與防滿溢」研究結果，不歸因壓縮倍率。
  4. `0.065 kg/L` 混合容積密度與 `2.5× / 3.0×` 壓縮倍率標示為待校準模型假設（`ASSUMPTION`）。
  5. 統一正數減量率公式 `Reduction Rate = (Baseline - Scenario) / Baseline × 100%`，並修正無空間懲罰下 Smart Green 殘餘減量率為精確可重現之 `45.20%`。

### Phase B：建立結構化數據溯源庫 [`js/data-sources.js`](../js/data-sources.js)（已完成並通過最終查核）
- 總計收錄 **20 筆**結構化資料項目：
  - **18 筆已驗證資料（`6 PASS` + `12 CONDITIONAL`）**：
    - `OFFICIAL` 官方統計：12 筆（其中 11 筆完整年度／官方基準設為 `inActiveModel: true`；1 筆 `NTPC_MSW_2026M06_PARTIAL` 為 2026 年 6 月單月非完整年度資料，設為 `inActiveModel: false` 僅供背景展示）。
    - `RESEARCH` 學術研究與標準：3 筆（`ZELENIKA_2018_VOLUNTEER_SORTING`、`USEPA_2016_VOLUME_WEIGHT`、`KHAN_2024_IOT_WASTE_COLLECTION`，皆為 `PASS` 且 `inActiveModel: true`）。
    - `ASSUMPTION` 模型明確假設：3 筆（`ASSUMP_EVENT_PER_VISITOR_KG`、`ASSUMP_BIN_DENSITY_COMPACTION`、`ASSUMP_SCENARIO_INTERVENTIONS`，皆標示 `isAssumption: true`、`CONDITIONAL` 且 `inActiveModel: true`）。
  - **2 筆未驗證並強制排除資料（`2 UNVERIFIED`）**：
    - `UNVERIFIED_XMASLAND_2025_REPORT`（2025 耶誕城 740 萬人次媒體轉述，缺官方結案報告直連網址）與 `UNVERIFIED_WUGU_AI_SORTING`（五股 AI 分選廠 >13% 媒體轉述，缺公務統計原表），皆強制設定 `inActiveModel: false`，嚴格排除於模型計算之外。

### Phase C：升級核心模擬模型 [`js/model.js`](../js/model.js) 與前端介面（已完成並通過最終查核）
- 支援三種主要情境（`Baseline`、`Smart Green`、`Sensitivity Analysis`：含 `Conservative`、`Base`、`Aggressive` 三層級）與平日參考情境（`Normal Weekday Ref`）。
- 獨立計算並輸出 7 大指標：`Total Waste Generated`、`Source Waste Reduction`、`Recycled Waste`、`Residual Waste`、`Residual Waste Reduction`、`Overflow Waste`、`Litter Waste`。
- 解除措施重複計算：將「自備／循環杯替代率 (`reuse`)」、「環保包裝源頭減量率 (`packagingCut`)」與「駐點分類導引 (`sorting`)」完全解耦。
- 開放全部垃圾站物理與空間參數可調：設站數量 (`bins`)、單站桶容積 (`stationVolumeL`)、混合容積密度 (`bulkDensityKgPerL`)、壓縮倍率 (`compactionRatio`)、清運次數 (`collections`)、攔截半徑 (`captureRadiusM`) 與攔截率係數 (`captureEfficiency`)。

---

## 3. 最終驗證結果（Final Verification Results）

### 3.1 自動化測試套件實際輸出（`tests/model.test.js` & `js/app.js`）
執行環境：Windows 原生 ES6 JavaScript 引擎（`Chakra.dll`）與 Python 3.14 數學驗算雙重交叉驗證，共 **72 項斷言（Assertions）全數通過（0 失敗）**：

```text
=== PART 1: RUNNING RAW tests/model.test.js IN CHAKRA ES6 ENGINE ===
--- Scenario Verification Summary (V = 100,000) ---
Baseline           Total: 8500.00kg | SrcRed: 0.00% | Rec: 2728.50kg | Res: 5771.50kg | ResRed: 0.00% | Ovfl: 3707.94kg | Litter: 2961.04kg | Cap: 124.8kg
Sens-Conservative  Total: 8052.22kg | SrcRed: 5.27% | Rec: 3568.79kg | Res: 4483.43kg | ResRed: 22.32% | Ovfl: 1820.53kg | Litter: 1585.72kg | Cap: 187.2kg
SmartGreen (Base)  Total: 7661.05kg | SrcRed: 9.87% | Rec: 4498.54kg | Res: 3162.51kg | ResRed: 45.20% | Ovfl: 0.00kg | Litter: 923.31kg | Cap: 312.0kg
Sens-Aggressive    Total: 6923.08kg | SrcRed: 18.55% | Rec: 4409.02kg | Res: 2514.06kg | ResRed: 56.44% | Ovfl: 0.00kg | Litter: 834.37kg | Cap: 374.4kg
Weekday-Ref (15k)  Total: 1275.00kg | SrcRed: 0.00% | Rec: 409.28kg | Res: 865.72kg | ResRed: 0.00% | Ovfl: 0.00kg | Litter: 444.16kg | Cap: 124.8kg
Active verified data sources: 17 / 20 total
All Phase B & Phase C model tests passed ✅

=== PART 2: RUNNING RAW UI & APP.JS VERIFICATION IN CHAKRA ES6 ENGINE ===
Map layers initialized: buildings-3d, heat, spots
Map sources initialized: heat, spots
Charts initialized: 3
Provenance cnt-all badge: 20
UI [Baseline]: {"waste":"8,500","srcRed":"0.0%","srcRedSub":"0 kg prevented at source","recycled":"2,729","recycledSub":"32.1% diversion rate","residual":"5,772","resRed":"0.0%","resRedSub":"0 kg reduced vs. Baseline","overflow":"3,708","overflowSub":"8/10 stations >100% cap","litter":"2,961","litterSub":"5,539 kg captured by stations","fill":"288%","risk":"High","binCount":10,"stationCap":"124.8"}
UI [Smart Green]: {"waste":"7,661","srcRed":"9.9%","srcRedSub":"839 kg prevented at source","recycled":"4,499","recycledSub":"58.7% diversion rate","residual":"3,163","resRed":"45.2%","resRedSub":"2,609 kg reduced vs. Baseline","overflow":"0","overflowSub":"0/18 stations >100% cap","litter":"923","litterSub":"6,738 kg captured by stations","fill":"31%","risk":"Medium","binCount":18,"stationCap":"312.0"}
UI [Sens-Conservative]: {"waste":"8,052","srcRed":"5.3%","srcRedSub":"448 kg prevented at source","recycled":"3,569","recycledSub":"44.3% diversion rate","residual":"4,483","resRed":"22.3%","resRedSub":"1,288 kg reduced vs. Baseline","overflow":"1,821","overflowSub":"6/14 stations >100% cap","litter":"1,586","litterSub":"6,466 kg captured by stations","fill":"107%","risk":"High","binCount":14,"stationCap":"187.2"}
UI [Sens-Base]: {"waste":"7,661","srcRed":"9.9%","srcRedSub":"839 kg prevented at source","recycled":"4,499","recycledSub":"58.7% diversion rate","residual":"3,163","resRed":"45.2%","resRedSub":"2,609 kg reduced vs. Baseline","overflow":"0","overflowSub":"0/18 stations >100% cap","litter":"923","litterSub":"6,738 kg captured by stations","fill":"31%","risk":"Medium","binCount":18,"stationCap":"312.0"}
UI [Sens-Aggressive]: {"waste":"6,923","srcRed":"18.6%","srcRedSub":"1,577 kg prevented at source","recycled":"4,409","recycledSub":"63.7% diversion rate","residual":"2,514","resRed":"56.4%","resRedSub":"3,257 kg reduced vs. Baseline","overflow":"0","overflowSub":"0/18 stations >100% cap","litter":"834","litterSub":"6,089 kg captured by stations","fill":"20%","risk":"Medium","binCount":18,"stationCap":"374.4"}
Draggable marker test (Bin 0 moved to Tree hotspot): litter changed from 2,961 kg to 2,366 kg
Add bin test: binCount = 11 , active markers = 11
Remove bin test: binCount = 10 , active markers = 10
Reset bins test: litter restored to 2,961 kg
Filter [ALL] row count: 20
Filter [OFFICIAL] row count: 12
Filter [RESEARCH] row count: 3
Filter [ASSUMPTION] row count: 3
Filter [UNVERIFIED] row count: 2
```

### 3.2 四重質量守恆（Mass Balance）驗算表（$V = 100,000$）
模型在所有情境下嚴格滿足四項質量守恆恆等式（誤差 $< 10^{-12}\text{ kg}$）：
1. **源頭守恆**：$\text{Source Waste Reduction} + \text{Total Waste Generated} \equiv \text{Baseline Potential} (8,500.00\text{ kg})$
2. **處理流向守恆**：$\text{Recycled Waste} + \text{Residual Waste} \equiv \text{Total Waste Generated}$
3. **空間攔截守恆**：$\sum \text{Station Captured Load} + \text{Uncaptured Litter Waste} \equiv \text{Total Waste Generated}$
4. **容器承載守恆**：$\sum \text{Contained Station Load} + \text{Overflow Waste} + \text{Uncaptured Litter Waste} \equiv \text{Total Waste Generated}$

| 情境 | Baseline Potential | Source Prevented + Generated | Recycled + Residual | Captured + Litter | Contained + Overflow + Litter |
|---|---|---|---|---|---|
| **Baseline** | `8,500.00 kg` | `0.00 + 8,500.00 = 8,500.00` | `2,728.50 + 5,771.50 = 8,500.00` | `5,538.96 + 2,961.04 = 8,500.00` | `1,831.02 + 3,707.94 + 2,961.04 = 8,500.00` |
| **Conservative** | `8,500.00 kg` | `447.78 + 8,052.22 = 8,500.00` | `3,568.79 + 4,483.43 = 8,052.22` | `6,466.50 + 1,585.72 = 8,052.22` | `4,645.97 + 1,820.53 + 1,585.72 = 8,052.22` |
| **Smart Green (Base)** | `8,500.00 kg` | `838.95 + 7,661.05 = 8,500.00` | `4,498.54 + 3,162.51 = 7,661.05` | `6,737.74 + 923.31 = 7,661.05` | `6,737.74 + 0.00 + 923.31 = 7,661.05` |
| **Aggressive** | `8,500.00 kg` | `1,576.92 + 6,923.08 = 8,500.00` | `4,409.02 + 2,514.06 = 6,923.08` | `6,088.71 + 834.37 = 6,923.08` | `6,088.71 + 0.00 + 834.37 = 6,923.08` |

---

## 4. 尚未解決之官方資料缺口與模型研究限制（Remaining Limitations）

1. **缺乏新北歡樂耶誕城專屬垃圾過磅公報**：新北市環保局與觀旅局未公開歷年耶誕城展區獨立清運過磅噸數（垃圾量併入板橋區清潔隊日常清運報表），因此單晚基線必須以臺北市環保局公開之「臺北跨年晚會實測過磅數據（`TAIPEI_NYE_WASTE_2024_2026`）」作為同級戶外活動代理指標（Proxy Benchmark）。
2. **單晚人均產生量轉換參數屬模型假設**：由新北市每日人均 `1.300 kg/人·日` 轉換為單晚活動人均 `0.085 kg/人/晚` 所用之「平均停留 `3.5 小時`」與「活動消費轉換係數 `0.45`」屬於模型推估假設（`ASSUMPTION`），需待未來活動現場實際抽樣過磅校準。
3. **開放式廣場循環杯損耗率與物理壓縮參數待實測**：新北 Ucup 官方 `90%–94%` 歸還率實測於棒球場與影城等封閉／半封閉場域；市民廣場等全開放式商圈之實際未歸還損耗率（模型設為 `6%–12%`）及混合廢棄物鬆散密度（`0.065 kg/L`）、壓縮倍率（`1.5×–3.0×`）均標示為待現場實測校準之模型假設。
4. **2 項媒體轉述數據維持 `UNVERIFIED` 並排除於模型外**：「2025 耶誕城 740 萬人次（45 天）」與「五股 AI 分選廠效率提升 >13%」因缺乏政府公開直連報告或公務統計原表，維持 `UNVERIFIED` 狀態且不納入公式計算。
5. **處理流向與空間攔截之獨立性假設**：目前模型中 `Recycled Waste` 與 `Residual Waste` 按全場總產生量（`totalWasteGenerated`）進行材質分流計算，尚未將「滿溢（`overflowKg`）或地面散落（`litterKg`）在清運後端可能因髒污導致回收率折損」耦合至殘餘垃圾量中；此簡化使源頭減量與分類分流公式保持完全線性透明，但於高滿溢情境（如 Baseline）可能微幅高估實際回收量。

---

## 5. 新增功能：國際案例研究 — 菲律賓達沃市與雅典耀大學（International Case Study: Philippines）

於 [index.html](../index.html)（`#case-study-ph` 區塊）與 [css/style.css](../css/style.css) 新增 **「International Case Study: Waste Reduction in the Philippines」** 專區，並嚴格遵守數據與模型隔離原則：

### 5.1 內容架構與法規嚴謹性區分
1. **Davao City — 城市級廢棄物管理（City-Level Waste Management）**：
   - 源頭四分類制度：`1. Biodegradable`（生物可分解／廚餘有機物）、`2. Recyclable`（可回收物）、`3. Residual Waste`（一般殘餘垃圾）、`4. Special Waste`（特殊／有害與電子廢棄物）。
   - 商業措施與執行挑戰：部分商家改用紙袋或鼓勵自備環保袋（eco-bags）；同時如實呈現 CENRO 在執法稽查、商家更新廢棄物管理計畫（SWM Plans）與公眾意識維持上之實際挑戰。
   - **法規明確區分**：
     - **City Ordinance No. 0361-10（經 Ordinance No. 0987-22 修訂）**：規範生態固體廢棄物管理（Ecological Solid Waste Management）與強制源頭分類。
     - **City Ordinance No. 0500-21**：獨立規範一次性塑膠製品（Single-Use Plastics）之管制。
     - 嚴格區分兩套法規職權，不將限塑令錯歸於 `0361-10 / 0987-22`，亦不宣稱未經官方證實之全面保麗龍禁令（blanket Styrofoam ban）。
2. **Ateneo de Davao University (AdDU) — 校園級實踐（`Ecoteneo` Program & Policy `2018-071`）**：
   - 涵蓋 7 項核心實踐：校園禁用一次性塑膠、鼓勵自備隨行杯與餐盒（tumblers & food containers）、推廣環保袋與重複使用替代品、校園垃圾分類、堆肥與校園農園（composting & gardening）、節水節能措施、以及「隨手清（Clean-As-You-Go, CLAYGO）」行為規範，並說明高密度大學校園如何作為大型節慶活動之永續管理典範。
3. **與新北歡樂耶誕城之對照轉譯表（6 項對照）**：
   - 清楚標記「菲律賓既有實踐（Existing Practice in PH）」與「耶誕城可借鏡之規劃建議（Proposed Suggestion, Not Verified Outcome）」，不將定性政策建議冒充已驗證之量化減量成果，亦不將任何菲律賓數據混入台灣垃圾量計算模型。

### 5.2 菲律賓案例官方與學術來源清單（6 筆可點擊連結）
1. Davao City Ordinance 0361-10 / Amended 0987-22 Flyer：https://www.davaocity.gov.ph/wp-content/uploads/2024/12/City-Ordinance-0361-10-Amended-0987-22-FLYER.pdf
2. Davao City Ordinance No. 0987-22 Full Text：https://lissp2.davaocity.gov.ph/uploads/items/6849/Ordinance%20No.%200987-22.pdf
3. Davao City Single-Use Plastic Campaign & Ordinance 0500-21：https://davaocity.gov.ph/economy/cee-supports-addus-drive-vs-single-use-plastics/
4. Ateneo de Davao University Policy on Single-Use Plastics (`2018-071`)：https://www.addu.edu.ph/wp-content/uploads/2019/11/2018-071-Policy-on-Single-Use-Plastics-and-Effecient-Energy-Use.pdf
5. Ecoteneo Environmental Practices (`AdDU iCARE`)：https://sites.google.com/addu.edu.ph/addupsgsicare/student-services/ecoteneo
6. Davao City CENRO Report on Waste Management Compliance：https://davaocity.gov.ph/sustainable-environment/cenro-to-establishments-update-solid-waste-management-plans/
