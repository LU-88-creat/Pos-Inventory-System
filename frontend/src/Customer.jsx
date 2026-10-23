
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Users,
  Pencil,
  UserRoundX,
  X,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

const API = "http://localhost:5000/api/customers";

const emptyForm = {
  customer_name: "",
  phone: "",
  email: "",
  address: "",
};

export default function Customer() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadCustomers = useCallback(async (searchTerm = "") => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }

      const query = params.toString();
      const response = await fetch(
        `${API}${query ? `?${query}` : ""}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load customers."
        );
      }

      setCustomers(result.data || []);
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the customer API."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  function openAddModal() {
    setEditingCustomer(null);
    setForm(emptyForm);
    setNotice("");
    setError("");
    setModalOpen(true);
  }

  function openEditModal(customer) {
    setEditingCustomer(customer);
    setForm({
      customer_name: customer.customer_name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });
    setNotice("");
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      customer_name: form.customer_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
    };

    try {
      const isEditing = Boolean(editingCustomer);

      const response = await fetch(
        isEditing
          ? `${API}/${editingCustomer.id}`
          : API,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not save customer."
        );
      }

      setModalOpen(false);
      setEditingCustomer(null);
      setForm(emptyForm);
      setNotice(
        isEditing
          ? "Customer updated successfully."
          : "Customer added successfully."
      );

      await loadCustomers(search);
    } catch (err) {
      setError(err.message || "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(customer) {
    const confirmed = window.confirm(
      `Deactivate ${customer.customer_name}? They will be removed from the active customer list.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API}/${customer.id}/status`,
        { method: "PATCH" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Could not deactivate customer."
        );
      }

      setNotice("Customer deactivated successfully.");
      await loadCustomers(search);
    } catch (err) {
      setError(
        err.message || "Failed to deactivate customer."
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users size={17} />
              <span>Customer Management</span>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Customers
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your customer information and contact details.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>

        {/* Notifications */}
        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active customers
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loading ? "—" : customers.length}
                </p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-green-600">
                <Users size={24} />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {search.trim()
                ? "Matching customers"
                : "Customers returned by the API"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Customer records
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading ? "—" : customers.length}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Active records available for management
            </p>
          </div>
        </div>

        {/* Customer table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Customer directory
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search, update, or deactivate customer records.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-72">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      loadCustomers(search);
                    }
                  }}
                  placeholder="Search name, phone, email..."
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <button
                type="button"
                onClick={() => loadCustomers(search)}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Search
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
              <LoaderCircle
                size={30}
                className="animate-spin text-green-600"
              />
              <p className="text-sm">Loading customers...</p>
            </div>
          ) : error && customers.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-5 text-center">
              <AlertCircle size={32} className="text-red-400" />
              <p className="font-medium text-slate-800">
                Could not load customers
              </p>
              <button
                type="button"
                onClick={() => loadCustomers(search)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Try again
              </button>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                <Users size={30} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">
                {search.trim()
                  ? "No matching customers"
                  : "No active customers yet"}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {search.trim()
                  ? "Try another name, phone number, or email address."
                  : "Add your first customer to begin building your customer directory."}
              </p>

              {!search.trim() && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <Plus size={17} />
                  Add first customer
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Phone</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Address</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                            {customer.customer_name
                              ?.trim()
                              .charAt(0)
                              .toUpperCase() || "C"}
                          </div>
                          <div className="font-semibold text-slate-900">
                            {customer.customer_name}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <Phone size={15} className="text-slate-400" />
                          {customer.phone || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <Mail size={15} className="text-slate-400" />
                          {customer.email || "—"}
                        </span>
                      </td>

                      <td className="max-w-xs px-5 py-4 text-slate-600">
                        <span className="inline-flex items-start gap-2">
                          <MapPin
                            size={15}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />
                          <span className="break-words">
                            {customer.address || "—"}
                          </span>
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            title="Edit customer"
                            aria-label={`Edit ${customer.customer_name}`}
                            onClick={() => openEditModal(customer)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            title="Deactivate customer"
                            aria-label={`Deactivate ${customer.customer_name}`}
                            onClick={() => handleDeactivate(customer)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            <UserRoundX size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
            Showing {loading ? "…" : customers.length} active customer
            {customers.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Add / edit customer modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="customer-modal-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {editingCustomer ? "Edit customer" : "Add customer"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the customer's contact information.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close form"
                disabled={saving}
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="customer_name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Customer name <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer_name"
                  name="customer_name"
                  type="text"
                  required
                  maxLength={150}
                  value={form.customer_name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Phone number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    maxLength={20}
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="e.g. 0712345678"
                    className="min-h-11 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    maxLength={150}
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="min-h-11 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  maxLength={255}
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter customer address"
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={17} className="animate-spin" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingCustomer
                      ? "Save changes"
                      : "Create customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
