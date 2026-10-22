
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Truck,
  Pencil,
  Power,
  X,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  UserRound,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/suppliers";

const emptyForm = {
  supplier_name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  tax_number: "",
  notes: "",
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ status, search });
      const response = await fetch(`${API_URL}?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load suppliers.");
      }

      setSuppliers(result.data);
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the suppliers API. Check that your backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setMessage("");
    setError("");
    setFormOpen(true);
  }

  function openEditForm(supplier) {
    setEditingId(supplier.id);
    setForm({
      supplier_name: supplier.supplier_name ?? "",
      contact_person: supplier.contact_person ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      tax_number: supplier.tax_number ?? "",
      notes: supplier.notes ?? "",
    });
    setMessage("");
    setError("");
    setFormOpen(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      supplier_name: form.supplier_name.trim(),
      contact_person: form.contact_person.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      tax_number: form.tax_number.trim(),
      notes: form.notes.trim(),
    };

    try {
      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save supplier.");
      }

      setFormOpen(false);
      setMessage(
        editingId
          ? "Supplier updated successfully."
          : "Supplier created successfully."
      );

      await loadSuppliers();
    } catch (err) {
      setError(err.message || "Could not save supplier.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(supplier) {
    const nextStatus = Number(supplier.is_active) === 1 ? 0 : 1;
    const action = nextStatus ? "reactivate" : "deactivate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${supplier.supplier_name}?`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/${supplier.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not update supplier status.");
      }

      setMessage(
        nextStatus
          ? "Supplier reactivated successfully."
          : "Supplier deactivated successfully."
      );

      await loadSuppliers();
    } catch (err) {
      setError(err.message || "Could not update supplier status.");
    }
  }

  const activeCount = suppliers.filter(
    (supplier) => Number(supplier.is_active) === 1
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Truck size={17} />
            <span>Supplier Management</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Suppliers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage supplier contacts and keep your purchasing records organized.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          <Plus size={18} />
          Add Supplier
        </button>
      </div>

      {message && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            <X size={17} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Suppliers in this view</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "—" : suppliers.length}
              </p>
            </div>
            <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
              <Truck size={24} />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Supplier records matching the current filters</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active suppliers in this view</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "—" : activeCount}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <UserRound size={24} />
            </div>
          </div>
        </div>
      </div>

      {formOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Supplier" : "Add New Supplier"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter the supplier's details below.
              </p>
            </div>
            <button
              onClick={() => setFormOpen(false)}
              aria-label="Close supplier form"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
            >
              <X size={19} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Supplier name <span className="text-red-500">*</span>
                <input
                  required
                  maxLength={150}
                  name="supplier_name"
                  value={form.supplier_name}
                  onChange={updateField}
                  placeholder="e.g. Nairobi Wholesale Supplies"
                  className={`${inputClass} mt-1.5`}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Contact person
                <input
                  maxLength={150}
                  name="contact_person"
                  value={form.contact_person}
                  onChange={updateField}
                  placeholder="Full name"
                  className={`${inputClass} mt-1.5`}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Phone number
                <input
                  maxLength={20}
                  name="phone"
                  value={form.phone}
                  onChange={updateField}
                  placeholder="07XX XXX XXX"
                  className={`${inputClass} mt-1.5`}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Email address
                <input
                  type="email"
                  maxLength={150}
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="supplier@example.com"
                  className={`${inputClass} mt-1.5`}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Tax number
                <input
                  maxLength={50}
                  name="tax_number"
                  value={form.tax_number}
                  onChange={updateField}
                  placeholder="Optional tax PIN"
                  className={`${inputClass} mt-1.5`}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Address
                <input
                  maxLength={255}
                  name="address"
                  value={form.address}
                  onChange={updateField}
                  placeholder="Town, street or building"
                  className={`${inputClass} mt-1.5`}
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea
                maxLength={500}
                rows={3}
                name="notes"
                value={form.notes}
                onChange={updateField}
                placeholder="Additional supplier information..."
                className={`${inputClass} mt-1.5`}
              />
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-11 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create Supplier"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Supplier directory</h3>
            <p className="mt-1 text-sm text-slate-500">
              Search, update, or deactivate supplier records.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row lg:w-[min(100%,42rem)]">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, contact, phone or email..."
                aria-label="Search suppliers"
                className={`${inputClass} mt-0 pl-10`}
              />
            </div>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter supplier status"
              className={`${inputClass} mt-0 sm:w-44`}
            >
              <option value="active">Active suppliers</option>
              <option value="inactive">Inactive suppliers</option>
              <option value="all">All suppliers</option>
            </select>

            <button
              type="button"
              onClick={loadSuppliers}
              disabled={loading}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 px-5 py-16 text-sm text-slate-500">
            <RefreshCw size={18} className="animate-spin" />
            Loading suppliers...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
              <Truck size={30} />
            </div>
            <h4 className="mt-4 font-semibold text-slate-900">
              {search.trim() || status !== "active" ? "No matching suppliers" : "No suppliers yet"}
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Try another search or status filter, or add a supplier to get started.
            </p>
            {!search.trim() && status === "active" && (
              <button
                type="button"
                onClick={openAddForm}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
              >
                <Plus size={17} />
                Add first supplier
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Supplier</th>
                    <th className="px-5 py-3 font-semibold">Contact details</th>
                    <th className="px-5 py-3 font-semibold">Tax number</th>
                    <th className="px-5 py-3 font-semibold">Added</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((supplier) => {
                    const isActive = Number(supplier.is_active) === 1;

                    return (
                      <tr key={supplier.id} className="transition hover:bg-orange-50/30">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {supplier.supplier_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            ID: {supplier.id}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1.5 text-slate-600">
                            {supplier.contact_person && (
                              <p className="flex items-center gap-2">
                                <UserRound size={14} />
                                {supplier.contact_person}
                              </p>
                            )}
                            {supplier.phone && (
                              <p className="flex items-center gap-2">
                                <Phone size={14} />
                                {supplier.phone}
                              </p>
                            )}
                            {supplier.email && (
                              <p className="flex items-center gap-2">
                                <Mail size={14} />
                                {supplier.email}
                              </p>
                            )}
                            {supplier.address && (
                              <p className="flex items-center gap-2">
                                <MapPin size={14} />
                                {supplier.address}
                              </p>
                            )}
                            {!supplier.contact_person &&
                              !supplier.phone &&
                              !supplier.email &&
                              !supplier.address && "—"}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {supplier.tax_number || "—"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(supplier.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditForm(supplier)}
                              title="Edit supplier"
                              aria-label={`Edit ${supplier.supplier_name}`}
                              className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => toggleStatus(supplier)}
                              title={isActive ? "Deactivate supplier" : "Reactivate supplier"}
                              aria-label={`${isActive ? "Deactivate" : "Reactivate"} ${supplier.supplier_name}`}
                              className={`grid size-9 place-items-center rounded-lg border ${
                                isActive
                                  ? "border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              <Power size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {suppliers.map((supplier) => {
                const isActive = Number(supplier.is_active) === 1;

                return (
                  <article
                    key={supplier.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="break-words font-semibold text-slate-900">
                          {supplier.supplier_name}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Supplier ID: {supplier.id}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      {supplier.contact_person && (
                        <p className="flex items-center gap-2">
                          <UserRound size={15} />
                          {supplier.contact_person}
                        </p>
                      )}
                      {supplier.phone && (
                        <p className="flex items-center gap-2">
                          <Phone size={15} />
                          {supplier.phone}
                        </p>
                      )}
                      {supplier.email && (
                        <p className="flex items-center gap-2 break-all">
                          <Mail size={15} />
                          {supplier.email}
                        </p>
                      )}
                      {supplier.address && (
                        <p className="flex items-center gap-2">
                          <MapPin size={15} />
                          {supplier.address}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        Added {formatDate(supplier.created_at)}
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                      <button
                        onClick={() => openEditForm(supplier)}
                        className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
                      <button
                        onClick={() => toggleStatus(supplier)}
                        className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium ${
                          isActive
                            ? "border-red-200 text-red-700 hover:bg-red-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        <Power size={15} />
                        {isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          Showing {loading ? "…" : suppliers.length} supplier
          {suppliers.length === 1 ? "" : "s"} in this view
        </div>
      </div>
      </div>
    </div>
  );
}
