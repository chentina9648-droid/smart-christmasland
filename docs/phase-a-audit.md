# Phase A 獨立數據審查報告（Independent Data Audit – 修正定案版）

本文件保存 `smart_christmasland` 專案於升級前對 Phase A 蒐集數據與數學公式所執行之獨立數據審查（Independent Data Audit）及五項強制修正結果。

---

## 一、五項強制審查修正事項（Mandatory Corrections Applied）

1. **`0.085 kg/person` 單晚人均垃圾產生量暫定推估值**：
   - 保留 `0.0850 kg/人/晚`（`cups: 0.0153`、`packaging: 0.0357`、`food: 0.0238`、`other: 0.0102 kg`）作為模型暫定基準推估值。
   - **明確標示假設**：推導過程中使用之「平均停留時間 `3.5 小時`（`3.5 / 24` 日）」及「活動餐飲消費轉換係數 `0.45`」於 [js/data-sources.js](../js/data-sources.js)（`ASSUMP_EVENT_PER_VISITOR_KG`）與 [js/model.js](../js/model.js) 中**明確標示為模型假設（`ASSUMPTION`）**，絕不宣稱為官方統計。
2. **`Zelenika et al. (2018)` 文獻引用規範**：
   - 原文（*Waste Management*, Vol. 76, pp. 39–45, DOI: `10.1016/j.wasman.2018.03.030`）之實地隨機對照實驗測量指標為「分類桶內異物誤投污染（Contamination）」，不可直接等同於全場各材質「回收分流率（Diversion Rate）」。
   - **修正措施**：移除 `85–97%` 作為量化乘數之表述，於 `ZELENIKA_2018_VOLUNTEER_SORTING` 僅引用其「駐點志工導引能顯著降低分類污染、提升回收物潔淨度」之**定性研究結論**；模型中各情境之具體分流率百分比（`diversion`）獨立歸類為**模型假設（`ASSUMPTION`）**。
3. **`Khan et al. (2024)` 文獻引用規範**：
   - 原文（*Sensors*, 24(10), 3167, DOI: `10.3390/s24103167`）為 IoT 感測輔助都市廢棄物清運排程與防滿溢架構研究。
   - **修正措施**：不得將該研究描述為證明壓縮桶增加 `4–6 倍`容量或減少 `80%` 清運趟次；於 `KHAN_2024_IOT_WASTE_COLLECTION` 僅引用原文真正支持之「IoT 滿位監測與清運排程最佳化可預防容器滿溢」研究結論。
4. **垃圾桶物理容量與壓縮參數**：
   - 混合廢棄物鬆散容積密度 `0.065 kg/L` 及壓縮倍率 `2.5× / 3.0×`（含未壓縮基準 `1.0×`）於 `ASSUMP_BIN_DENSITY_COMPACTION` 中**明確標示為待校準模型假設（`ASSUMPTION`）**，不冒充現場實測值，並於前端開放滑桿自由調整。
5. **數學公式與減量率正數表示法（修正 `41.6%` 無法重現問題）**：
   - 統一採用正數表示減量率：
     $$\text{Reduction Rate (\%)} = \frac{\text{Baseline} - \text{Scenario}}{\text{Baseline}} \times 100\%$$
   - 修正初版審查草稿中心算誤植之 `41.6%`：在 $V = 100,000$ 人次下，Baseline 殘餘垃圾量為 `5,771.50 kg`，Smart Green（Base）殘餘垃圾量為 `3,162.51 kg`，精確可重現之殘餘垃圾減量率為 **`45.20%`**（減少 `2,608.99 kg`）；源頭垃圾減量率為 **`9.87%`**（由 `8,500.00 kg` 降至 `7,661.05 kg`，減少 `838.95 kg`）。

---

## 二、逐筆資料來源審查總表（共 20 筆：18 筆已驗證資料［6 PASS + 12 CONDITIONAL］＋ 2 筆 UNVERIFIED 已排除資料）

| ID | 數據名稱 | 原始數值與單位 | 年份 | 發布機關 | 原始網址 | 類別 / 審查狀態 | 使用限制與是否為假設 |
|---|---|---|---|---|---|---|---|
| `XMASLAND_ATTENDANCE_2023` | 2023 新北歡樂耶誕城總參觀人次與天數 | `>7,620,000` 人次 / `46` 天（日均 `165,652` 人次） | 2023 | 新北市政府觀光旅遊局 | https://newtaipei.travel/zh-tw/news/detail/55765 | `OFFICIAL` / **PASS** | 否（官方統計）。全展區 46 天累計人次；單晚市民廣場人數需乘分流係數。 |
| `XMASLAND_ATTENDANCE_2024` | 2024 新北歡樂耶誕城總參觀人次與天數 | `>7,700,000` 人次 / `48` 天（日均 `160,417` 人次） | 2024 | 新北市政府觀光旅遊局 | https://newtaipei.travel/zh-tw/news/list | `OFFICIAL` / **PASS** | 否（官方統計）。全展區 48 天累計人次，不可直接當作單晚人數。 |
| `XMASLAND_ZONES_OFFICIAL` | 新北歡樂耶誕城四大燈區配置 | `4` 大展區（市民廣場、站前廣場、萬坪公園、府中商圈） | 2023–2025 | 新北市政府觀光旅遊局 | https://christmasland.ntpc.gov.tw/ | `OFFICIAL` / **PASS** | 否（官方圖資）。提供燈區範圍，臨時垃圾站精確座標仍為模擬配置。 |
| `NTPC_MSW_TOTAL_2025` | 新北市執行機關一般廢棄物產生總量 | `1,919,573` 公噸/年（2023: `1,868,648`；2024: `1,965,851`） | 2025 (114年) | 環境部統計處 / 新北市環保局 | https://data.moenv.gov.tw/dataset/detail/STAT_P_45 | `OFFICIAL` / **CONDITIONAL** | 否（官方統計）。全市全年總量，嚴禁直接當作耶誕城垃圾量；僅用於計算市政日人均 `1.300 kg/人·日`。 |
| `NTPC_MSW_CLEARANCE_2025` | 新北市一般垃圾清運量（焚化殘餘端） | `654,543` 公噸/年（占總產生量 `34.10%`） | 2025 (114年) | 環境部統計處 / 新北市環保局 | https://data.moenv.gov.tw/dataset/detail/STAT_P_45 | `OFFICIAL` / **CONDITIONAL** | 否（官方統計）。家戶隨袋徵收體系下之清運量，僅供市政背景對照。 |
| `NTPC_RECYCLING_RATE_2025` | 新北市一般廢棄物回收率 | `65.90%`（資收 `1,170,692` + 廚餘 `94,338` 公噸；環保局口徑 `65.51%`） | 2025 (114年) | 環境部 / 新北市環保局 | https://data.moenv.gov.tw/dataset/detail/STAT_P_45 | `OFFICIAL` / **CONDITIONAL** | 否（官方統計）。全市家戶高標表現，僅作為 Smart Green 積極管理之天花板上限（`<65.90%`）。 |
| `NTPC_POP_2025` | 新北市與板橋區年底戶籍人口數 | 新北市 `4,045,301` 人 / 板橋區 `549,762` 人 | 2025 (114年) | 新北市政府民政局 / 主計處 | https://www.ca.ntpc.gov.tw/home.jsp?id=29388 | `OFFICIAL` / **CONDITIONAL** | 否（官方統計）。僅作市政日人均分母，不可將板橋人口當作耶誕城遊客數。 |
| `NTPC_MSW_COMPOSITION_2023` | 新北市進廠廢棄物物理組成比例 | 可燃物 `98.72%`（塑膠 `22–47%`、紙類 `27–39%`、廚餘 `5–20%`） | 2023 (112年) | 新北市政府環境保護局 | https://www.epd.ntpc.gov.tw/ | `OFFICIAL` / **CONDITIONAL** | 否（官方統計）。焚化廠進廠採樣區間，供約束活動廢棄物材質結構。 |
| `TAIPEI_NYE_WASTE_2024_2026` | 臺北跨年晚會環境清潔實測統計 | 2024: `22.3` 公噸（一般 `14.6` + 資收 `7.7`，回收率 `34.53%`）；設 `66` 站 / `264` 大型桶 | 2024–2026 | 臺北市政府環境保護局 | https://www.dep.gov.taipei/ | `OFFICIAL` / **CONDITIONAL** | 否（官方實測）。鄰近直轄市同級戶外晚會代理校準基準（Proxy），非耶誕城本體實測。 |
| `NTPC_UCUP_RETURN_RATE` | 新北 Ucup 循環杯封閉／半封閉場域歸還率 | `90%–94%`（未歸還損耗率 `6%–10%`） | 2023–2025 | 新北市政府環境保護局 | https://www.epd.ntpc.gov.tw/ | `OFFICIAL` / **CONDITIONAL** | 否（官方統計）。實測於棒球場與影城等封閉場域；開放廣場損耗率列為可調假設。 |
| `MOENV_CUP_POLICY_2023_2025` | 全國自備飲料杯率與循環杯門市比率門檻 | 自備杯率 `17%`；循環杯門市門檻 2023–2025: `5% / 10% / 30%` | 2023–2025 | 環境部資源循環署 | https://recycle.moenv.gov.tw/ | `OFFICIAL` / **CONDITIONAL** | 否（官方統計）。`17%` 為日常門市消費自備率；`30%` 為門市覆蓋率而非實際借用率。 |
| `NTPC_MSW_2026M06_PARTIAL` | 2026年6月新北市一般廢棄物單月月報 | `171,957` 公噸/月（人均 `1.419 kg/人·日`） | 2026-06 (非完整年度) | 環境部統計處 (`STAT_P_127`) | https://data.moenv.gov.tw/dataset/detail/STAT_P_127 | `OFFICIAL` / **CONDITIONAL** | 否（官方月報）。非完整年度且廚餘新制改變統計流向，**不納入正式模型**。 |
| `ZELENIKA_2018_VOLUNTEER_SORTING` | 節慶駐點志工降低分類污染研究 | 定性研究結論：駐點志工顯著降低分類桶異物污染 | 2018 | *Waste Management*, 76, 39–45 | https://doi.org/10.1016/j.wasman.2018.03.030 | `RESEARCH` / **PASS** | 否（研究文獻）。僅引用定性結論，不拿污染減少率當分流乘數。 |
| `USEPA_2016_VOLUME_WEIGHT` | 固體廢棄物標準容積重量轉換係數 | PET 杯 `0.021`、紙容器 `0.063–0.145`、廚餘 `0.235 kg/L` | 2016 | U.S. EPA (ORCR) | https://www.epa.gov/smm/volume-weight-conversion-factors-solid-waste | `RESEARCH` / **PASS** | 否（研究標準）。提供單一材質鬆散密度範圍；混合密度 `0.065 kg/L` 仍標為假設。 |
| `KHAN_2024_IOT_WASTE_COLLECTION` | 智慧城市 IoT 感測輔助廢棄物動態清運研究 | 定性研究結論：IoT 滿位感測與排程最佳化降低滿溢風險 | 2024 | *Sensors*, 24(10), 3167 | https://doi.org/10.3390/s24103167 | `RESEARCH` / **PASS** | 否（研究文獻）。僅支持 IoT 動態清運防滿溢結論，不作壓縮倍率證明。 |
| `ASSUMP_EVENT_PER_VISITOR_KG` | 單晚停留時間、消費係數與人均垃圾量假設 | `0.0850 kg/人/晚`（假設停留 `3.5 h`、消費轉換係數 `0.45`） | 2026 Assumption | 本專題模型推估假設 | https://data.moenv.gov.tw/dataset/detail/STAT_P_45 | `ASSUMPTION` / **CONDITIONAL** | **是（模型假設）**。`3.5 h`、`0.45` 與 `0.085 kg/人` 皆為待現場實測校準之假設。 |
| `ASSUMP_BIN_DENSITY_COMPACTION` | 垃圾桶混合密度與壓縮倍率假設 | 密度 `0.065 kg/L`、壓縮倍率 `1.0× / 2.5× / 3.0×`、容積 `1,920 L` | 2026 Assumption | 本專題模型待校準假設 | https://www.epa.gov/smm/volume-weight-conversion-factors-solid-waste | `ASSUMPTION` / **CONDITIONAL** | **是（模型假設）**。`0.065 kg/L` 與 `2.5×–3.0×` 壓縮倍率均為待校準假設，可於滑桿調整。 |
| `ASSUMP_SCENARIO_INTERVENTIONS` | 各情境源頭減量與分類分流率假設 | 杯替代 `0–60%`、包裝減量 `0–20%`、分流率 `32.1%–63.7%` | 2026 Assumption | 本專題模型情境假設 | https://recycle.moenv.gov.tw/ | `ASSUMPTION` / **CONDITIONAL** | **是（模型假設）**。透過 Baseline、Smart Green 與 Sensitivity 三情境檢驗。 |
| `UNVERIFIED_XMASLAND_2025_REPORT` | 2025 耶誕城 740 萬人次媒體轉述 | `7,400,000` 人次 / `45` 天 | 2025 | 媒體轉述（缺直連報告） | https://newtaipei.travel/ | `OFFICIAL` / **UNVERIFIED** | **已排除（`inActiveModel: false`）**。未驗證直連網址之資料不進入正式模型。 |
| `UNVERIFIED_WUGU_AI_SORTING` | 五股 AI 分選廠效率提升 >13% 轉述 | `>13%` | 2023–2025 | 媒體轉述（缺公務原表） | https://www.epd.ntpc.gov.tw/ | `OFFICIAL` / **UNVERIFIED** | **已排除（`inActiveModel: false`）**。未驗證且屬後端分選廠，不進入正式模型。 |

---

## 三、重新核算之三情境與敏感度分析精確數值表（$V = 100,000$ 人次/晚）

統一減量率公式：
$$\text{Source Reduction Rate (\%)} = \frac{G_{\text{total, Baseline}} - G_{\text{total, Scenario}}}{G_{\text{total, Baseline}}} \times 100\%$$
$$\text{Residual Reduction Rate (\%)} = \frac{W_{\text{residual, Baseline}} - W_{\text{residual, Scenario}}}{W_{\text{residual, Baseline}}} \times 100\%$$

| 情境 / 敏感度層級 | 杯替代率 / 損耗 | 包裝減量 | 設站數 / 壓縮倍率 / 清運 | Total Waste Generated | Source Waste Reduction | Recycled Waste (Diversion %) | Residual Waste | Residual Waste Reduction | Station Cap (kg) | Overflow Waste | Litter Waste |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Baseline (一般活動基準)** | `0%` / `10%` | `0%` | `10` 站 / `1.0×` / `2×` | **`8,500.00 kg`** | **`0.00 kg` (`0.00%`)** | **`2,728.50 kg`** (`32.10%`) | **`5,771.50 kg`** | **`0.00 kg` (`0.00%`)** | `124.8 kg` | `3,707.94 kg` | `2,961.04 kg` |
| **Sensitivity: Conservative (保守)** | `20%` / `12%` | `5%` | `14` 站 / `1.5×` / `3×` | **`8,052.22 kg`** | **`447.78 kg` (`5.27%`)** | **`3,568.79 kg`** (`44.32%`) | **`4,483.43 kg`** | **`1,288.07 kg` (`22.32%`)** | `187.2 kg` | `1,820.53 kg` | `1,585.72 kg` |
| **Smart Green / Base (基準)** | `35%` / `10%` | `10%` | `18` 站 / `2.5×` / `5×` | **`7,661.05 kg`** | **`838.95 kg` (`9.87%`)** | **`4,498.54 kg`** (`58.72%`) | **`3,162.51 kg`** | **`2,608.99 kg` (`45.20%`)** | `312.0 kg` | **`0.00 kg`** | `923.31 kg` |
| **Sensitivity: Aggressive (積極)** | `60%` / `6%` | `20%` | `18` 站 / `3.0×` / `6×` | **`6,923.08 kg`** | **`1,576.92 kg` (`18.55%`)** | **`4,409.02 kg`** (`63.69%`) | **`2,514.06 kg`** | **`3,257.44 kg` (`56.44%`)** | `374.4 kg` | **`0.00 kg`** | `834.37 kg` |
| **Normal Weekday Ref (平日參考 15k)** | `0%` / `10%` | `0%` | `10` 站 / `1.0×` / `2×` | `1,275.00 kg` | `0.00 kg` (`0.00%`) | `409.28 kg` (`32.10%`) | `865.73 kg` | `0.00 kg` (`0.00%`) | `124.8 kg` | `0.00 kg` | `444.16 kg` |
