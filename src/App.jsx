import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  LineChart, Line,
} from 'recharts'

// ─── Color palettes ────────────────────────────────────────────────────────────

const REGION_COLORS = {
  Northeast: '#22d3ee',
  Southwest: '#2dd4bf',
  Southeast: '#f472b6',
  Midwest:   '#a78bfa',
  West:      '#fbbf24',
}

const CATEGORY_COLORS = [
  '#22d3ee', '#60a5fa', '#a78bfa',
  '#e879f9', '#f472b6', '#fb923c', '#facc15',
]

// ─── Formatting helpers ────────────────────────────────────────────────────────

function fmtMoney(val) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(1)}k`
  return `$${Number(val).toFixed(0)}`
}

function fmtMoneyFull(val) {
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtMonth(str) {
  if (!str) return ''
  const [year, month] = str.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', { month: 'short' })
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseRows(data) {
  return data
    .filter(r => r['Customer Name']?.trim())
    .map(r => ({
      customer:  r['Customer Name']?.trim(),
      category:  r['Product Category']?.trim(),
      item:      r['Item Description']?.trim(),
      quantity:  Number(r['Quantity'])   || 0,
      totalSale: Number(r['Total Sale']) || 0,
      cogs:      Number(r['COGS'])       || 0,
      profit:    Number(r['Profit'])     || 0,
      date:      r['Date']?.trim(),
      region:    r['Region']?.trim(),
    }))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = 'from-cyan-400 to-teal-400' }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`}
      />
      <p className="text-xs font-medium uppercase tracking-widest text-white/50">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/40">{sub}</p>}
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      {title && (
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">{title}</p>
      )}
      {children}
    </div>
  )
}

// ─── Custom tooltips ──────────────────────────────────────────────────────────

function CustomerTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/90 p-3 text-xs text-white backdrop-blur-xl shadow-xl">
      <p className="font-semibold">{d.customer}</p>
      <p style={{ color: REGION_COLORS[d.region] || '#fff' }}>{d.region}</p>
      <p className="mt-1 font-bold text-cyan-300">{fmtMoneyFull(d.profit)}</p>
    </div>
  )
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/90 p-3 text-xs text-white backdrop-blur-xl shadow-xl">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmtMoneyFull(p.value)}
        </p>
      ))}
    </div>
  )
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/90 p-3 text-xs text-white backdrop-blur-xl shadow-xl">
      <p className="font-semibold">{d.name}</p>
      <p className="mt-1 font-bold" style={{ color: d.payload.fill }}>{fmtMoneyFull(d.value)}</p>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [rows, setRows]               = useState([])
  const [regionFilter, setRegionFilter] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [fileName, setFileName]       = useState('Sample Data')
  const fileRef                       = useRef(null)

  // Load the bundled CSV on first render
  useEffect(() => {
    fetch('/data/sales.csv')
      .then(r => r.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: result => {
            setRows(parseRows(result.data))
            setLoading(false)
          },
        })
      })
      .catch(() => setLoading(false))
  }, [])

  const handleUpload = useCallback(e => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        setRows(parseRows(result.data))
        setRegionFilter(null)
      },
    })
    e.target.value = ''
  }, [])

  // Apply region filter
  const filtered = useMemo(
    () => (regionFilter ? rows.filter(r => r.region === regionFilter) : rows),
    [rows, regionFilter]
  )

  // Aggregate all stats from the filtered rows
  const stats = useMemo(() => {
    const totalRevenue  = filtered.reduce((s, r) => s + r.totalSale, 0)
    const totalProfit   = filtered.reduce((s, r) => s + r.profit, 0)
    const margin        = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0
    const transactions  = filtered.length

    // Top 10 customers by profit
    const custMap = {}
    filtered.forEach(r => {
      if (!custMap[r.customer]) custMap[r.customer] = { customer: r.customer, region: r.region, profit: 0 }
      custMap[r.customer].profit += r.profit
    })
    const topCustomers = Object.values(custMap)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)

    // Sales by category (donut chart)
    const catMap = {}
    filtered.forEach(r => {
      catMap[r.category] = (catMap[r.category] || 0) + r.totalSale
    })
    const categoryData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Monthly revenue + profit trend
    const monthMap = {}
    filtered.forEach(r => {
      const month = r.date?.substring(0, 7)
      if (!month) return
      if (!monthMap[month]) monthMap[month] = { month, revenue: 0, profit: 0 }
      monthMap[month].revenue += r.totalSale
      monthMap[month].profit  += r.profit
    })
    const monthlyData = Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(d => ({ ...d, label: fmtMonth(d.month) }))

    // All unique regions from the full (unfiltered) row set
    const regions = [...new Set(rows.map(r => r.region))].filter(Boolean).sort()

    return { totalRevenue, totalProfit, margin, transactions, topCustomers, categoryData, monthlyData, regions }
  }, [filtered, rows])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: [
          'radial-gradient(1200px 600px at 10% -10%, rgba(34,211,238,0.25), transparent 60%)',
          'radial-gradient(800px 600px at 90% 80%, rgba(45,212,191,0.15), transparent 60%)',
          '#0a0f1e',
        ].join(', '),
        backgroundAttachment: 'fixed',
      }}
      className="text-white"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Sales Analytics Dashboard</h1>
              <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                Live Sync
              </span>
            </div>
            <p className="mt-1 text-sm text-white/50">
              {fileName} — {rows.length} transactions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/10 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        {/* ── Loading / Empty states ──────────────────────────────────── */}
        {loading ? (
          <div className="flex h-64 items-center justify-center text-white/40">
            Loading data…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-white/50">
            <p>No data loaded.</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border border-white/20 bg-white/10 px-6 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Upload a CSV file
            </button>
          </div>
        ) : (
          <>
            {/* ── KPI Cards ────────────────────────────────────────────── */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Total Revenue"
                value={fmtMoney(stats.totalRevenue)}
                sub={fmtMoneyFull(stats.totalRevenue)}
                accent="from-cyan-400 to-teal-400"
              />
              <StatCard
                label="Total Profit"
                value={fmtMoney(stats.totalProfit)}
                sub={fmtMoneyFull(stats.totalProfit)}
                accent="from-violet-400 to-fuchsia-400"
              />
              <StatCard
                label="Profit Margin"
                value={`${stats.margin.toFixed(1)}%`}
                accent="from-pink-400 to-rose-400"
              />
              <StatCard
                label="Transactions"
                value={stats.transactions.toLocaleString()}
                accent="from-amber-400 to-orange-400"
              />
            </div>

            {/* ── Region Filter Chips ───────────────────────────────────── */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setRegionFilter(null)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  regionFilter === null
                    ? 'border-white/40 bg-white/15 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                All Regions
              </button>
              {stats.regions.map(region => (
                <button
                  key={region}
                  onClick={() => setRegionFilter(r => (r === region ? null : region))}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    regionFilter === region
                      ? 'border-white/40 bg-white/15 text-white'
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: REGION_COLORS[region] || '#ffffff' }}
                  />
                  {region}
                </button>
              ))}
            </div>

            {/* ── Row 1: Bar Chart + Donut Chart ───────────────────────── */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

              {/* Top 10 Customers — horizontal bar (takes 2/3 of width) */}
              <div className="lg:col-span-2">
                <Panel title="Top Customers by Profit">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={stats.topCustomers}
                      layout="vertical"
                      margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tickFormatter={fmtMoney}
                        tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="customer"
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={130}
                      />
                      <Tooltip content={<CustomerTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Bar dataKey="profit" radius={[0, 6, 6, 0]} maxBarSize={22}>
                        {stats.topCustomers.map((entry, i) => (
                          <Cell key={i} fill={REGION_COLORS[entry.region] || '#60a5fa'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Panel>
              </div>

              {/* Sales by Category — donut (takes 1/3 of width) */}
              <Panel title="Sales by Category">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={stats.categoryData}
                      cx="50%"
                      cy="42%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.categoryData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ opacity: 0.8, fontSize: 11 }}
                      formatter={val => (
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>{val}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            {/* ── Row 2: Monthly Trend Line Chart ──────────────────────── */}
            <Panel title="Monthly Revenue & Profit Trend">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={stats.monthlyData}
                  margin={{ top: 10, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtMoney}
                    tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#22d3ee', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#22d3ee' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#a78bfa"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#a78bfa' }}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="mt-4 flex items-center gap-6">
                <span className="flex items-center gap-2 text-xs text-white/60">
                  <span className="h-0.5 w-6 rounded bg-cyan-400" />
                  Revenue
                </span>
                <span className="flex items-center gap-2 text-xs text-white/60">
                  <span className="h-0.5 w-6 rounded bg-violet-400" />
                  Profit
                </span>
              </div>
            </Panel>

          </>
        )}
      </div>
    </div>
  )
}
