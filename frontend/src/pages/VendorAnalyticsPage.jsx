import { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";
import { formatPrice } from "../utils/product";

function defaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 364);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
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
      const data = err?.response?.data;
      if (typeof data === "string") setError(data);
      else if (data?.detail) setError(data.detail);
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

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Vendor Earnings Analytics</h1>
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded bg-white p-4 shadow">
        <div>
          <label className="block text-sm text-gray-600">Start Date</label>
          <input className="rounded border p-2" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-600">End Date</label>
          <input className="rounded border p-2" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button className="rounded bg-brand-600 px-4 py-2 text-white" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Apply Filter"}
        </button>
      </div>

      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat label="Total Sales" value={`$${formatPrice(data?.summary?.total_sales)}`} />
        <Stat label="Total Items" value={data?.summary?.total_items || 0} />
        <Stat label="Total Orders" value={data?.summary?.total_orders || 0} />
        <Stat label="Avg Order Value" value={`$${formatPrice(data?.summary?.avg_order_value)}`} />
      </div>

      <div className="mt-6 rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Sales Trend</h2>
        <p className="text-sm text-gray-600">Date-wise sales for shipped/delivered items.</p>
        <div className="mt-4 space-y-2">
          {(data?.series || []).map((point) => (
            <div key={point.date}>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                <span>{point.date}</span>
                <span>${formatPrice(point.sales)} | {point.orders} orders</span>
              </div>
              <div className="h-3 w-full rounded bg-gray-100">
                <div
                  className="h-3 rounded bg-brand-600"
                  style={{ width: `${(Number(point.sales || 0) / maxSales) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {!(data?.series || []).length && <p className="text-sm text-gray-600">No data for selected range.</p>}
        </div>
      </div>
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

function Stat({ label, value }) {
  return (
    <div className="rounded bg-white p-4 shadow">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
