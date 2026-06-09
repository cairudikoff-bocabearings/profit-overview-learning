# Sales Analytics Dashboard — Technical Specification

## 1. Overview

A single-page React dashboard that visualizes sales transaction data. It fetches a local CSV file on mount, parses it into typed rows, aggregates the data in-memory, and renders three KPI stat cards, a filterable horizontal bar chart, a donut chart, and a dual-line trend chart.

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | TanStack Start (Vite-based, file-based routing) | ^1.167.50 |
| UI Library | React | ^19.2.0 |
| Styling | Tailwind CSS | ^4.2.1 |
| Charts | Recharts | ^2.15.4 |
| Data Source | Static CSV file fetched at runtime | — |

## 3. Data Source & Structure

### 3.1 Source File
- **Path:** `/public/data/sales.csv`
- **Fetch URL:** `/data/sales.csv` (relative, fetched via `fetch()` on component mount)
- **Format:** Comma-separated values, no quotes, Windows or Unix line endings accepted
- **Header row:** `Customer Name,Product Category,Item Description,Quantity,Unit Price,Total Sale,COGS,Profit,Profit Margin %,Date,Region`

### 3.2 Parsed Row Type (`Row`)

```typescript
type Row = {
  customer: string;   // Column 0 — Customer Name
  category: string;   // Column 1 — Product Category
  item: string;       // Column 2 — Item Description
  qty: number;        // Column 3 — Quantity (parsed as integer)
  total: number;      // Column 5 — Total Sale (parsed as float)
  cogs: number;       // Column 6 — COGS (parsed as float)
  profit: number;     // Column 7 — Profit (parsed as float)
  date: string;       // Column 9 — Date (ISO-like string YYYY-MM-DD)
  region: string;     // Column 10 — Region
};
```

> **Note:** Columns 4 (Unit Price) and 8 (Profit Margin %) are present in the CSV but **not** parsed into the `Row` type.

### 3.3 Aggregated Data Objects

All aggregations are computed inside a single `useMemo` hook keyed on `[rows, regionFilter]`.

| Variable | Type | Description |
|---|---|---|
| `totalRevenue` | `number` | Sum of all `total` fields |
| `totalProfit` | `number` | Sum of all `profit` fields |
| `margin` | `number` | `totalProfit / totalRevenue * 100` (0 if no revenue) |
| `topByRegion` | `{ name, profit, region }[]` | Top 10 customers by profit, filtered by selected region |
| `regions` | `string[]` | Alphabetically sorted list of unique regions |
| `byCategory` | `{ name, value }[]` | Sum of `total` grouped by `category` |
| `byMonth` | `{ month, revenue, profit }[]` | Monthly aggregates, sorted chronologically; `month` is a 3-letter abbreviation (e.g. "Jan") |

## 4. Page Metadata

```
Title:       Sales Analytics Dashboard
Description: Modern analytics dashboard for customer sales, profit and trends.
```

## 5. Color Scheme

### 5.1 Dashboard Background
A fixed multi-layer gradient defined in `src/styles.css` as a `@utility dashboard-bg`:

```css
background:
  radial-gradient(1200px 600px at 10% -10%, rgba(34, 211, 238, 0.25), transparent 60%),
  radial-gradient(1000px 500px at 90% 10%, rgba(94, 234, 212, 0.18), transparent 60%),
  linear-gradient(135deg, #0b1e3f 0%, #0d2a4a 35%, #0f4d5c 70%, #0f6b66 100%);
background-attachment: fixed;
```

### 5.2 Category Colors (Donut Chart)
Applied cyclically to pie slices:

| Index | Hex |
|---|---|
| 0 | `#22d3ee` |
| 1 | `#5eead4` |
| 2 | `#7dd3fc` |
| 3 | `#a78bfa` |
| 4 | `#f472b6` |
| 5 | `#fbbf24` |
| 6 | `#34d399` |

### 5.3 Region Colors (Bar Chart)
Each bar is colored by the customer’s primary region (the region contributing the highest profit for that customer):

| Region | Hex |
|---|---|
| Northeast | `#22d3ee` |
| Southwest | `#5eead4` |
| Southeast | `#f472b6` |
| Midwest | `#a78bfa` |
| West | `#fbbf24` |
| Fallback | `#94a3b8` |

### 5.4 Trend Line Colors
- **Revenue line:** linear gradient from `#7dd3fc` to `#22d3ee`
- **Profit line:** linear gradient from `#5eead4` to `#34d399`

### 5.5 UI Tokens
All cards and panels share this glassmorphic treatment:
- **Background:** `bg-white/5`
- **Border:** `border-white/10`
- **Backdrop blur:** `backdrop-blur-xl`
- **Border radius:** `rounded-3xl`
- **Text primary:** `text-white`
- **Text muted:** `text-white/60` or `text-white/70`
- **Stat card glow accents:** radial gradient blobs using cyan/teal/emerald at 40% → 10% opacity

## 6. Layout

### 6.1 Container
- Max width: `max-w-7xl`
- Horizontal padding: `px-6`
- Vertical padding: `py-10`
- Centered with `mx-auto`

### 6.2 Responsive Breakpoints
| Breakpoint | Behavior |
|---|---|
| Mobile (<768px) | Single column layouts, stat cards stack vertically |
| Tablet (≥768px) | Stat cards become 3-column grid |
| Desktop (≥1024px) | Bar chart + donut chart sit side-by-side (2:1 ratio) |

### 6.3 Section Hierarchy

```
┌─ Header (flex, wrap, justify-between)
│  ├─ Title block: "Sales Intelligence" eyebrow + H1 "Revenue & Profit Overview" + subtitle
│  └─ Status badge: "Live · auto-synced" (rounded-full, glass)
│
├─ KPI Cards (grid, 1 col → 3 cols)
│  ├─ Total Revenue
│  ├─ Total Profit
│  └─ Profit Margin
│
├─ Middle Row (grid, 1 col → 3 cols)
│  ├─ Panel (col-span-2): Top 10 Customers by Profit
│  │  └─ Region filter chips
│  │  └─ Horizontal bar chart (400px tall)
│  └─ Panel: Sales by Category
│     └─ Donut chart (420px tall)
│
└─ Bottom Row (full width)
   └─ Panel: Revenue & Profit Trends
      └─ Dual-line chart (360px tall)
```

## 7. Components

### 7.1 `StatCard`
Props:
- `label: string` — small uppercase eyebrow text
- `value: string` — large numeric display
- `accent: string` — Tailwind gradient direction classes for the glow blob (e.g. `"from-cyan-400/40 to-teal-300/10"`)

Visual: Glass card with an absolutely positioned blurred radial gradient blob in the top-right corner.

### 7.2 `Panel`
Props:
- `title: string`
- `children: React.ReactNode`
- `className?: string` — optional grid colspan override

Visual: Same glass card treatment as `StatCard` but without the glow blob.

## 8. Charts

### 8.1 Top 10 Customers by Profit — Horizontal Bar Chart
- **Library:** Recharts `<BarChart layout="vertical">`
- **Data:** `topByRegion`
- **Height:** 400px
- **Y-axis:** Customer names (`type="category"`), width 140px, font size 12px
- **X-axis:** Profit values (`type="number"`), formatted with `fmtMoney`
- **Grid:** Vertical-only (`horizontal={false}`), stroke `rgba(255,255,255,0.08)`
- **Bars:** Rounded corners `radius={[8,8,8,8]}`, colored per-region via `<Cell>`
- **Tooltip:** Dark navy bubble (`rgba(15,23,42,0.95)`), white text, shows customer name + primary region in the label and full dollar amount for the value

### 8.2 Sales by Category — Donut Chart
- **Library:** Recharts `<PieChart>`
- **Data:** `byCategory`
- **Height:** 420px
- **Inner radius:** 70px
- **Outer radius:** 120px
- **Padding angle:** 3°
- **Stroke:** `rgba(15,23,42,0.6)`
- **Tooltip:** Same dark bubble style as bar chart
- **Legend:** White text at 80% opacity, 12px font

### 8.3 Revenue & Profit Trends — Dual Line Chart
- **Library:** Recharts `<LineChart>`
- **Data:** `byMonth`
- **Height:** 360px
- **Grid:** Both axes, stroke `rgba(255,255,255,0.08)`
- **X-axis:** 3-letter month abbreviations
- **Y-axis:** Formatted with `fmtMoney`
- **Lines:**
  - Revenue: monotone curve, 3px stroke, gradient stroke, dot radius 4px (`#22d3ee`), active dot 6px
  - Profit: monotone curve, 3px stroke, gradient stroke, dot radius 4px (`#34d399`), active dot 6px
- **Tooltip & Legend:** Same styling as other charts

## 9. Interactivity & Filtering

### 9.1 Region Filter Chips
Located directly above the horizontal bar chart. One chip per unique region plus an "All" chip.

| State | Style |
|---|---|
| Active | `border-white/40 bg-white/15 text-white` |
| Inactive | `border-white/10 bg-white/5 text-white/70 hover:bg-white/10` |

Each region chip (except "All") shows a 2×2px colored dot matching its `REGION_COLORS` mapping.

### 9.2 Data Flow on Filter Change
1. User clicks a region chip.
2. `regionFilter` state updates.
3. `useMemo` re-runs, recomputing `topByRegion` and `margin`.
4. Bar chart re-renders with the filtered top-10 customers.
4. KPI stat cards update because `margin` is recalculated (note: totalRevenue and totalProfit remain global, not filtered).

### 9.3 Chart Tooltips
All charts share a unified tooltip appearance:
- Background: `rgba(15, 23, 42, 0.95)`
- Border: `1px solid rgba(255,255,255,0.1)`
- Border radius: 12px
- Label text: white
- Value text: white
- Value formatter: `fmtMoneyFull` (e.g. `$12,345`)

## 10. Number Formatting

| Function | Purpose | Example |
|---|---|---|
| `fmtMoney(n)` | Axis ticks, compact display | `1234` → `$1.2k`; `900` → `$900` |
| `fmtMoneyFull(n)` | Stat cards, tooltip values | `12345` → `$12,345` |

## 11. State Management

| State | Type | Initial | Source |
|---|---|---|---|
| `rows` | `Row[]` | `[]` | Fetched once on mount from `/data/sales.csv` |
| `regionFilter` | `string` | `"All"` | User interaction |

No external state library is used; React `useState` and `useMemo` are sufficient.

## 12. Asset Requirements

1. **CSV file:** `public/data/sales.csv` must exist at build time.
2. **No images or icons** are used in the dashboard itself.
3. **No custom fonts** are required; the system font stack is used.

## 13. Accessibility Considerations

- All text sits on dark backgrounds with high contrast (white or near-white text).
- Tooltip text is explicitly set to white (`#ffffff`) to avoid Recharts’ default dark-on-dark readability issue.
- Chart axes use `rgba(255,255,255,0.55–0.7)` for sufficient but subdued contrast.

## 14. Build Notes

- The route file is `src/routes/index.tsx`, mapped to path `/` by TanStack Router.
- Because the CSV is in `public/`, it is served as a static asset; no backend API is required.
- The `dashboard-bg` utility must be registered in `src/styles.css` (Tailwind v4 `@utility` syntax).
