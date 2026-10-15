import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

const PRODUCT_API = "http://localhost:5000/api/products";
const SALES_API = "http://localhost:5000/api/sales";

const formatKES = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pendingSaleId, setPendingSaleId] = useState(null);
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  async function loadProducts() {
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
  }

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
          stock_quantity: Number(product.stock_quantity),
          quantity: 1,
        },
      ];
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

  const subtotal = useMemo(
    () => cart.reduce((total, item) => total + item.selling_price * item.quantity, 0),
    [cart]
  );

  async function completeCashSale(saleId) {
    const response = await fetch(`${SALES_API}/${saleId}/complete-cash`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    return readResponse(response);
  }

  async function handleCashCheckout() {
    if (checkoutLoading) return;
    setError("");
    setNotice("");

    if (cart.length === 0) {
      setError("Add at least one product before checkout.");
      return;
    }

    setCheckoutLoading(true);

    try {
      let saleId = pendingSaleId;

      // If a pending sale was already created but cash completion failed,
      // retry completion for that same sale instead of creating a duplicate.
      if (!saleId) {
        const receiptNumber = `POS-${Date.now()}`;
        const amount = Number(subtotal.toFixed(2));

        const createResponse = await fetch(SALES_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receipt_number: receiptNumber,
            subtotal: amount,
            discount_amount: 0,
            tax_amount: 0,
            total_amount: amount,
            payment_method: "cash",
            items: cart.map((item) => ({
              product_id: item.id,
              quantity: item.quantity,
              discount_amount: 0,
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

      try {
        await completeCashSale(saleId);
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
            `Sale #${saleId} was created, but cash completion could not be confirmed. Your cart has been preserved. Use Retry cash completion rather than starting a new sale. Details: ${completionError.message}`
          );
        }
      }

      // Keep a local receipt fallback so the receipt remains available even if
      // the follow-up GET request temporarily fails.
      const fallbackReceipt = {
        id: saleId,
        receipt_number: `POS-${saleId}`,
        total_amount: Number(subtotal.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
        discount_amount: 0,
        tax_amount: 0,
        payment_method: "cash",
        payment_status: "completed",
        created_at: new Date().toISOString(),
        items: cart.map((item) => ({
          product_id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.selling_price,
          line_total: Number((item.selling_price * item.quantity).toFixed(2)),
        })),
      };

      setCompletedReceipt(fallbackReceipt);
      setPendingSaleId(null);
      setCart([]);
      setCheckoutOpen(false);
      setNotice(`Cash sale completed successfully. Receipt / sale ID: ${saleId}.`);

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
      setError(err.message || "Cash checkout failed. Your cart has been preserved.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  function startNewSale() {
    setCompletedReceipt(null);
    setNotice("");
    setError("");
    setCart([]);
  }

  function printReceipt() {
    window.print();
  }

  const receiptItems = completedReceipt?.items ?? [];
  const receiptTotal = Number(
    completedReceipt?.total_amount ?? completedReceipt?.total ?? 0
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
          #pos-receipt { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; margin: 0; padding: 16px; border: 0 !important; box-shadow: none !important; }
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
          <section id="pos-receipt" className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="border-b border-dashed border-slate-300 pb-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sales receipt</p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Retail POS</h2>
              <p className="mt-1 text-sm text-slate-500">Thank you for shopping with us.</p>
            </div>

            <div className="grid grid-cols-1 gap-2 border-b border-dashed border-slate-300 py-4 text-sm sm:grid-cols-2">
              <p><span className="text-slate-500">Receipt number: </span><strong>{completedReceipt.receipt_number ?? `POS-${completedReceipt.id}`}</strong></p>
              <p><span className="text-slate-500">Sale ID: </span><strong>#{completedReceipt.id}</strong></p>
              <p><span className="text-slate-500">Date: </span><strong>{Number.isNaN(receiptDate.getTime()) ? "—" : receiptDate.toLocaleString("en-KE")}</strong></p>
              <p><span className="text-slate-500">Payment: </span><strong>{String(completedReceipt.payment_method ?? "cash").toUpperCase()}</strong></p>
              <p><span className="text-slate-500">Status: </span><strong>{String(completedReceipt.payment_status ?? "completed").toUpperCase()}</strong></p>
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
                  return (
                    <div key={`${item.product_id ?? item.id ?? index}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-800">{item.product_name ?? item.name ?? `Product ${item.product_id ?? ""}`}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatKES(unitPrice)} each</p>
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
              {Number(completedReceipt.discount_amount ?? 0) > 0 && <div className="flex justify-between gap-4"><span className="text-slate-500">Discount</span><span>-{formatKES(completedReceipt.discount_amount)}</span></div>}
              {Number(completedReceipt.tax_amount ?? 0) > 0 && <div className="flex justify-between gap-4"><span className="text-slate-500">Tax</span><span>{formatKES(completedReceipt.tax_amount)}</span></div>}
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-lg font-extrabold text-slate-900"><span>Total paid</span><span>{formatKES(receiptTotal)}</span></div>
            </div>

            <p className="mt-6 border-t border-dashed border-slate-300 pt-4 text-center text-xs text-slate-500">Please keep this receipt for your records.</p>
            {receiptLoading && <p className="mt-3 text-center text-xs text-slate-500">Refreshing receipt details from the database…</p>}
            <div className="pos-no-print mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={printReceipt} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"><Printer size={17} /> Print receipt</button>
              <button type="button" onClick={startNewSale} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Start new sale</button>
            </div>
          </section>
        )}

        <div className="pos-no-print grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product, SKU, or barcode..."
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
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
                  <LoaderCircle size={28} className="animate-spin text-orange-600" />
                  Loading products...
                </div>
              ) : error && products.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-red-600">{error}</p>
                  <button type="button" onClick={loadProducts} className="mt-3 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white">
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
                    <article key={product.id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-4 transition hover:border-orange-300 hover:shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words font-semibold text-slate-900">{product.product_name}</h3>
                          <p className="mt-1 break-all text-xs text-slate-500">SKU: {product.sku}</p>
                        </div>
                        <div className="shrink-0 rounded-lg bg-orange-50 p-2 text-orange-600"><Package size={19} /></div>
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
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="rounded-xl bg-orange-50 p-3 text-orange-600"><ShoppingCart size={21} /></div>
            </div>

            {cart.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
                <ShoppingCart size={32} className="text-slate-300" />
                <p className="mt-3 font-semibold text-slate-800">Your cart is empty</p>
                <p className="mt-1 text-sm text-slate-500">Add a product to begin a sale.</p>
                {pendingSaleId && (
                  <button type="button" onClick={() => setCheckoutOpen(true)} className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                    Retry cash completion for sale #{pendingSaleId}
                  </button>
                )}
              </div>
            ) : (
              <div className="max-h-[420px] space-y-4 overflow-y-auto p-4 sm:p-5">
                {cart.map((item) => (
                  <div key={item.id} className="border-b border-slate-100 pb-4 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-slate-900">{item.product_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatKES(item.selling_price)} each</p>
                      </div>
                      <button type="button" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.product_name}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => changeQuantity(item.id, -1)} aria-label={`Decrease ${item.product_name} quantity`} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
                          <Minus size={14} />
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`Increase ${item.product_name} quantity`} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatKES(item.selling_price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 border-t border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span><span>{formatKES(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold text-slate-900">
                <span>Total</span><span>{formatKES(subtotal)}</span>
              </div>
              <button
                type="button"
                disabled={cart.length === 0 || checkoutLoading}
                onClick={() => { setError(""); setCheckoutOpen(true); }}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart size={18} />
                {pendingSaleId ? "Retry cash completion" : "Proceed to checkout"}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {checkoutOpen && (
        <div className="pos-no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cash-checkout-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex rounded-xl bg-green-50 p-3 text-green-700"><Banknote size={24} /></div>
                <h2 id="cash-checkout-title" className="text-xl font-bold text-slate-900">
                  {pendingSaleId ? "Retry cash completion" : "Confirm cash payment"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {pendingSaleId
                    ? `Retry completing sale #${pendingSaleId}. Do not create another sale.`
                    : "Confirm that you have received the full cash amount from the customer before completing this sale."}
                </p>
              </div>
              <button type="button" onClick={() => setCheckoutOpen(false)} disabled={checkoutLoading} aria-label="Close checkout" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X size={20} />
              </button>
            </div>
            <div className="my-5 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} item units</span><span>Payment: Cash</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">Amount to collect</span>
                <span className="text-xl font-bold text-slate-900">{formatKES(subtotal)}</span>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setCheckoutOpen(false)} disabled={checkoutLoading} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={handleCashCheckout} disabled={checkoutLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">
                {checkoutLoading ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                {checkoutLoading ? "Processing..." : "Confirm cash received"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
