
import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  RefreshCw,
  Search,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  X,
  Truck,
  PackageCheck,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

const money = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(value) || 0);

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
};

const statusStyles = {
  draft: "bg-slate-100 text-slate-700",
  ordered: "bg-blue-100 text-blue-700",
  partially_received: "bg-amber-100 text-amber-800",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100";

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orderingPurchase, setOrderingPurchase] = useState(null);
  const [receivingPurchase, setReceivingPurchase] = useState(null);
  const [receiveItems, setReceiveItems] = useState([]);

  const [paymentPurchase, setPaymentPurchase] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);


  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [purchaseNumber, setPurchaseNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { product_id: "", quantity: "1", unit_cost: "0" },
  ]);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);

      const query = params.toString();
      const response = await fetch(
        `${API_URL}/purchases${query ? `?${query}` : ""}`
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load purchases.");
      }

      setPurchases(result.data || []);
    } catch (err) {
      setError(err.message || "Could not connect to the Purchases API.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  const loadFormOptions = useCallback(async () => {
    try {
      const [supplierResponse, productResponse] = await Promise.all([
        fetch(`${API_URL}/suppliers`),
        fetch(`${API_URL}/products`),
      ]);

      const supplierResult = await supplierResponse.json();
      const productResult = await productResponse.json();

      if (!supplierResponse.ok || !supplierResult.success) {
        throw new Error(
          supplierResult.message || "Failed to load suppliers."
        );
      }

      if (!productResponse.ok || !productResult.success) {
        throw new Error(
          productResult.message || "Failed to load products."
        );
      }

      const supplierRows = Array.isArray(supplierResult.data)
        ? supplierResult.data
        : [];
      const productRows = Array.isArray(productResult.data)
        ? productResult.data
        : [];

      setSuppliers(
        supplierRows.filter((supplier) => Number(supplier.is_active) === 1)
      );
      setProducts(
        productRows.filter((product) => Number(product.is_active) === 1)
      );
    } catch (err) {
      setFormError(
        `${err.message} Check the supplier and product API response formats.`
      );
    }
  }, []);
  
  async function openPaymentForm(purchase) {
    setPaymentError("");
    setError("");
    setSuccess("");
    setPaymentPurchase(purchase);
    setPaymentHistory([]);
    setPaymentAmount("");
    setPaymentMethod("mpesa");
    setPaymentReference("");
    setPaymentNotes("");
    setPaymentHistoryLoading(true);

  try {
    const response = await fetch(
      `${API_URL}/purchases/${purchase.id}/payments`
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to load payment history."
      );
    }

    setPaymentHistory(
      Array.isArray(result.data) ? result.data : []
    );
  } catch (err) {
    setPaymentError(
      err.message || "Could not load payment history."
    );
  } finally {
    setPaymentHistoryLoading(false);
  }
 }

 
 async function handleRecordPayment(event) {
  event.preventDefault();
  setPaymentError("");
  setSuccess("");

  if (!paymentPurchase) {
    setPaymentError("Select a purchase before recording payment.");
    return;
  }

  const amount = Number(paymentAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    setPaymentError("Enter a payment amount greater than zero.");
    return;
  }

  if (
    amount >
    Number(paymentPurchase.total_amount) -
      Number(paymentPurchase.amount_paid || 0) +
      0.001
  ) {
    setPaymentError("Payment exceeds the outstanding balance.");
    return;
  }

  setPaymentLoading(true);

  try {
    const response = await fetch(
      `${API_URL}/purchases/${paymentPurchase.id}/payments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          payment_method: paymentMethod,
          reference_number: paymentReference.trim() || null,
          notes: paymentNotes.trim() || null,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to record supplier payment."
      );
    }

    setSuccess(
      `Payment of ${money(result.data.amount)} recorded successfully.`
    );

    setPaymentAmount("");
    setPaymentReference("");
    setPaymentNotes("");

    await loadPurchases();

    const historyResponse = await fetch(
      `${API_URL}/purchases/${paymentPurchase.id}/payments`
    );
    const historyResult = await historyResponse.json();

    if (historyResponse.ok && historyResult.success) {
      setPaymentHistory(
        Array.isArray(historyResult.data) ? historyResult.data : []
      );
    }

    setPaymentPurchase((current) =>
      current
        ? {
            ...current,
            amount_paid: result.data.amount_paid,
            payment_status: result.data.payment_status,
          }
        : current
    );
  } catch (err) {
    setPaymentError(
      err.message || "Could not record supplier payment."
    );
  } finally {
    setPaymentLoading(false);
  }
 }



  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  useEffect(() => {
    loadFormOptions();
  }, [loadFormOptions]);

  function resetForm() {
    setPurchaseNumber("");
    setSupplierId("");
    setPurchaseDate(today());
    setExpectedDate("");
    setNotes("");
    setItems([{ product_id: "", quantity: "1", unit_cost: "0" }]);
    setFormError("");
  }

  function openPurchaseForm() {
    resetForm();
    setSuccess("");
    setShowForm(true);
  }

  function closePurchaseForm() {
    if (saving) return;
    setShowForm(false);
    resetForm();
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { product_id: "", quantity: "1", unit_cost: "0" },
    ]);
  }

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function removeItem(index) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function selectProduct(index, productId) {
    const product = products.find(
      (entry) => String(entry.id) === String(productId)
    );

    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              product_id: productId,
              unit_cost:
                product && product.cost_price != null
                  ? String(product.cost_price)
                  : item.unit_cost,
            }
          : item
      )
    );
  }

  const subtotal = items.reduce((total, item) => {
    return total + Number(item.quantity || 0) * Number(item.unit_cost || 0);
  }, 0);

  async function handleCreatePurchase(event) {
    event.preventDefault();
    setFormError("");
    setSuccess("");

    if (!purchaseNumber.trim()) {
      setFormError("Enter a purchase number.");
      return;
    }

    if (!supplierId) {
      setFormError("Select a supplier.");
      return;
    }

    if (!purchaseDate) {
      setFormError("Select a purchase date.");
      return;
    }

    if (expectedDate && expectedDate < purchaseDate) {
      setFormError(
        "Expected delivery date cannot be earlier than purchase date."
      );
      return;
    }

    if (items.length === 0) {
      setFormError("Add at least one product.");
      return;
    }

    for (const item of items) {
      if (
        !item.product_id ||
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0 ||
        !Number.isFinite(Number(item.unit_cost)) ||
        Number(item.unit_cost) < 0
      ) {
        setFormError(
          "Select a product and enter a positive quantity and non-negative unit cost for every item."
        );
        return;
      }
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchase_number: purchaseNumber.trim(),
          supplier_id: Number(supplierId),
          purchase_date: purchaseDate,
          expected_date: expectedDate || null,
          notes: notes.trim() || null,
          items: items.map((item) => ({
            product_id: Number(item.product_id),
            quantity: Number(item.quantity),
            unit_cost: Number(item.unit_cost),
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to create purchase.");
      }

      setSuccess("Draft purchase created successfully.");
      resetForm();
      setShowForm(false);
      await loadPurchases();
    } catch (err) {
      setFormError(err.message || "Failed to create purchase.");
    } finally {
      setSaving(false);
    }
  }

  
  function openOrderForm(purchase) {
    setFormError("");
    setSuccess("");
    setOrderingPurchase(purchase);
  }

  async function handleOrderPurchase(event) {
    event.preventDefault();
    if (!orderingPurchase) return;
    setFormError("");
    setSuccess("");
    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/purchases/${orderingPurchase.id}/order`,
        { method: "PATCH" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to order purchase.");
      }

      setSuccess("Purchase ordered successfully.");
      setOrderingPurchase(null);
      await loadPurchases();
    } catch (err) {
      setFormError(err.message || "Failed to order purchase.");
    } finally {
      setSaving(false);
    }
  }
  
  async function openReceiveForm(purchaseId) {
    setError("");
    setSuccess("");
    setFormError("");

    try {
      const response = await fetch(
        `${API_URL}/purchases/${purchaseId}`
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load purchase details.");
      }

      const purchase = result.data;

      if (!["ordered", "partially_received"].includes(purchase.status)) {
        throw new Error("Only ordered or partially received purchases can receive goods.");
      }

      setReceivingPurchase(purchase);
      setReceiveItems(
        (purchase.items || [])
          .filter(
            (item) =>
              Number(item.quantity) > Number(item.received_quantity)
          )
          .map((item) => ({
            purchase_item_id: item.id,
            product_name: item.product_name,
            ordered_quantity: Number(item.quantity),
            received_quantity: Number(item.received_quantity),
            quantity: "",
          }))
      );
    } catch (err) {
      setError(err.message || "Failed to open receiving form.");
    }
  }

  async function handleReceivePurchase(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setFormError("");

    if (!receivingPurchase) return;

    const itemsToReceive = receiveItems
      .filter((item) => item.quantity !== "")
      .map((item) => ({
        purchase_item_id: item.purchase_item_id,
        quantity: Number(item.quantity),
      }));

    if (itemsToReceive.length === 0) {
      setFormError("Enter a quantity for at least one item.");
      return;
    }

    if (
      itemsToReceive.some(
        (item) => !Number.isFinite(item.quantity) || item.quantity <= 0
      )
    ) {
      setFormError("Received quantities must be greater than zero.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/purchases/${receivingPurchase.id}/receive`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: itemsToReceive }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to receive goods.");
      }

      setSuccess("Goods received successfully. Inventory has been updated.");
      setReceivingPurchase(null);
      setReceiveItems([]);
      await loadPurchases();
    } catch (err) {
      setFormError(err.message || "Failed to receive goods.");
    } finally {
      setSaving(false);
    }
  }



  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ClipboardList size={17} />
            <span>Purchase Management</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Purchases
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage supplier orders and incoming stock.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap">
          <button
            type="button"
            onClick={loadPurchases}
            disabled={loading}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openPurchaseForm}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            <Plus size={18} />
            New purchase
          </button>
        </div>
      </div>

      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      {orderingPurchase && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setOrderingPurchase(null);
              setFormError("");
            }
          }}
        >
          <form
            onSubmit={handleOrderPurchase}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-purchase-title"
            className="w-full rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 id="order-purchase-title" className="text-lg font-bold text-slate-900">
                  Order purchase
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Confirm order {orderingPurchase.purchase_number}.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close order confirmation"
                disabled={saving}
                onClick={() => {
                  setOrderingPurchase(null);
                  setFormError("");
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              {formError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <p className="text-sm text-slate-600">
                Ordering this purchase will update its status and allow goods to be received.
              </p>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setOrderingPurchase(null);
                    setFormError("");
                  }}
                  className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Ordering..." : "Confirm order"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {paymentPurchase && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !paymentLoading) {
              setPaymentPurchase(null);
              setPaymentHistory([]);
              setPaymentError("");
            }
          }}
        >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-purchase-title"
          className="max-h-[92vh] w-full space-y-5 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-3xl sm:rounded-2xl sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="payment-purchase-title" className="text-lg font-bold text-slate-900">
                Record Supplier Payment
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Purchase: {paymentPurchase.purchase_number}
              </p>
            </div>

            <button
                type="button"
                onClick={() => {
                    setPaymentPurchase(null);
                    setPaymentHistory([]);
                    setPaymentError("");
                }}
                disabled={paymentLoading}
                className="self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
                Close
            </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Purchase total</p>
                <p className="mt-1 font-bold text-slate-900">
                  {money(paymentPurchase.total_amount)}
                </p>
            </div>

            <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-700">Amount paid</p>
                <p className="mt-1 font-bold text-green-800">
                   {money(paymentPurchase.amount_paid)}
                </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-sm text-amber-700">Outstanding balance</p>
                <p className="mt-1 font-bold text-amber-800">
                  {money(
                    Math.max(
                      0,
                      Number(paymentPurchase.total_amount) -
                        Number(paymentPurchase.amount_paid || 0)
                    )
                  )}
                </p>
            </div>
        </div>

        {paymentError && (
            <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {paymentError}
            </div>
        )}

        <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Payment amount (KES) *
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={Math.max(
                    0,
                    Number(paymentPurchase.total_amount) -
                      Number(paymentPurchase.amount_paid || 0)
                  )}
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Payment method *
                <select
                   className={inputClass}
                   value={paymentMethod}
                   onChange={(event) => setPaymentMethod(event.target.value)}
                   required
                >
                   <option value="cash">Cash</option>
                   <option value="mpesa">M-Pesa</option>
                   <option value="bank_transfer">Bank transfer</option>
                   <option value="cheque">Cheque</option>
                   <option value="other">Other</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Reference number
                <input
                   className={inputClass}
                   value={paymentReference}
                   onChange={(event) => setPaymentReference(event.target.value)}
                   maxLength={100}
                   placeholder="M-Pesa code or transaction reference"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Notes
                <input
                   className={inputClass}
                   value={paymentNotes}
                   onChange={(event) => setPaymentNotes(event.target.value)}
                   maxLength={500}
                   placeholder="Optional payment notes"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={paymentLoading}
              className="rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {paymentLoading ? "Recording payment..." : "Save Payment"}
            </button>
        </form>

        <div className="border-t border-slate-200 pt-4">
           <h3 className="font-semibold text-slate-900">Payment History</h3>

           {paymentHistoryLoading ? (
              <p className="mt-3 text-sm text-slate-500">
                Loading payment history...
              </p>
            ) : paymentHistory.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No payments recorded for this purchase.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                       <th className="px-3 py-3">Date</th>
                       <th className="px-3 py-3">Method</th>
                       <th className="px-3 py-3">Reference</th>
                       <th className="px-3 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-3 py-3">
                           {payment.payment_date
                             ? new Date(payment.payment_date).toLocaleString()
                             : "—"}
                        </td>
                        <td className="px-3 py-3">
                           {String(payment.payment_method || "").replaceAll("_", " ")}
                        </td>
                        <td className="px-3 py-3">
                           {payment.reference_number || "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                           {money(payment.amount)}
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
          </div>
         )}
        </div>
        </div>
        </div>
      )}

      {receivingPurchase && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setReceivingPurchase(null);
              setReceiveItems([]);
              setFormError("");
            }
          }}
        >
        <form
            onSubmit={handleReceivePurchase}
            role="dialog"
            aria-modal="true"
            aria-labelledby="receive-purchase-title"
            className="max-h-[92vh] w-full space-y-5 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-6"
        >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="receive-purchase-title" className="text-lg font-bold text-slate-900">
                    Receive Goods
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Purchase: {receivingPurchase.purchase_number}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close receive goods form"
                disabled={saving}
                onClick={() => {
                  setReceivingPurchase(null);
                  setReceiveItems([]);
                  setFormError("");
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {formError}
                </div>
            )}

            {receiveItems.length === 0 ? (
                <p className="text-sm text-slate-600">
                    No outstanding items remain on this purchase.
                </p>
            ) : (
                <div className="space-y-3">
                    {receiveItems.map((item, index) => {
                        const outstanding =
                            item.ordered_quantity - item.received_quantity;

                    return (
                        <div
                            key={item.purchase_item_id}
                            className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2"
                        >
                            <div>
                                <p className="font-semibold text-slate-800">
                                    {item.product_name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Ordered: {item.ordered_quantity} | Already received:{" "}
                                    {item.received_quantity} | Outstanding: {outstanding}
                                </p>
                            </div>

                            <label className="space-y-1 text-sm font-medium text-slate-700">
                                Quantity received
                                <input
                                    className={inputClass}
                                    type="number"
                                    min="0.001"
                                    max={outstanding}
                                    step="0.001"
                                    value={item.quantity}
                                    onChange={(event) =>
                                        setReceiveItems((current) =>
                                         current.map((entry, entryIndex) =>
                                          entryIndex === index
                                            ? { ...entry, quantity: event.target.value }
                                            : entry
                                         )
                                        )
                                    }
                                    placeholder="Enter quantity"
                                />
                            </label>
                        </div>
                    );
                })}
            </div>
        )}

        <div className="flex flex-wrap gap-3">
            <button
                type="submit"
                disabled={saving || receiveItems.length === 0}
                className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {saving ? "Receiving..." : "Confirm Receipt"}
            </button>

            <button
                type="button"
                disabled={saving}
                onClick={() => {
                    setReceivingPurchase(null);
                    setReceiveItems([]);
                    setFormError("");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
                Cancel
            </button>
        </div>
        </form>
        </div>
       )}


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total purchases shown</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {purchases.length}
              </p>
            </div>
            <div className="rounded-xl bg-green-50 p-3 text-green-600">
              <ClipboardList size={23} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Awaiting delivery</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {
                  purchases.filter(
                    (purchase) =>
                      purchase.status === "ordered" ||
                      purchase.status === "partially_received"
                  ).length
                }
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Truck size={23} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Received purchases</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {purchases.filter((purchase) => purchase.status === "received").length}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <PackageCheck size={23} />
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePurchaseForm();
          }}
        >
        <form
          onSubmit={handleCreatePurchase}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-purchase-title"
          className="max-h-[92vh] w-full space-y-5 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-5xl sm:rounded-2xl sm:p-6"
        >
          <div className="sticky top-0 z-10 -mx-5 -mt-5 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:-mx-6 sm:-mt-6 sm:px-6">
            <div>
              <h2 id="create-purchase-title" className="text-lg font-bold text-slate-900">
                Create draft purchase
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Saving a draft does not change product stock.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close purchase form"
              disabled={saving}
              onClick={closePurchaseForm}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Purchase number *
              <input
                className={inputClass}
                value={purchaseNumber}
                onChange={(event) => setPurchaseNumber(event.target.value)}
                maxLength={50}
                placeholder="e.g. PO-2026-001"
                required
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Supplier *
              <select
                className={inputClass}
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                required
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.supplier_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Purchase date *
              <input
                className={inputClass}
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
                required
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Expected delivery
              <input
                className={inputClass}
                type="date"
                min={purchaseDate}
                value={expectedDate}
                onChange={(event) => setExpectedDate(event.target.value)}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-800">Purchase items</h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 rounded-lg border border-green-700 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
              >
                <Plus size={15} />
                Add product
              </button>
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[minmax(180px,2fr)_1fr_1fr_1fr_auto] md:items-end"
              >
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Product *
                  <select
                    className={inputClass}
                    value={item.product_id}
                    onChange={(event) =>
                      selectProduct(index, event.target.value)
                    }
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.product_name} {product.sku ? `(${product.sku})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Quantity *
                  <input
                    className={inputClass}
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, "quantity", event.target.value)
                    }
                    required
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Unit cost (KES) *
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_cost}
                    onChange={(event) =>
                      updateItem(index, "unit_cost", event.target.value)
                    }
                    required
                  />
                </label>

                <div className="space-y-1.5 text-sm">
                  <p className="font-medium text-slate-700">Line total</p>
                  <p className="rounded-lg bg-slate-50 px-3 py-2.5 font-semibold text-slate-800">
                    {money(Number(item.quantity || 0) * Number(item.unit_cost || 0))}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  title="Remove product"
                  aria-label={`Remove product row ${index + 1}`}
                  className="grid size-10 place-items-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>

          <label className="block max-w-2xl space-y-1.5 text-sm font-medium text-slate-700">
            Notes
            <textarea
              className={inputClass}
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes about this purchase"
            />
          </label>

          <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Subtotal / total</p>
              <p className="text-2xl font-bold text-slate-900">
                {money(subtotal)}
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                disabled={saving}
                onClick={closePurchaseForm}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || suppliers.length === 0 || products.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={17} />
                {saving ? "Saving purchase..." : "Save draft purchase"}
              </button>
            </div>
          </div>

          {(suppliers.length === 0 || products.length === 0) && (
            <p className="text-sm text-amber-700">
              An active supplier and active product must be available before
              you can save a purchase. Check the supplier and product APIs if
              the dropdowns are empty.
            </p>
          )}
        </form>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search purchase number or supplier..."
              aria-label="Search purchases"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter purchases by status"
            className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
            <option value="partially_received">Partially received</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Could not load purchases</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h2 className="font-semibold text-slate-900">Purchase history</h2>
          <span className="text-xs text-slate-500">
            {loading ? "Loading purchases..." : `${purchases.length} purchase${purchases.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading purchases...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Check that your backend is running, then select Refresh.
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList size={35} className="mx-auto text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">No purchases found</p>
            <p className="mt-1 text-sm text-slate-500">
              Purchases will appear here once they are created.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Purchase number</th>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Supplier</th>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Purchase date</th>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Expected date</th>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Status</th>
                    <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">Total</th>
                    <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">Amount paid</th>
                    <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">Balance</th>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Payment status</th>
                    <th className="w-[1%] whitespace-nowrap px-3 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="transition hover:bg-green-50/30">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                      {purchase.purchase_number}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {purchase.supplier_name}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {purchase.purchase_date
                        ? String(purchase.purchase_date).slice(0, 10)
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {purchase.expected_date
                        ? String(purchase.expected_date).slice(0, 10)
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[purchase.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {String(purchase.status || "").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-800">
                      {money(purchase.total_amount)}
                    </td>

                    
                    <td className="whitespace-nowrap px-5 py-4 text-right text-slate-600">
                      {money(purchase.amount_paid || 0)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-800">
                      {money(
                        Math.max(
                         0,
                         Number(purchase.total_amount || 0) -
                          Number(purchase.amount_paid || 0)
                        )
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          purchase.payment_status === "paid"
                            ? "bg-green-100 text-green-700"
                            : purchase.payment_status === "partial"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {String(purchase.payment_status || "unpaid").replaceAll("_", " ")}
                      </span>
                    </td>

                    
                    <td className="w-[1%] whitespace-nowrap px-3 py-4">
                      <div className="flex min-w-0 flex-nowrap justify-start gap-2">
                        {purchase.status === "draft" && (
                            <button
                                type="button"
                                onClick={() => openOrderForm(purchase)}
                                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                                Order
                            </button>
                        )}

                        
                        {["ordered", "partially_received"].includes(purchase.status) && (
                            <button
                                type="button"
                                onClick={() => openReceiveForm(purchase.id)}
                                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                            >
                                Receive Goods
                            </button>
                        )}

                        
                        {["ordered", "partially_received", "received"].includes(
                            purchase.status
                        ) &&
                          Number(purchase.amount_paid || 0) <
                            Number(purchase.total_amount) && (
                            <button
                              type="button"
                              onClick={() => openPaymentForm(purchase)}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                            >
                              Record Payment
                            </button>
                        )}



                        {["received", "cancelled"].includes(purchase.status) && (
                            <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
