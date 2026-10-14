
// import { useEffect, useMemo, useState } from "react";
// import {
//   Search,
//   ShoppingCart,
//   Plus,
//   Minus,
//   Trash2,
//   RefreshCw,
//   Package,
//   LoaderCircle,
//   AlertCircle,
// } from "lucide-react";

// const PRODUCT_API = "http://localhost:5000/api/products";

// const formatKES = (amount) =>
//   new Intl.NumberFormat("en-KE", {
//     style: "currency",
//     currency: "KES",
//     maximumFractionDigits: 2,
//   }).format(amount);

// export default function POS() {
//   const [products, setProducts] = useState([]);
//   const [cart, setCart] = useState([]);
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [notice, setNotice] = useState("");

//   async function loadProducts() {
//     setLoading(true);
//     setError("");

//     try {
//       const response = await fetch(PRODUCT_API);
//       const result = await response.json();

//       if (!response.ok) {
//         throw new Error(result.message || "Unable to load products.");
//       }

//       const rows = Array.isArray(result)
//         ? result
//         : result.data ?? result.products ?? [];

//       setProducts(rows.filter((product) => Number(product.is_active) === 1));
//     } catch (err) {
//       setError(err.message || "Could not connect to the products API.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     loadProducts();
//   }, []);

//   const filteredProducts = useMemo(() => {
//     const term = search.trim().toLowerCase();

//     if (!term) return products;

//     return products.filter((product) =>
//       [
//         product.product_name,
//         product.sku,
//         product.barcode,
//       ].some((value) => String(value ?? "").toLowerCase().includes(term))
//     );
//   }, [products, search]);

//   function addToCart(product) {
//     setNotice("");
//     setError("");

//     setCart((previous) => {
//       const existing = previous.find((item) => item.id === product.id);

//       if (existing) {
//         if (existing.quantity + 1 > Number(product.stock_quantity)) {
//           setError(`Only ${product.stock_quantity} units are available.`);
//           return previous;
//         }

//         return previous.map((item) =>
//           item.id === product.id
//             ? { ...item, quantity: item.quantity + 1 }
//             : item
//         );
//       }

//       if (Number(product.stock_quantity) < 1) {
//         setError("This product is out of stock.");
//         return previous;
//       }

//       return [
//         ...previous,
//         {
//           id: product.id,
//           product_name: product.product_name,
//           sku: product.sku,
//           selling_price: Number(product.selling_price),
//           stock_quantity: Number(product.stock_quantity),
//           quantity: 1,
//         },
//       ];
//     });
//   }

//   function changeQuantity(productId, amount) {
//     setError("");
//     setCart((previous) =>
//       previous.map((item) => {
//         if (item.id !== productId) return item;

//         const nextQuantity = item.quantity + amount;

//         if (nextQuantity < 1) return item;

//         if (nextQuantity > item.stock_quantity) {
//           setError(`Only ${item.stock_quantity} units are available for ${item.product_name}.`);
//           return item;
//         }

//         return { ...item, quantity: nextQuantity };
//       })
//     );
//   }

//   function removeFromCart(productId) {
//     setCart((previous) => previous.filter((item) => item.id !== productId));
//   }

//   const subtotal = useMemo(
//     () =>
//       cart.reduce(
//         (total, item) => total + item.selling_price * item.quantity,
//         0
//       ),
//     [cart]
//   );

//   return (
//     <div className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
//       <div className="mx-auto max-w-7xl space-y-6">
//         <div>
//           <p className="flex items-center gap-2 text-sm text-slate-500">
//             <ShoppingCart size={17} />
//             Point of Sale
//           </p>
//           <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
//             New Sale
//           </h1>
//           <p className="mt-1 text-sm text-slate-500">
//             Select products and prepare the customer's order.
//           </p>
//         </div>

//         {notice && (
//           <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
//             {notice}
//           </div>
//         )}

//         {error && (
//           <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
//             <AlertCircle size={18} className="mt-0.5 shrink-0" />
//             <span>{error}</span>
//           </div>
//         )}

//         <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
//           <section className="space-y-4 lg:col-span-2">
//             <div className="flex flex-col gap-3 sm:flex-row">
//               <div className="relative flex-1">
//                 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <input
//                   value={search}
//                   onChange={(event) => setSearch(event.target.value)}
//                   placeholder="Search product, SKU, or barcode..."
//                   className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
//                 />
//               </div>

//               <button
//                 type="button"
//                 onClick={loadProducts}
//                 disabled={loading}
//                 className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
//               >
//                 <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
//                 Refresh
//               </button>
//             </div>

//             <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
//               <div className="mb-4 flex items-center justify-between">
//                 <h2 className="font-semibold text-slate-900">Available products</h2>
//                 <span className="text-xs text-slate-500">
//                   {filteredProducts.length} products
//                 </span>
//               </div>

//               {loading ? (
//                 <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-slate-500">
//                   <LoaderCircle size={28} className="animate-spin text-orange-600" />
//                   Loading products...
//                 </div>
//               ) : error && products.length === 0 ? (
//                 <div className="py-10 text-center">
//                   <p className="text-sm text-red-600">{error}</p>
//                   <button type="button" onClick={loadProducts} className="mt-3 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white">
//                     Try again
//                   </button>
//                 </div>
//               ) : filteredProducts.length === 0 ? (
//                 <div className="py-12 text-center">
//                   <Package size={32} className="mx-auto text-slate-400" />
//                   <p className="mt-3 font-medium text-slate-800">No products found</p>
//                   <p className="mt-1 text-sm text-slate-500">
//                     Search for another product or activate a product in Products.
//                   </p>
//                 </div>
//               ) : (
//                 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
//                   {filteredProducts.map((product) => (
//                     <article key={product.id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-4 transition hover:border-orange-300 hover:shadow-sm">
//                       <div className="flex items-start justify-between gap-3">
//                         <div className="min-w-0">
//                           <h3 className="break-words font-semibold text-slate-900">
//                             {product.product_name}
//                           </h3>
//                           <p className="mt-1 break-all text-xs text-slate-500">
//                             SKU: {product.sku}
//                           </p>
//                         </div>
//                         <div className="shrink-0 rounded-lg bg-orange-50 p-2 text-orange-600">
//                           <Package size={19} />
//                         </div>
//                       </div>

//                       <div className="mt-4 flex items-end justify-between gap-2">
//                         <div>
//                           <p className="text-lg font-bold text-slate-900">
//                             {formatKES(Number(product.selling_price))}
//                           </p>
//                           <p className="mt-1 text-xs text-slate-500">
//                             Stock: {product.stock_quantity}
//                           </p>
//                         </div>
//                         <button
//                           type="button"
//                           onClick={() => addToCart(product)}
//                           disabled={Number(product.stock_quantity) <= 0}
//                           className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
//                         >
//                           <Plus size={16} /> Add
//                         </button>
//                       </div>
//                     </article>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </section>

//           <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6">
//             <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5">
//               <div>
//                 <h2 className="font-semibold text-slate-900">Current sale</h2>
//                 <p className="mt-1 text-xs text-slate-500">Review items before checkout</p>
//               </div>
//               <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
//                 <ShoppingCart size={21} />
//               </div>
//             </div>

//             {cart.length === 0 ? (
//               <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
//                 <ShoppingCart size={32} className="text-slate-300" />
//                 <p className="mt-3 font-semibold text-slate-800">Your cart is empty</p>
//                 <p className="mt-1 text-sm text-slate-500">
//                   Add a product to begin a sale.
//                 </p>
//               </div>
//             ) : (
//               <div className="max-h-[420px] space-y-4 overflow-y-auto p-4 sm:p-5">
//                 {cart.map((item) => (
//                   <div key={item.id} className="border-b border-slate-100 pb-4 last:border-0">
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="min-w-0">
//                         <p className="break-words text-sm font-semibold text-slate-900">
//                           {item.product_name}
//                         </p>
//                         <p className="mt-1 text-xs text-slate-500">
//                           {formatKES(item.selling_price)} each
//                         </p>
//                       </div>
//                       <button
//                         type="button"
//                         onClick={() => removeFromCart(item.id)}
//                         aria-label={`Remove ${item.product_name}`}
//                         className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
//                       >
//                         <Trash2 size={16} />
//                       </button>
//                     </div>

//                     <div className="mt-3 flex items-center justify-between gap-3">
//                       <div className="flex items-center gap-2">
//                         <button
//                           type="button"
//                           onClick={() => changeQuantity(item.id, -1)}
//                           aria-label={`Decrease ${item.product_name} quantity`}
//                           className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
//                         >
//                           <Minus size={14} />
//                         </button>
//                         <span className="min-w-6 text-center text-sm font-semibold">
//                           {item.quantity}
//                         </span>
//                         <button
//                           type="button"
//                           onClick={() => changeQuantity(item.id, 1)}
//                           aria-label={`Increase ${item.product_name} quantity`}
//                           className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
//                         >
//                           <Plus size={14} />
//                         </button>
//                       </div>
//                       <p className="text-sm font-semibold text-slate-900">
//                         {formatKES(item.selling_price * item.quantity)}
//                       </p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}

//             <div className="space-y-3 border-t border-slate-200 p-4 sm:p-5">
//               <div className="flex items-center justify-between text-sm text-slate-600">
//                 <span>Subtotal</span>
//                 <span>{formatKES(subtotal)}</span>
//               </div>
//               <div className="flex items-center justify-between text-lg font-bold text-slate-900">
//                 <span>Total</span>
//                 <span>{formatKES(subtotal)}</span>
//               </div>

//               <button
//                 type="button"
//                 disabled={cart.length === 0}
//                 onClick={() => setNotice("Cart ready. Cash checkout will be enabled in the next step.")}
//                 className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
//               >
//                 <ShoppingCart size={18} />
//                 Proceed to checkout
//               </button>
//             </div>
//           </aside>
//         </div>
//       </div>
//     </div>
//   );
// }

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
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || "The server returned an unreadable response." };
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed (${response.status}).`);
  }
  return data;
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
    loadProducts();
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

      setCompletedReceipt({ id: saleId, total: subtotal });
      setPendingSaleId(null);
      setCart([]);
      setCheckoutOpen(false);
      setNotice(`Cash sale completed successfully. Receipt / sale ID: ${saleId}.`);
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
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
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <span className="flex items-center gap-2"><CheckCircle2 size={18} />{notice}</span>
            {completedReceipt && (
              <button type="button" onClick={startNewSale} className="rounded-lg bg-green-700 px-3 py-2 font-semibold text-white hover:bg-green-800">
                Start new sale
              </button>
            )}
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cash-checkout-title">
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
