
import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Search,
  AlertCircle,
  Wallet,
  Download,
  ReceiptText,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

function money(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SupplierPaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/purchases/payments/history`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load supplier payment history."
        );
      }

      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch (err) {
      setError(err.message || "Unable to load payment history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const filteredPayments = payments.filter((payment) => {
    const searchText = [
      payment.purchase_number,
      payment.supplier_name,
      payment.payment_method,
      payment.reference_number,
      payment.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchText.includes(search.trim().toLowerCase());
  });

  const totalPayments = filteredPayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );

  function exportPaymentsToCSV() {
    const headers = [
      "Payment Date",
      "Purchase Number",
      "Supplier",
      "Amount (KES)",
      "Payment Method",
      "Reference",
      "Notes",
    ];

    const escapeCSV = (value) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = filteredPayments.map((payment) => [
      payment.payment_date || "",
      payment.purchase_number || `Purchase #${payment.purchase_id}`,
      payment.supplier_name || "Unknown supplier",
      Number(payment.amount || 0).toFixed(2),
      payment.payment_method || "",
      payment.reference_number || "",
      payment.notes || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "supplier-payment-history.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }
  
  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ReceiptText size={17} />
            <span>Supplier Management</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Supplier Payment History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review payments recorded against supplier purchases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadPayments}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportPaymentsToCSV}
            disabled={loading || filteredPayments.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-50 p-3 text-red-700">
              <Wallet size={22} />
            </div>
            <div>
              <p className="text-sm text-slate-500">
                Total in filtered results
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {money(totalPayments)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Payment transactions</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {filteredPayments.length}
              </p>
            </div>
            <div className="rounded-xl bg-red-50 p-3 text-red-700">
              <ReceiptText size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="relative max-w-lg">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search purchase, supplier, method or reference..."
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {error && (
          <div className="m-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading supplier payments...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Payment date</th>
                  <th className="px-5 py-3">Purchase number</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => (
                  <tr key={payment.payment_id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {payment.purchase_number || `Purchase #${payment.purchase_id}`}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {payment.supplier_name || "Unknown supplier"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-900">
                      {money(payment.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                        {String(payment.payment_method || "other").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {payment.reference_number || "—"}
                    </td>
                    <td className="max-w-xs whitespace-normal px-5 py-4 text-slate-600">
                      {payment.notes || "—"}
                    </td>
                  </tr>
                ))}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      {search
                        ? "No payments match your search."
                        : "No supplier payments have been recorded yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
