
import { useEffect, useState } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Wallet,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const API_BASE = "http://localhost:5000/api";

const formatKES = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function Overview() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [profitSummary, setProfitSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salesPeriod, setSalesPeriod] = useState("7");

  async function loadOverview(showLoading = true) {
  if (showLoading) {
    setLoading(true);
  }

  setError("");

    try {
      const [
        salesResponse,
        productsResponse,
        purchasesResponse,
        profitResponse,
      ] = await Promise.all([
        fetch(`${API_BASE}/sales`),
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/purchases`),
        fetch(`${API_BASE}/sales/profit-summary`),
      ]);

      if (
        !salesResponse.ok ||
        !productsResponse.ok ||
        !purchasesResponse.ok ||
        !profitResponse.ok
      ) {
        throw new Error("One or more dashboard requests failed.");
      }

      const [salesResult, productsResult, purchasesResult, profitResult] =
        await Promise.all([
          salesResponse.json(),
          productsResponse.json(),
          purchasesResponse.json(),
          profitResponse.json(),
        ]);

      if (
        !salesResult.success ||
        !productsResult.success ||
        !purchasesResult.success ||
        !profitResult.success
      ) {
        throw new Error("The server returned an unsuccessful response.");
      }

      setSales(salesResult.data || []);
      setProducts(productsResult.data || []);
      setPurchases(purchasesResult.data || []);
      setProfitSummary(profitResult.data || null);
    } catch (err) {
      setError(err.message || "Could not load dashboard data.");
    } finally {
        if (showLoading) {
          setLoading(false);
        }
    }
  }

  useEffect(() => {
  // Load dashboard data when the page opens.
  loadOverview();

  // Refresh dashboard data every 60 seconds.
  const intervalId = window.setInterval(() => {
    loadOverview(false);
  }, 60000);

  // Stop the timer when the dashboard unmounts.
  return () => {
    window.clearInterval(intervalId);
  };
  }, []);

  const todayKey = getLocalDateKey(new Date());
  const completedSales = sales.filter(
    (sale) => sale.payment_status === "completed"
  );

  
  const salesChartData = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate;

    if (salesPeriod === "month") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      const days = Number(salesPeriod);
      startDate = new Date(today);
      startDate.setDate(today.getDate() - (days - 1));
    }

    const totalDays =
      Math.round((today.getTime() - startDate.getTime()) / 86400000) + 1;

    return Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);

      const dateKey = getLocalDateKey(date);

      const dailySales = completedSales
        .filter(
          (sale) =>
            sale.created_at &&
            getLocalDateKey(new Date(sale.created_at)) === dateKey
        )
        .reduce(
          (total, sale) => total + Number(sale.total_amount || 0),
          0
        );

      return {
        date: date.toLocaleDateString("en-KE", {
          day: "numeric",
          month: "short",
        }),
        sales: Number(dailySales.toFixed(2)),
      };
    });
  })();


  const todaySales = completedSales.filter(
    (sale) =>
      sale.created_at &&
      getLocalDateKey(new Date(sale.created_at)) === todayKey
  );

  const todayRevenue = todaySales.reduce(
    (total, sale) => total + Number(sale.total_amount || 0),
    0
  );

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.is_active) === 1 &&
      Number(product.stock_quantity) <= Number(product.reorder_level)
  );

  const inventoryValue = products.reduce((total, product) => {
    if (Number(product.is_active) !== 1) return total;

    return (
      total +
      Number(product.stock_quantity || 0) *
        Number(product.cost_price || 0)
    );
  }, 0);

  const outstandingBalance = purchases.reduce((total, purchase) => {
    if (["cancelled", "rejected"].includes(purchase.status)) return total;

    return (
      total +
      Math.max(
        0,
        Number(purchase.total_amount || 0) -
          Number(purchase.amount_paid || 0)
      )
    );
  }, 0);

  const recentSales = [...sales]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  const metrics = [
    {
      label: "Today's Sales",
      value: formatKES(todayRevenue),
      detail: `${todaySales.length} completed transaction(s)`,
      icon: TrendingUp,
    },
    {
      label: "Completed Sales",
      value: completedSales.length,
      detail: "All-time completed transactions",
      icon: ShoppingBag,
    },
    {
      label: "Inventory Value",
      value: formatKES(inventoryValue),
      detail: "Based on cost price and current stock",
      icon: Package,
    },
    {
      label: "Supplier Balance",
      value: formatKES(outstandingBalance),
      detail: "Outstanding purchase balances",
      icon: Wallet,
    },
  ];
  
  const profitMetrics = [
    {
      label: "Revenue Excluding Tax",
      value: formatKES(
        Number(profitSummary?.revenue_excluding_tax || 0)
      ),
      detail: "Completed sales, excluding tax",
      icon: TrendingUp,
    },
    {
      label: "Known Cost of Goods Sold",
      value: formatKES(
        Number(profitSummary?.known_cost_of_goods_sold || 0)
      ),
      detail: "Cost recorded for completed sales",
      icon: Package,
    },
    {
      label: "Known Gross Profit",
      value: formatKES(
        Number(profitSummary?.known_gross_profit || 0)
      ),
      detail: "Profit calculated from recorded historical costs",
      icon: Wallet,
    },
    {
      label: "Sales Missing Cost Data",
      value: Number(profitSummary?.sales_with_missing_cost || 0),
      detail: "Completed sales with incomplete historical costs",
      icon: ShoppingBag,
    },
  ];

  if (loading) {
    return (
      <div className="min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <TrendingUp size={17} />
                <span>Business Summary</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Overview
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                A summary of your retail business.
              </p>
            </div>
            <button
              type="button"
              onClick={loadOverview}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 border-t-2 border-t-red-500 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading overview dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp size={17} />
            <span>Business Summary</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            A summary of your retail business.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOverview}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {metric.label}
                </p>
                <Icon
                  size={21}
                  className={metric.label === "Supplier Balance" ? "text-red-600" : "text-slate-500"}
                />
              </div>

              <p className="mt-3 break-words text-2xl font-bold text-slate-900">
                {metric.value}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {metric.detail}
              </p>
            </div>
          );
        })}
      </div>
      
      {/* Profit & Sales Insights */}
      <section className="mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Profit &amp; Sales Insights
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Financial performance based on recorded historical costs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {profitMetrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {metric.label}
                  </p>
                  <Icon size={21} className="text-slate-500" />
                </div>

                <p className="mt-3 break-words text-2xl font-bold text-slate-900">
                  {metric.value}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {metric.detail}
                </p>
              </div>
            );
          })}
        </div>

        {Number(profitSummary?.sales_with_missing_cost || 0) > 0 && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Profit data is incomplete.</strong>{" "}
            Some completed sales do not have historical product costs recorded.
            Known gross profit may therefore be lower than actual gross profit.
            Review the missing cost data before relying on these figures.
          </div>
        )}
      </section>

      
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="text-lg font-semibold text-gray-800">
                    Sales Performance
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    {salesPeriod === "month"
                       ? "Daily completed sales for this month"
                       : `Daily completed sales for the last ${salesPeriod} days`}
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {[
                    { label: "7 Days", value: "7" },
                    { label: "30 Days", value: "30" },
                    { label: "This Month", value: "month" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSalesPeriod(option.value)}
                    aria-pressed={salesPeriod === option.value}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      salesPeriod === option.value
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
            </div>
        </div>


        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
               data={salesChartData}
               margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
               <CartesianGrid strokeDasharray="3 3" />
               <XAxis dataKey="date" tick={{ fontSize: 12 }} />
               <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `KES ${value}`}
                  width={90}
                />
                <Tooltip
                  formatter={(value) => [
                    `KES ${Number(value).toLocaleString("en-KE", {
                       minimumFractionDigits: 2,
                       maximumFractionDigits: 2,
                    })}`,
                    "Completed Sales",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-600" />

              <h2 className="font-semibold text-slate-800">
                Low-Stock Products
              </h2>

              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {lowStockProducts.length}
              </span>
            </div>

            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("retailflow:navigate", {
                    detail: { module: "Stock Management" },
                  })
                )
              }
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Manage Stock
              <ArrowRight size={16} />
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              No products are currently at or below their reorder level.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-5 py-3 font-semibold">In Stock</th>
                    <th className="px-5 py-3 font-semibold">Reorder Level</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-t border-slate-100 bg-amber-50/50"
                      >
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {product.product_name}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-amber-700">
                          {Number(product.stock_quantity)} {product.unit_of_measure}
                        </span>
                        <span className="ml-2 text-xs text-amber-700">
                          Restock
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {Number(product.reorder_level)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900">Recent Sales</h2>
          </div>

          {recentSales.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              No sales have been recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Receipt</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Total</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {sale.receipt_number}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {sale.created_at
                          ? new Date(sale.created_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-800">
                        {formatKES(sale.total_amount)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize text-slate-700">
                          {sale.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      </div>
    </div>
  );
}
