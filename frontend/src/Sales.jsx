import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  Receipt,
  ShoppingBag,
  Banknote,
  AlertCircle,
} from "lucide-react";

const SALES_API = "http://localhost:5000/api/sales";

const formatKES = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getSalesArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.sales)) return response.sales;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.sales)) return response.data.sales;
  if (Array.isArray(response?.data?.data)) return response.data.data;

  return [];
};

const getStatus = (sale) =>
  String(sale.payment_status || sale.status || "unknown").toLowerCase();

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const fetchSales = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(SALES_API);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to load sales.");
      }

      setSales(getSalesArray(result));
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the sales API. Check that your backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  
  const openSaleDetails = async (sale) => {
    const saleId = sale.id ?? sale.sale_id;

    // Open the modal immediately, then replace the summary with full details.
    setSelectedSale(sale);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const response = await fetch(`${SALES_API}/${saleId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to load sale details.");
      }

      // Support common API response shapes where items may be nested beside the sale.
      const payload = result?.data ?? result;
      const saleData = payload?.sale ?? payload?.data?.sale ?? payload;
      const items =
        saleData?.items ??
        saleData?.sale_items ??
        saleData?.saleItems ??
        payload?.items ??
        payload?.sale_items ??
        result?.items ??
        result?.sale_items ??
        [];

      setSelectedSale({
        ...saleData,
        items: Array.isArray(items) ? items : [],
      });
    } catch (err) {
      setDetailsError(err.message || "Unable to load sale details.");
    } finally {
      setDetailsLoading(false);
    }
  };


  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const receipt = String(sale.receipt_number || "").toLowerCase();
      const saleId = String(sale.id ?? sale.sale_id ?? "");
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        receipt.includes(query) ||
        saleId.toLowerCase().includes(query);

      const status = getStatus(sale);
      const payment = String(sale.payment_method || "").toLowerCase();

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      const matchesPayment =
        paymentFilter === "all" || payment === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [sales, search, statusFilter, paymentFilter]);

  const completedSales = sales.filter(
    (sale) => getStatus(sale) === "completed"
  );

  const totalRevenue = completedSales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );

  const completedCount = completedSales.length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Sales History
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review transactions recorded in your POS system.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSales}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Could not load sales</p>
              <p className="mt-1">{error}</p>
              <p className="mt-1">
                Confirm that your backend is running on port 5000.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total transactions</p>
              <Receipt className="text-blue-600" size={22} />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-800">
              {sales.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Completed sales</p>
              <ShoppingBag className="text-green-600" size={22} />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-800">
              {completedCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Completed sales revenue</p>
              <Banknote className="text-emerald-600" size={22} />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-800">
              {formatKES(totalRevenue)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search receipt number or sale ID"
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All payment methods</option>
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-800">Transactions</h2>
            <span className="text-sm text-slate-500">
              {filteredSales.length} result(s)
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="mx-auto mb-3 animate-spin" size={24} />
              Loading sales...
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="mx-auto mb-3 text-slate-300" size={36} />
              <p className="font-medium text-slate-700">No sales found</p>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Receipt</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Payment</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Total
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => {
                    const status = getStatus(sale);
                    const saleId = sale.id ?? sale.sale_id;

                    const statusStyle =
                      status === "completed"
                        ? "bg-green-100 text-green-700"
                        : status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : status === "cancelled" || status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-700";

                    return (
                      <tr key={saleId} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {sale.receipt_number || `Sale #${saleId}`}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            ID: {saleId}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(
                            sale.created_at || sale.sale_date || sale.date
                          )}
                        </td>

                        <td className="px-5 py-4 capitalize text-slate-600">
                          {sale.payment_method || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-slate-800">
                          {formatKES(sale.total_amount)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openSaleDetails(sale)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedSale && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedSale(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sale-details-title"
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="sale-details-title"
                    className="text-xl font-bold text-slate-800"
                  >
                    Sale details
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedSale.receipt_number ||
                      `Sale #${selectedSale.id ?? selectedSale.sale_id}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Close sale details"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Sale ID</span>
                  <span className="font-medium text-slate-800">
                    {selectedSale.id ?? selectedSale.sale_id ?? "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Date</span>
                  <span className="text-right font-medium text-slate-800">
                    {formatDate(
                      selectedSale.created_at ||
                        selectedSale.sale_date ||
                        selectedSale.date
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Payment method</span>
                  <span className="font-medium capitalize text-slate-800">
                    {selectedSale.payment_method || "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Payment status</span>
                  <span className="font-medium capitalize text-slate-800">
                    {getStatus(selectedSale)}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="mb-3 font-semibold text-slate-800">
                    Purchased items
                  </h3>

                  {detailsLoading ? (
                    <p className="py-4 text-center text-slate-500">
                      Loading purchased items...
                    </p>
                  ) : detailsError ? (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {detailsError}
                    </div>
                  ) : (() => {
                    const items =
                      selectedSale.items ??
                      selectedSale.sale_items ??
                      selectedSale.saleItems ??
                      [];

                    if (!Array.isArray(items) || items.length === 0) {
                      return (
                        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                          No purchased items were returned for this sale.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {items.map((item, index) => {
                          const quantity = Number(item.quantity || 0);
                          const unitPrice = Number(
                            item.unit_price ?? item.selling_price ?? 0
                          );
                          const lineTotal = Number(
                            item.line_total ??
                              item.total ??
                              quantity * unitPrice
                          );

                          return (
                            <div
                              key={item.id ?? `${item.product_id ?? "item"}-${index}`}
                              className="rounded-lg border border-slate-100 p-3"
                            >
                              <p className="font-medium text-slate-800">
                                {item.product_name ??
                                  item.name ??
                                  `Product #${item.product_id ?? "—"}`}
                              </p>
                              <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                                <span className="text-slate-500">
                                  {quantity} × {formatKES(unitPrice)}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {formatKES(lineTotal)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-4">
                  {[
                    ["Subtotal", selectedSale.subtotal],
                    ["Discount", selectedSale.discount_amount],
                    ["Tax", selectedSale.tax_amount],
                  ].map(([label, amount]) =>
                    amount !== undefined && amount !== null ? (
                      <div
                        key={label}
                        className="mb-2 flex justify-between gap-4"
                      >
                        <span className="text-slate-500">{label}</span>
                        <span className="text-slate-700">
                          {formatKES(amount)}
                        </span>
                      </div>
                    ) : null
                  )}

                  <div className="mt-3 flex justify-between gap-4 text-lg">
                    <span className="font-semibold text-slate-800">
                      Total
                    </span>
                    <span className="font-bold text-blue-700">
                      {formatKES(selectedSale.total_amount)}
                    </span>
                  </div>
                </div>

              </div>

              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
