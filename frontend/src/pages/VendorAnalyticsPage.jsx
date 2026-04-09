import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, BarChart3, CalendarDays, DollarSign, Package, RefreshCw, ShoppingBag } from "lucide-react";
import apiClient from "../api/client";
import { formatPrice } from "../utils/product";

function defaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 364);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

function AnimatedMetric({ value, prefix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    const duration = 900;
    let frame;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return `${prefix}${Number(display).toFixed(decimals)}`;
}

export default function VendorAnalyticsPage() {
  const d = defaultDates();
  const [startDate, setStartDate] = useState(d.start);
  const [endDate, setEndDate] = useState(d.end);
  const [data, setData] = useState({
    start_date: d.start,
    end_date: d.end,
    summary: { total_sales: 0, total_items: 0, total_orders: 0, avg_order_value: 0 },
    series: []
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    const fallback = defaultDates();
    let from = startDate || fallback.start;
    let to = endDate || fallback.end;
    if (from > to) {
      const tmp = from;
      from = to;
      to = tmp;
      setStartDate(from);
      setEndDate(to);
    }

    try {
      const res = await apiClient.get("/orders/vendor/items/");
      const items = res.data.results || res.data || [];
      const built = buildAnalyticsFromItems(items, from, to);
      setData(built);
    } catch (err) {
      const e = err?.response?.data;
      if (typeof e === "string") setError(e);
      else if (e?.detail) setError(e.detail);
      else {
        const code = err?.response?.status;
        setError(code ? `Unable to load analytics (HTTP ${code}).` : "Unable to load analytics.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const maxSales = useMemo(() => {
    if (!data?.series?.length) return 1;
    return Math.max(...data.series.map((p) => Number(p.sales || 0)), 1);
  }, [data]);

  const stats = [
    {
      label: "Total Sales",
      icon: DollarSign,
      value: <AnimatedMetric value={data?.summary?.total_sales} prefix="$" decimals={2} />,
      tone: "text-emerald-700 bg-emerald-100"
    },
    {
      label: "Total Items",
      icon: Package,
      value: <AnimatedMetric value={data?.summary?.total_items} />,
      tone: "text-indigo-700 bg-indigo-100"
    },
    {
      label: "Total Orders",
      icon: ShoppingBag,
      value: <AnimatedMetric value={data?.summary?.total_orders} />,
      tone: "text-cyan-700 bg-cyan-100"
    },
    {
      label: "Avg Order Value",
      icon: BarChart3,
      value: <AnimatedMetric value={data?.summary?.avg_order_value} prefix="$" decimals={2} />,
      tone: "text-violet-700 bg-violet-100"
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Earnings Analytics</h1>
          <p className="mt-1 text-sm text-slate-600">Revenue performance and fulfillment trends for your store.</p>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 rounded-2xl border border-white/40 bg-white/20 p-4 shadow-xl backdrop-blur-md"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              <CalendarDays size={13} /> Start Date
            </label>
            <input className="rounded-lg border border-slate-300 bg-white/80 p-2 text-sm" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              <CalendarDays size={13} /> End Date
            </label>
            <input className="rounded-lg border border-slate-300 bg-white/80 p-2 text-sm" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-slate-400"
            onClick={load}
            disabled={loading}
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {loading ? "Loading..." : "Apply Filter"}
          </button>
        </div>
      </motion.section>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="inline-flex items-center gap-2"><AlertCircle size={15} /> {error}</span>
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: idx * 0.04, ease: "easeOut" }}
              className="rounded-2xl border border-white/40 bg-white/20 p-4 shadow-lg backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">{s.label}</p>
                <span className={`rounded-full p-1.5 ${s.tone}`}>
                  <Icon size={15} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mt-6 rounded-2xl border border-white/40 bg-white/20 p-4 shadow-xl backdrop-blur-md"
      >
        <h2 className="text-lg font-semibold text-slate-900">Sales Trend</h2>
        <p className="text-sm text-slate-600">Date-wise sales for shipped/delivered items.</p>

        <div className="mt-4 space-y-3">
          {(data?.series || []).map((point) => (
            <div key={point.date}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                <span>{point.date}</span>
                <span>${formatPrice(point.sales)} | {point.orders} orders | {point.items} items</span>
              </div>
              <div className="h-3 w-full rounded bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(Number(point.sales || 0) / maxSales) * 100}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="h-3 rounded bg-indigo-600"
                />
              </div>
            </div>
          ))}

          {!(data?.series || []).length && <p className="text-sm text-slate-600">No data for selected range.</p>}
        </div>
      </motion.section>
    </div>
  );
}

function buildAnalyticsFromItems(items, from, to) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const filtered = items.filter((i) => {
    const st = i.status;
    if (st !== "SHIPPED" && st !== "DELIVERED") return false;
    const d = new Date(i.order_created_at);
    return d >= fromDate && d <= toDate;
  });

  const totalSales = filtered.reduce((sum, i) => sum + Number(i.line_total || 0), 0);
  const totalItems = filtered.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
  const uniqueOrders = new Set(filtered.map((i) => String(i.order || i.id))).size;
  const avgOrderValue = uniqueOrders ? totalSales / uniqueOrders : 0;

  const seriesMap = {};
  for (const i of filtered) {
    const day = new Date(i.order_created_at).toISOString().slice(0, 10);
    if (!seriesMap[day]) {
      seriesMap[day] = { date: day, sales: 0, items: 0, orders: new Set() };
    }
    seriesMap[day].sales += Number(i.line_total || 0);
    seriesMap[day].items += Number(i.quantity || 0);
    seriesMap[day].orders.add(String(i.order || i.id));
  }

  const series = Object.values(seriesMap)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((d) => ({ date: d.date, sales: d.sales, items: d.items, orders: d.orders.size }));

  return {
    start_date: from,
    end_date: to,
    summary: {
      total_sales: totalSales,
      total_items: totalItems,
      total_orders: uniqueOrders,
      avg_order_value: avgOrderValue
    },
    series
  };
}
