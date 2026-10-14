
import { useCallback, useEffect, useState } from "react";
import {
  Search, Plus, Pencil, Trash2, RefreshCw, Package, Tags,
  X, AlertCircle, LoaderCircle, Boxes,
} from "lucide-react";

const API = "http://localhost:5000/api/products";

const emptyForm = {
  product_name: "",
  sku: "",
  barcode: "",
  category_id: "",
  unit_of_measure: "piece",
  cost_price: "",
  selling_price: "",
  stock_quantity: "0",
  reorder_level: "5",
};

const units = [
  "piece", "kg", "g", "litre", "ml",
  "pack", "bottle", "box", "dozen",
];

const money = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function Product() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const request = useCallback(async (url, options = {}) => {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Request failed.");
    }

    return result;
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const result = await request(`${API}/categories`);
      setCategories(result.data);
    } catch (err) {
      setError(err.message);
    }
  }, [request]);

  async function handleCreateCategory(event) {
    event.preventDefault();
    setSavingCategory(true);
    setCategoryError("");

    try {
      const result = await request(`${API}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_name: categoryName.trim() }),
      });

      await loadCategories();
      setCategoryId(String(result.data.id));
      setCategoryName("");
      setCategoryModal(false);
      setNotice(result.message);
    } catch (err) {
      setCategoryError(err.message);
    } finally {
      setSavingCategory(false);
    }
  }

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (categoryId) params.set("categoryId", categoryId);

      const query = params.toString();
      const result = await request(
        `${API}${query ? `?${query}` : ""}`
      );

      setProducts(result.data);
    } catch (err) {
      setError(
        `${err.message} Make sure your backend is running on port 5000.`
      );
    } finally {
      setLoading(false);
    }
  }, [request, search, categoryId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function openAdd() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      category_id: categories[0] ? String(categories[0].id) : "",
    });
    setError("");
    setNotice("");
    setModal(true);
  }

  function openEdit(product) {
    setEditingId(product.id);
    setForm({
      product_name: product.product_name ?? "",
      sku: product.sku ?? "",
      barcode: product.barcode ?? "",
      category_id: String(product.category_id),
      unit_of_measure: product.unit_of_measure ?? "piece",
      cost_price: String(product.cost_price ?? ""),
      selling_price: String(product.selling_price ?? ""),
      stock_quantity: String(product.stock_quantity ?? 0),
      reorder_level: String(product.reorder_level ?? 5),
    });
    setError("");
    setNotice("");
    setModal(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...form,
      product_name: form.product_name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      category_id: Number(form.category_id),
      cost_price: Number(form.cost_price),
      selling_price: Number(form.selling_price),
      stock_quantity: Number(form.stock_quantity),
      reorder_level: Number(form.reorder_level),
    };

    try {
      const result = await request(
        editingId ? `${API}/${editingId}` : API,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      setModal(false);
      setNotice(result.message);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(product) {
    if (!window.confirm(
      `Remove "${product.product_name}" from the active product list? This keeps its record in the database.`
    )) return;

    setError("");
    setNotice("");

    try {
      const result = await request(`${API}/${product.id}`, {
        method: "DELETE",
      });

      setNotice(result.message);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  const lowStock = products.filter(
    (p) => Number(p.stock_quantity) <= Number(p.reorder_level)
  ).length;

  const inputClass =
    "mt-1.5 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  return (
    <section className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-700">
            Inventory management
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Products
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your products, prices and stock levels.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => {
              setCategoryName("");
              setCategoryError("");
              setCategoryModal(true);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Tags size={18} /> Add category
          </button>
          <button
            onClick={openAdd}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
          >
            <Plus size={18} /> Add product
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <p className="min-w-0 flex-1 break-words">{error}</p>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={18} />
          </button>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Dismiss message">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:max-w-2xl">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700">
            <Package size={23} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Active products</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {loading ? "—" : products.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Boxes size={23} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Products at reorder level</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {loading ? "—" : lowStock}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product, SKU or barcode..."
              aria-label="Search products"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              aria-label="Filter by category"
              className="min-h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:min-w-44"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.category_name}</option>
              ))}
            </select>

            <button
              onClick={() => {
                loadCategories();
                loadProducts();
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-900">Product inventory</h2>
          <span className="text-xs text-slate-500">
            {products.length} product{products.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                {["Product", "SKU / Barcode", "Category", "Cost", "Selling price", "Stock", "Status", "Actions"].map((label) => (
                  <th key={label} className="whitespace-nowrap px-4 py-3 font-semibold">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-slate-500">
                    <LoaderCircle className="mx-auto mb-2 animate-spin" />
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <Package size={30} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-700">No products found</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try another search or add your first product.
                    </p>
                  </td>
                </tr>
              ) : products.map((p) => {
                const isLow = Number(p.stock_quantity) <= Number(p.reorder_level);

                return (
                  <tr key={p.id} className="transition hover:bg-orange-50/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{p.product_name}</div>
                      <div className="mt-1 text-xs text-slate-400">ID: {p.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{p.sku}</div>
                      <div className="mt-1 text-xs text-slate-400">{p.barcode || "No barcode"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.category_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{money(p.cost_price)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{money(p.selling_price)}</td>
                    <td className="px-4 py-3">
                      <span className={isLow ? "font-semibold text-red-600" : "font-medium text-slate-700"}>
                        {Number(p.stock_quantity).toLocaleString("en-KE")} {p.unit_of_measure}
                      </span>
                      {isLow && <p className="mt-1 text-[11px] text-red-500">Reorder level reached</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          aria-label={`Edit ${p.product_name}`}
                          title="Edit product"
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => deactivate(p)}
                          aria-label={`Remove ${p.product_name} from active products`}
                          title="Remove product"
                          className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Stock and prices are loaded from your database. Table can scroll horizontally on smaller screens.
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
              <div>
                <h2 id="product-modal-title" className="text-lg font-bold text-slate-900">
                  {editingId ? "Edit product" : "Add new product"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the product information below.
                </p>
              </div>
              <button
                onClick={() => setModal(false)}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Product name *
                  <input className={inputClass} name="product_name" value={form.product_name} onChange={handleChange} maxLength={150} required />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  SKU *
                  <input className={inputClass} name="sku" value={form.sku} onChange={handleChange} maxLength={50} required />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Barcode
                  <input className={inputClass} name="barcode" value={form.barcode} onChange={handleChange} maxLength={100} />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Category *
                  <select className={inputClass} name="category_id" value={form.category_id} onChange={handleChange} required>
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Unit of measure *
                  <select className={inputClass} name="unit_of_measure" value={form.unit_of_measure} onChange={handleChange} required>
                    {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </label>

                {[
                  ["cost_price", "Cost price (KES)"],
                  ["selling_price", "Selling price (KES)"],
                  ["stock_quantity", "Opening stock"],
                  ["reorder_level", "Reorder level"],
                ].map(([name, label]) => (
                  <label key={name} className="text-sm font-medium text-slate-700">
                    {label} *
                    <input
                      className={inputClass}
                      type="number"
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      min="0"
                      step={name.includes("price") ? "0.01" : "0.001"}
                      required
                    />
                  </label>
                ))}
              </div>

              {error && (
                <p role="alert" className="mx-5 mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:mx-6">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || categories.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <LoaderCircle size={16} className="animate-spin" />}
                  {saving ? "Saving..." : editingId ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categoryModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingCategory) {
              setCategoryModal(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            className="my-auto w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <h2 id="category-modal-title" className="text-lg font-bold text-slate-900">
                  Add category
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a category for your products.
                </p>
              </div>
              <button
                onClick={() => setCategoryModal(false)}
                disabled={savingCategory}
                aria-label="Close category form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory}>
              <div className="p-5">
                <label className="text-sm font-medium text-slate-700" htmlFor="category-name">
                  Category name *
                  <input
                    id="category-name"
                    className={inputClass}
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    maxLength={100}
                    autoFocus
                    required
                  />
                </label>
                {categoryError && (
                  <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {categoryError}
                  </p>
                )}
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCategoryModal(false)}
                  disabled={savingCategory}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory || !categoryName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCategory && <LoaderCircle size={16} className="animate-spin" />}
                  {savingCategory ? "Saving..." : "Create category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
