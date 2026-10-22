import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Search,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Boxes,
  History,
  LoaderCircle,
  Plus,
  Minus,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

function formatQuantity(value) {
  return Number(value ?? 0).toLocaleString("en-KE", {
    maximumFractionDigits: 3,
  });
}

export default function StockManagement() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stockAction, setStockAction] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stockNotes, setStockNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  async function loadStockData() {
    setLoading(true);
    setError("");

    try {
      const [productsResponse, movementsResponse] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/stock/movements?limit=100`),
      ]);

      const productsResult = await productsResponse.json();
      const movementsResult = await movementsResponse.json();

      if (!productsResponse.ok || productsResult.success === false) {
        throw new Error(
          productsResult.message || "Failed to load products."
        );
      }

      if (!movementsResponse.ok || movementsResult.success === false) {
        throw new Error(
          movementsResult.message || "Failed to load stock movements."
        );
      }

      const productRows = Array.isArray(productsResult)
        ? productsResult
        : productsResult.data;

      if (!Array.isArray(productRows)) {
        throw new Error("Unexpected products API response format.");
      }

      setProducts(productRows);
      setMovements(movementsResult.data ?? []);
    } catch (err) {
      setError(err.message || "Unable to connect to the stock API.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStockSubmit(event) {
    event.preventDefault();

    setFormError("");
    setFormSuccess("");

    if (!selectedProduct) {
      setFormError("Please select a product.");
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setFormError("Enter a quantity greater than zero.");
      return;
    }

    if (Number(quantity) !== Number(parsedQuantity.toFixed(3))) {
      setFormError("Quantity cannot have more than 3 decimal places.");
      return;
    }

    if (stockNotes.length > 255) {
      setFormError("Notes cannot exceed 255 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const endpoint =
        stockAction === "in" ? "/stock/in" : "/stock/out";

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: Number(selectedProduct),
          quantity: parsedQuantity,
          notes: stockNotes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Unable to record the stock movement."
        );
      }

      setFormSuccess(
        result.message ||
          `Stock ${stockAction === "in" ? "received" : "removed"} successfully.`
      );

      setSelectedProduct("");
      setQuantity("");
      setStockNotes("");

      await loadStockData();
      setStockAction(null);
    } catch (error) {
      setFormError(error.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadStockData();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter((product) =>
      [product.product_name, product.sku, product.barcode].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }, [products, search]);

  const lowStockCount = products.filter(
    (product) =>
      Number(product.stock_quantity) > 0 &&
      Number(product.stock_quantity) <= Number(product.reorder_level ?? 5)
  ).length;

  const outOfStockCount = products.filter(
    (product) => Number(product.stock_quantity) <= 0
  ).length;

  const totalUnits = products.reduce(
    (total, product) => total + Number(product.stock_quantity ?? 0),
    0
  );

  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Boxes size={17} />
              <span>Inventory Management</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Stock Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor inventory, record stock movements, and track stock levels.
            </p>
          </div>

          
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStockAction("in");
                setSelectedProduct("");
                setQuantity("");
                setStockNotes("");
                setFormError("");
                setFormSuccess("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <Plus size={18} />
              Stock In
            </button>

            <button
              type="button"
              onClick={() => {
                setStockAction("out");
                setSelectedProduct("");
                setQuantity("");
                setStockNotes("");
                setFormError("");
                setFormSuccess("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <Minus size={18} />
              Stock Out
            </button>
          </div>

          
          {stockAction && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {stockAction === "in" ? "Receive Stock" : "Remove Stock"}
                </h2>

                <button
                  type="button"
                  onClick={() => {
                    setStockAction(null);
                    setFormError("");
                    setFormSuccess("");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleStockSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Product
                  </label>

                  <select
                    value={selectedProduct}
                    onChange={(event) => setSelectedProduct(event.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Select a product</option>

                    {products
                      .filter((product) => product.is_active !== 0 && product.is_active !== false)
                      .map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.product_name} ({product.sku})
                        </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Quantity
                  </label>

                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    required
                    placeholder="Enter quantity"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Notes (optional)
                  </label>

                  <textarea
                    value={stockNotes}
                    onChange={(event) => setStockNotes(event.target.value)}
                    maxLength={255}
                    rows={3}
                    placeholder={
                      stockAction === "in"
                        ? "e.g. New supplier delivery"
                        : "e.g. Damaged or missing items"
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div> 

                {formError && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {formError}
                  </p>
                )}

                {formSuccess && (
                  <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    {formSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                    stockAction === "in"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {submitting
                    ? "Saving..."
                    : stockAction === "in"
                      ? "Confirm Stock In"
                      : "Confirm Stock Out"}
                </button>
              </form>
            </div>
          )}



          <button
            type="button"
            onClick={loadStockData}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertTriangle size={19} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Unable to load stock data</p>
              <p className="mt-1 break-words">{error}</p>
              <p className="mt-1 text-xs">
                Check that your Express server is running on port 5000.
              </p>
            </div>
          </div>
        )}

        <section
          aria-label="Stock summary"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <SummaryCard
            title="Active products"
            value={products.length}
            icon={<Package size={23} />}
            loading={loading}
          />
          <SummaryCard
            title="Total units in stock"
            value={formatQuantity(totalUnits)}
            icon={<Boxes size={23} />}
            loading={loading}
          />
          <SummaryCard
            title="Low stock"
            value={lowStockCount}
            icon={<AlertTriangle size={23} />}
            loading={loading}
            iconClassName="bg-amber-50 text-amber-700"
          />
          <SummaryCard
            title="Out of stock"
            value={outOfStockCount}
            icon={<Package size={23} />}
            loading={loading}
            iconClassName="bg-red-50 text-red-600"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Current inventory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Product quantities and reorder levels from your database.
              </p>
            </div>

            <div className="relative min-w-0 sm:w-72">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, SKU or barcode..."
                aria-label="Search inventory"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  {[
                    "Product",
                    "SKU",
                    "Unit",
                    "Current stock",
                    "Reorder level",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-5 py-3 font-semibold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-14 text-center text-slate-500"
                    >
                      <LoaderCircle
                        size={24}
                        className="mx-auto mb-2 animate-spin text-orange-600"
                      />
                      Loading stock data...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-14 text-center text-sm text-slate-500"
                    >
                      {search
                        ? "No products match your search."
                        : "No products found."}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const stock = Number(product.stock_quantity ?? 0);
                    const reorder = Number(product.reorder_level ?? 5);
                    const status =
                      stock <= 0
                        ? "Out of stock"
                        : stock <= reorder
                          ? "Low stock"
                          : "In stock";
                    const statusClassName =
                      stock <= 0
                        ? "bg-red-100 text-red-700"
                        : stock <= reorder
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700";

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {product.product_name}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {product.sku || "—"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {product.unit_of_measure || "piece"}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {formatQuantity(stock)}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {formatQuantity(reorder)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName}`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
            Showing {loading ? "…" : filteredProducts.length} of{" "}
            {products.length} products
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <History size={19} className="text-slate-500" />
              Recent stock movements
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Stock received, stock removed, adjustments, and completed sales.
            </p>
          </div>

          {loading ? (
            <LoadingMessage />
          ) : movements.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              No stock movements recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {[
                      "Date",
                      "Product",
                      "Movement",
                      "Quantity",
                      "Previous",
                      "New stock",
                      "Reference",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-5 py-3 font-semibold"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((movement) => {
                    const incoming = [
                      "stock_in",
                      "adjustment_in",
                    ].includes(movement.movement_type);

                    return (
                      <tr
                        key={movement.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {movement.created_at
                            ? new Date(movement.created_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {movement.product_name}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 font-semibold ${
                              incoming ? "text-green-700" : "text-orange-700"
                            }`}
                          >
                            {incoming ? (
                              <ArrowDownToLine size={15} />
                            ) : (
                              <ArrowUpFromLine size={15} />
                            )}
                            {String(movement.movement_type).replaceAll(
                              "_",
                              " "
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {formatQuantity(movement.quantity)}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {formatQuantity(movement.previous_stock)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {formatQuantity(movement.new_stock)}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {movement.reference_type || "—"}
                          {movement.reference_id
                            ? ` #${movement.reference_id}`
                            : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  loading,
  iconClassName = "bg-orange-50 text-orange-600",
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? "—" : value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${iconClassName}`}>{icon}</div>
      </div>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-slate-500">
      <LoaderCircle size={28} className="animate-spin text-orange-600" />
      <p className="text-sm">Loading stock movements...</p>
    </div>
  );
}
