import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  Package,
  LoaderCircle,
  AlertCircle,
  X,
  Banknote,
  CheckCircle2,
  Printer,
  Smartphone,
} from "lucide-react";

const PRODUCT_API = "http://localhost:5000/api/products";
const SALES_API = "http://localhost:5000/api/sales";

const formatKES = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

function getLineAmounts(item) {
  const gross = Number(
    (Number(item.selling_price) * Number(item.quantity)).toFixed(2)
  );
  const discountRate = Number(item.discount_rate ?? 0);
  const taxRate = Number(item.tax_rate ?? 0);
  const discountAmount = Number((gross * discountRate / 100).toFixed(2));
  const taxableAmount = gross - discountAmount;
  const taxAmount = Number((taxableAmount * taxRate / 100).toFixed(2));

  return {
    gross,
    discountRate,
    discountAmount,
    taxRate,
    taxAmount,
    lineTotal: Number((taxableAmount + taxAmount).toFixed(2)),
  };
}

async function readResponse(response) {
  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text || "The server returned an unreadable response." };
  }

  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Request failed (${response.status}).`);
  }

  return payload;
}

function getSaleId(result) {
  return (
    result?.saleId ??
    result?.id ??
    result?.data?.saleId ??
    result?.data?.id ??
    result?.data?.sale?.id ??
    result?.sale?.id ??
    result?.data?.insertId ??
    null
  );
}

export default function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef(null);
  const barcodeSubmittingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [stkPushInitiated, setStkPushInitiated] = useState(false);
  const [mpesaStatusMessage, setMpesaStatusMessage] = useState("");
  const [pendingSaleId, setPendingSaleId] = useState(null);
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(PRODUCT_API);
      const result = await readResponse(response);
      const rows = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.data?.products)
            ? result.data.products
            : Array.isArray(result.products)
              ? result.products
              : [];

      setProducts(rows.filter((product) => Number(product.is_active) === 1));
    } catch (err) {
      setError(err.message || "Could not connect to the products API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(PRODUCT_API);
        const result = await readResponse(response);
        const rows = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
            ? result.data
            : Array.isArray(result.data?.products)
              ? result.data.products
              : Array.isArray(result.products)
                ? result.products
                : [];

        if (isMounted) {
          setProducts(rows.filter((product) => Number(product.is_active) === 1));
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Could not connect to the products API.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingSaleId || paymentMethod !== "mpesa" || !stkPushInitiated) {
      return undefined;
    }

    let cancelled = false;
    let timer;

    async function checkPaymentStatus() {
      try {
        const response = await fetch(`${SALES_API}/${pendingSaleId}/mpesa-status`);
        const result = await readResponse(response);
        if (cancelled) return;

        const sale = result?.data?.sale;
        const attempt = result?.data?.attempt;
        if (attempt?.status === "failed") {
          setMpesaStatusMessage(
            attempt.result_description || "The M-Pesa payment was not completed. You can send a new prompt."
          );
          setStkPushInitiated(false);
          return;
        }

        if (sale?.payment_status === "completed") {
          setCompletedReceipt({
            ...sale,
            mpesa_amount: Number(attempt?.requested_amount ?? Math.round(Number(sale.total_amount))),
            mpesa_receipt_number: attempt?.mpesa_receipt_number ?? null,
          });
          setPendingSaleId(null);
          setStkPushInitiated(false);
          setPaymentMethod("cash");
          setMpesaPhone("");
          setCart([]);
          setCheckoutOpen(false);
          setNotice(`M-Pesa sale completed successfully. Receipt / sale ID: ${sale.id}.`);
          setMpesaStatusMessage("");
          await loadProducts();
          return;
        }

        setMpesaStatusMessage("Waiting for the customer to complete the M-Pesa prompt…");
        timer = setTimeout(checkPaymentStatus, 3000);
      } catch (statusError) {
        if (!cancelled) {
          setMpesaStatusMessage(
            `Could not check payment status: ${statusError.message}. Retrying…`
          );
          timer = setTimeout(checkPaymentStatus, 5000);
        }
      }
    }

    timer = setTimeout(checkPaymentStatus, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loadProducts, paymentMethod, pendingSaleId, stkPushInitiated]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) =>
      [product.product_name, product.sku, product.barcode].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }, [products, search]);

  
  function addToCart(product) {
    setNotice("");
    setError("");

    setCart((previous) => {
      const existing = previous.find((item) => item.id === product.id);

      if (existing) {
        if (existing.quantity + 1 > Number(product.stock_quantity)) {
          setError(`Only ${product.stock_quantity} units are available.`);
          return previous;
        }

        return previous.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      if (Number(product.stock_quantity) < 1) {
        setError("This product is out of stock.");
        return previous;
      }

      return [
        ...previous,
        {
          id: product.id,
          product_name: product.product_name,
          sku: product.sku,
          selling_price: Number(product.selling_price),
          tax_rate: Number(product.tax_rate ?? 0),
          discount_rate: Number(product.discount_rate ?? 0),
          stock_quantity: Number(product.stock_quantity),
          quantity: 1,
        },
      ];
    });

    // Return focus to the barcode input after adding a product.
    requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
    });
  }

  
  
  function handleBarcodeSubmit(event) {
    event.preventDefault();

    if (barcodeSubmittingRef.current) return;

    const scannedBarcode = barcodeInput.trim();

    if (!scannedBarcode) return;

    barcodeSubmittingRef.current = true;

    setError("");
    setNotice("");

    const product = products.find(
      (item) =>
        String(item.barcode ?? "").trim() === scannedBarcode
    );

    if (!product) {
      setError(`No product found for barcode: ${scannedBarcode}`);
      setBarcodeInput("");

      requestAnimationFrame(() => {
        barcodeInputRef.current?.focus();
        barcodeSubmittingRef.current = false;
      });

      return;
    }

    addToCart(product);
    setBarcodeInput("");

    requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
      barcodeSubmittingRef.current = false;
    });
  }

  function changeQuantity(productId, amount) {
    setError("");
    setCart((previous) =>
      previous.map((item) => {
        if (item.id !== productId) return item;

        const nextQuantity = item.quantity + amount;
        if (nextQuantity < 1) return item;

        if (nextQuantity > item.stock_quantity) {
          setError(`Only ${item.stock_quantity} units are available for ${item.product_name}.`);
          return item;
        }

        return { ...item, quantity: nextQuantity };
      })
    );
  }

  function removeFromCart(productId) {
    setCart((previous) => previous.filter((item) => item.id !== productId));
    setError("");
  }

  const cartTotals = useMemo(
    () => cart.reduce((totals, item) => {
      const line = getLineAmounts(item);

      totals.subtotal += line.gross;
      totals.discount += line.discountAmount;
      totals.tax += line.taxAmount;
      return totals;
    }, { subtotal: 0, discount: 0, tax: 0 }),
    [cart]
  );
  const subtotal = Number(cartTotals.subtotal.toFixed(2));
  const discountAmount = Number(cartTotals.discount.toFixed(2));
  const taxAmount = Number(cartTotals.tax.toFixed(2));
  const total = Number((subtotal - discountAmount + taxAmount).toFixed(2));

  async function completeSale(saleId) {
    const response = await fetch(`${SALES_API}/${saleId}/complete-payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    return readResponse(response);
  }

  async function handleCheckout() {
    if (checkoutLoading) return;
    setError("");
    setNotice("");

    if (cart.length === 0) {
      setError("Add at least one product before checkout.");
      return;
    }

    if (paymentMethod === "mpesa") {
      const phone = mpesaPhone.replace(/[\s()+-]/g, "");
      const normalizedPhone = phone.startsWith("0")
        ? `254${phone.slice(1)}`
        : phone;
      if (!/^254(?:7|1)\d{8}$/.test(normalizedPhone)) {
        setError("Enter a valid Kenyan M-Pesa number, for example 0712345678.");
        return;
      }
    }

    setCheckoutLoading(true);

    try {
      let saleId = pendingSaleId;

      // If a pending sale was already created but payment completion failed,
      // retry that sale instead of creating a duplicate.
      if (!saleId) {
        const receiptNumber = `POS-${Date.now()}`;
        const createResponse = await fetch(SALES_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receipt_number: receiptNumber,
            subtotal,
            discount_amount: discountAmount,
            tax_amount: taxAmount,
            total_amount: total,
            payment_method: paymentMethod,
            items: cart.map((item) => ({
              product_id: item.id,
              quantity: item.quantity,
            })),
          }),
        });

        const created = await readResponse(createResponse);
        saleId = getSaleId(created);

        if (!saleId) {
          throw new Error(
            "The server accepted the sale but did not return a sale ID in a recognized field. Check the POST /api/sales response before trying again to avoid creating a duplicate sale."
          );
        }

        setPendingSaleId(saleId);
      }

      if (paymentMethod === "mpesa") {
        const stkResponse = await fetch(`${SALES_API}/${saleId}/mpesa/stk-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_number: mpesaPhone }),
        });
        const stkResult = await readResponse(stkResponse);
        setMpesaStatusMessage(
          stkResult.message || "M-Pesa prompt sent. Waiting for payment confirmation…"
        );
        setStkPushInitiated(true);
        return;
      }

      try {
        await completeSale(saleId);
      } catch (completionError) {
        // Confirm whether the sale was completed despite a lost/failed response.
        try {
          const verifyResponse = await fetch(`${SALES_API}/${saleId}`);
          const verified = await readResponse(verifyResponse);
          const sale = verified?.data?.sale ?? verified?.data ?? verified?.sale ?? verified;
          if (String(sale?.payment_status ?? "").toLowerCase() !== "completed") {
            throw completionError;
          }
        } catch {
          throw new Error(
            `Sale #${saleId} was created, but ${paymentMethod} payment completion could not be confirmed. Your cart has been preserved. Retry this payment rather than starting a new sale. Details: ${completionError.message}`
          );
        }
      }

      // Keep a local receipt fallback so the receipt remains available even if
      // the follow-up GET request temporarily fails.
      const fallbackReceipt = {
        id: saleId,
        receipt_number: `POS-${saleId}`,
        total_amount: total,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        payment_method: paymentMethod,
        payment_status: "completed",
        created_at: new Date().toISOString(),
        items: cart.map((item) => {
          const line = getLineAmounts(item);
          return {
            product_id: item.id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.selling_price,
            tax_rate: item.tax_rate,
            discount_rate: item.discount_rate,
            discount_amount: line.discountAmount,
            tax_amount: line.taxAmount,
            line_total: line.lineTotal,
          };
        }),
      };

      setCompletedReceipt(fallbackReceipt);
      setPendingSaleId(null);
      setStkPushInitiated(false);
      setPaymentMethod("cash");
      setMpesaPhone("");
      setCart([]);
      setCheckoutOpen(false);
      setNotice(`${paymentMethod === "mpesa" ? "M-Pesa" : "Cash"} sale completed successfully. Receipt / sale ID: ${saleId}.`);

      // Load the authoritative receipt values from the sales API when available.
      setReceiptLoading(true);
      try {
        const receiptResponse = await fetch(`${SALES_API}/${saleId}`);
        const receiptResult = await readResponse(receiptResponse);
        const sale = receiptResult?.data?.sale
          ?? receiptResult?.data
          ?? receiptResult?.sale
          ?? receiptResult;
        if (sale && (sale.id || sale.sale_id)) {
          setCompletedReceipt({
            ...fallbackReceipt,
            ...sale,
            id: sale.id ?? sale.sale_id ?? saleId,
            items: Array.isArray(sale.items) ? sale.items : fallbackReceipt.items,
          });
        }
      } catch (receiptError) {
        // Checkout is already complete; keep the locally prepared receipt.
        console.warn("Could not load full receipt details; showing checkout data instead.", receiptError);
      } finally {
        setReceiptLoading(false);
      }

      await loadProducts();
    } catch (err) {
      setError(err.message || "Checkout failed. Your cart has been preserved.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  function startNewSale() {
    setCompletedReceipt(null);
    setNotice("");
    setError("");
    setCart([]);
    setPaymentMethod("cash");
    setMpesaPhone("");
    setStkPushInitiated(false);
    setMpesaStatusMessage("");
  }

  function printReceipt() {
    window.print();
  }

  const receiptItems = completedReceipt?.items ?? [];
  const receiptTotal = Number(
    completedReceipt?.mpesa_amount ??
      completedReceipt?.total_amount ??
      completedReceipt?.total ??
      0
  );
  const receiptSaleTotal = Number(
    completedReceipt?.total_amount ?? completedReceipt?.total ?? 0
  );
  const mpesaRoundingAdjustment = Number(
    (receiptTotal - receiptSaleTotal).toFixed(2)
  );
  const receiptDate = completedReceipt?.created_at
    ? new Date(completedReceipt.created_at)
    : new Date();

  return (
    <div className="pos-page min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #pos-receipt, #pos-receipt * { visibility: visible !important; }
          #receipt-overlay { position: static !important; padding: 0 !important; background: transparent !important; }
          #pos-receipt { position: fixed; left: 0; top: 0; width: 100%; max-width: 100%; max-height: none; margin: 0; padding: 16px; overflow: visible; border: 0 !important; box-shadow: none !important; }
          .pos-no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="pos-no-print">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <ShoppingCart size={17} />
            Point of Sale
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">New Sale</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select products and prepare the customer's order.
          </p>
        </div>

        {notice && (
          <div className="pos-no-print" role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <span className="flex items-center gap-2"><CheckCircle2 size={18} />{notice}</span>
            {completedReceipt && (
              <button type="button" onClick={startNewSale} className="rounded-lg bg-green-700 px-3 py-2 font-semibold text-white hover:bg-green-800">
                Start new sale
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="pos-no-print" role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {completedReceipt && (
          <div
            id="receipt-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title"
          >
          <section id="pos-receipt" className="my-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
            <div className="border-b border-dashed border-slate-300 pb-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sales receipt</p>
              <h2 id="receipt-title" className="mt-2 text-2xl font-extrabold text-slate-900">Retail POS</h2>
              <p className="mt-1 text-sm text-slate-500">Thank you for shopping with us.</p>
            </div>

            <div className="grid grid-cols-1 gap-2 border-b border-dashed border-slate-300 py-4 text-sm sm:grid-cols-2">
              <p><span className="text-slate-500">Receipt number: </span><strong>{completedReceipt.receipt_number ?? `POS-${completedReceipt.id}`}</strong></p>
              <p><span className="text-slate-500">Sale ID: </span><strong>#{completedReceipt.id}</strong></p>
              <p><span className="text-slate-500">Date: </span><strong>{Number.isNaN(receiptDate.getTime()) ? "—" : receiptDate.toLocaleString("en-KE")}</strong></p>
              <p><span className="text-slate-500">Payment: </span><strong>{String(completedReceipt.payment_method ?? "cash").toUpperCase()}</strong></p>
              <p><span className="text-slate-500">Status: </span><strong>{String(completedReceipt.payment_status ?? "completed").toUpperCase()}</strong></p>
              {completedReceipt.mpesa_receipt_number && (
                <p><span className="text-slate-500">M-Pesa receipt: </span><strong>{completedReceipt.mpesa_receipt_number}</strong></p>
              )}
            </div>

            <div className="py-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <span>Item</span><span className="text-right">Qty</span><span className="text-right">Amount</span>
              </div>
              <div className="divide-y divide-slate-100">
                {receiptItems.map((item, index) => {
                  const quantity = Number(item.quantity ?? 0);
                  const unitPrice = Number(item.unit_price ?? item.selling_price ?? 0);
                  const lineTotal = Number(item.line_total ?? (quantity * unitPrice));
                  const discountRate = Number(item.discount_rate ?? 0);
                  const discount = Number(item.discount_amount ?? 0);
                  const taxRate = Number(item.tax_rate ?? 0);
                  const tax = Number(item.tax_amount ?? 0);
                  return (
                    <div key={`${item.product_id ?? item.id ?? index}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-800">{item.product_name ?? item.name ?? `Product ${item.product_id ?? ""}`}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatKES(unitPrice)} each</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Discount ({discountRate}%): -{formatKES(discount)} · Tax ({taxRate}%): {formatKES(tax)}
                        </p>
                      </div>
                      <span className="text-right">{quantity}</span>
                      <span className="text-right font-semibold">{formatKES(lineTotal)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ml-auto max-w-sm space-y-2 border-t border-dashed border-slate-300 pt-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-slate-500">Subtotal</span><span>{formatKES(completedReceipt.subtotal ?? receiptTotal)}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Discount</span><span>-{formatKES(completedReceipt.discount_amount)}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Tax</span><span>{formatKES(completedReceipt.tax_amount)}</span></div>
              {completedReceipt.payment_method === "mpesa" &&
                Math.abs(mpesaRoundingAdjustment) >= 0.01 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">M-Pesa rounding adjustment</span>
                    <span>
                      {mpesaRoundingAdjustment > 0 ? "+" : "-"}
                      {formatKES(Math.abs(mpesaRoundingAdjustment))}
                    </span>
                  </div>
                )}
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-lg font-extrabold text-slate-900"><span>Total paid</span><span>{formatKES(receiptTotal)}</span></div>
            </div>

            <p className="mt-6 border-t border-dashed border-slate-300 pt-4 text-center text-xs text-slate-500">Please keep this receipt for your records.</p>
            {receiptLoading && <p className="mt-3 text-center text-xs text-slate-500">Refreshing receipt details from the database…</p>}
            <div className="pos-no-print mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={printReceipt} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"><Printer size={17} /> Print receipt</button>
              <button type="button" onClick={startNewSale} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Start new sale</button>
            </div>
          </section>
          </div>
        )}

        <div className="pos-no-print grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            {/* Barcode scanner input */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <input
                type="text"
                ref={barcodeInputRef}
                value={barcodeInput}
                onChange={(event) => setBarcodeInput(event.target.value)}
                placeholder="Scan barcode and press Enter..."
                autoComplete="off"
                className="min-h-12 w-full rounded-xl border border-green-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />

              <button
                type="submit"
                className="min-h-12 rounded-xl bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Scan
              </button>
            </form>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product, SKU, or barcode..."
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </div>
              <button
                type="button"
                onClick={loadProducts}
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Available products</h2>
                <span className="text-xs text-slate-500">{filteredProducts.length} products</span>
              </div>

              {loading ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-slate-500">
                  <LoaderCircle size={28} className="animate-spin text-green-600" />
                  Loading products...
                </div>
              ) : error && products.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-red-600">{error}</p>
                  <button type="button" onClick={loadProducts} className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">
                    Try again
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center">
                  <Package size={32} className="mx-auto text-slate-400" />
                  <p className="mt-3 font-medium text-slate-800">No products found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Search for another product or activate a product in Products.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <article key={product.id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-4 transition hover:border-green-300 hover:shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words font-semibold text-slate-900">{product.product_name}</h3>
                          <p className="mt-1 break-all text-xs text-slate-500">SKU: {product.sku}</p>
                        </div>
                        <div className="shrink-0 rounded-lg bg-green-50 p-2 text-green-600"><Package size={19} /></div>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-lg font-bold text-slate-900">{formatKES(product.selling_price)}</p>
                          <p className="mt-1 text-xs text-slate-500">Stock: {product.stock_quantity}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          disabled={Number(product.stock_quantity) <= 0 || Boolean(pendingSaleId)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Plus size={16} /> Add
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5">
              <div>
                <h2 className="font-semibold text-slate-900">Current sale</h2>
                <p className="mt-1 text-xs text-slate-500">Review items before checkout</p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-green-600"><ShoppingCart size={21} /></div>
            </div>

            {cart.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
                <ShoppingCart size={32} className="text-slate-300" />
                <p className="mt-3 font-semibold text-slate-800">Your cart is empty</p>
                <p className="mt-1 text-sm text-slate-500">Add a product to begin a sale.</p>
                {pendingSaleId && (
                  <button type="button" onClick={() => setCheckoutOpen(true)} className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                    Retry {paymentMethod === "mpesa" ? "M-Pesa" : "cash"} payment for sale #{pendingSaleId}
                  </button>
                )}
              </div>
            ) : (
              <div className="max-h-[420px] space-y-4 overflow-y-auto p-4 sm:p-5">
                {cart.map((item) => {
                  const line = getLineAmounts(item);

                  return (
                    <div key={item.id} className="border-b border-slate-100 pb-4 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-slate-900">{item.product_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatKES(item.selling_price)} each</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Discount {line.discountRate}% (-{formatKES(line.discountAmount)}) · Tax {line.taxRate}% (+{formatKES(line.taxAmount)})
                          </p>
                        </div>
                        <button type="button" onClick={() => removeFromCart(item.id)} disabled={Boolean(pendingSaleId)} aria-label={`Remove ${item.product_name}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => changeQuantity(item.id, -1)} disabled={Boolean(pendingSaleId)} aria-label={`Decrease ${item.product_name} quantity`} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                            <Minus size={14} />
                          </button>
                          <span className="min-w-6 text-center text-sm font-semibold">{item.quantity}</span>
                          <button type="button" onClick={() => changeQuantity(item.id, 1)} disabled={Boolean(pendingSaleId)} aria-label={`Increase ${item.product_name} quantity`} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{formatKES(line.lineTotal)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-3 border-t border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span><span>{formatKES(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Discount</span><span>-{formatKES(discountAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Tax</span><span>{formatKES(taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold text-slate-900">
                <span>Total</span><span>{formatKES(total)}</span>
              </div>
              <button
                type="button"
                disabled={cart.length === 0 || checkoutLoading}
                onClick={() => { setError(""); setCheckoutOpen(true); }}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart size={18} />
                {pendingSaleId ? `Retry ${paymentMethod === "mpesa" ? "M-Pesa" : "cash"} payment` : "Proceed to checkout"}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {checkoutOpen && (
        <div className="pos-no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex rounded-xl bg-green-50 p-3 text-green-700">
                  {paymentMethod === "mpesa" ? <Smartphone size={24} /> : <Banknote size={24} />}
                </div>
                <h2 id="checkout-title" className="text-xl font-bold text-slate-900">
                  {pendingSaleId
                    ? `Retry ${paymentMethod === "mpesa" ? "M-Pesa" : "cash"} payment`
                    : `Confirm ${paymentMethod === "mpesa" ? "M-Pesa" : "cash"} payment`}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {pendingSaleId
                    ? paymentMethod === "mpesa"
                      ? `Retry the M-Pesa prompt for sale #${pendingSaleId}. Do not create another sale.`
                      : `Retry completing sale #${pendingSaleId}. Do not create another sale.`
                    : paymentMethod === "mpesa"
                      ? "Send an STK Push to the customer's phone. The sale will complete only after Safaricom confirms payment."
                      : "Confirm that you have received the full cash amount from the customer before completing this sale."}
                </p>
              </div>
              <button type="button" onClick={() => setCheckoutOpen(false)} disabled={checkoutLoading} aria-label="Close checkout" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X size={20} />
              </button>
            </div>
            {!pendingSaleId && (
              <div className="mt-5 grid grid-cols-2 gap-3" aria-label="Payment method">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  aria-pressed={paymentMethod === "cash"}
                  disabled={checkoutLoading}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${paymentMethod === "cash" ? "border-green-700 bg-green-50 text-green-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <Banknote size={18} /> Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("mpesa")}
                  aria-pressed={paymentMethod === "mpesa"}
                  disabled={checkoutLoading}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${paymentMethod === "mpesa" ? "border-green-700 bg-green-50 text-green-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <Smartphone size={18} /> M-Pesa
                </button>
              </div>
            )}
            {paymentMethod === "mpesa" && (
              <div className="mt-4">
                <label htmlFor="mpesa-phone" className="mb-1 block text-sm font-medium text-slate-700">
                  Customer M-Pesa phone number
                </label>
                <input
                  id="mpesa-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={mpesaPhone}
                  onChange={(event) => setMpesaPhone(event.target.value)}
                  disabled={stkPushInitiated}
                  placeholder="0712345678 or 254712345678"
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-600 disabled:bg-slate-100"
                />
                <p className="mt-1 text-xs text-slate-500">
                  The customer will receive an M-Pesa payment prompt on this phone.
                  Amount requested: {formatKES(Math.round(total))}.
                </p>
              </div>
            )}
            <div className="my-5 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} item units</span>
                <span>Payment: {paymentMethod === "mpesa" ? "M-Pesa" : "Cash"}</span>
              </div>
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-sm">
                <div className="flex justify-between gap-3 text-slate-600">
                  <span>Subtotal</span><span>{formatKES(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-3 text-slate-600">
                  <span>Discount</span><span>-{formatKES(discountAmount)}</span>
                </div>
                <div className="flex justify-between gap-3 text-slate-600">
                  <span>Tax</span><span>{formatKES(taxAmount)}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">Amount to collect</span>
                <span className="text-xl font-bold text-slate-900">
                  {formatKES(paymentMethod === "mpesa" ? Math.round(total) : total)}
                </span>
              </div>
            </div>
            {mpesaStatusMessage && paymentMethod === "mpesa" && (
              <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                {mpesaStatusMessage}
              </p>
            )}
            {error && (
              <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setCheckoutOpen(false)} disabled={checkoutLoading} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={handleCheckout} disabled={checkoutLoading || stkPushInitiated} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">
                {checkoutLoading || stkPushInitiated
                  ? <LoaderCircle size={17} className="animate-spin" />
                  : <CheckCircle2 size={17} />}
                {checkoutLoading
                  ? "Processing..."
                  : stkPushInitiated
                    ? "Waiting for payment"
                    : paymentMethod === "mpesa"
                      ? "Send M-Pesa prompt"
                      : "Confirm cash received"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
