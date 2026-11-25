
import { useCallback, useEffect, useState } from "react";
import {
  ShoppingCart,
  LayoutDashboard,
  ReceiptText,
  Users,
  Package,
  Boxes,
  Truck,
  ClipboardList,
  Menu,
  X,
  Bell,
  Settings,
  ChevronRight,
  LogOut,
  History,
  CreditCard,
} from "lucide-react";

import Product from "./Product";
import Customer from "./Customer";
import POS from "./POS";
import Sales from "./Sales";
import StockManagement from "./StockManagement";
import Suppliers from "./Suppliers";
import brandLogo from "./assets/lux-logo.svg";
import Purchases from "./Purchases";
import SupplierPaymentHistory from "./SupplierPaymentHistory";
import SubscriptionManagement from "./SubscriptionManagement";
import Overview from "./Overview";
import SettingsPage from "./Settings";
import ActivityLogs from "./ActivityLogs";
import { apiFetch } from "./api";


const modules = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["administrator", "cashier", "storekeeper"],
  },
  {
    label: "Point of Sale",
    icon: ShoppingCart,
    roles: ["administrator", "cashier"],
  },
  {
    label: "Sales",
    icon: ReceiptText,
    roles: ["administrator", "cashier"],
  },
  {
    label: "Customers",
    icon: Users,
    roles: ["administrator", "cashier"],
  },
  {
    label: "Products",
    icon: Package,
    roles: ["administrator", "storekeeper"],
  },
  {
    label: "Stock Management",
    icon: Boxes,
    roles: ["administrator", "storekeeper"],
  },
  {
    label: "Suppliers",
    icon: Truck,
    roles: ["administrator", "storekeeper"],
  },
  {
    label: "Purchases",
    icon: ClipboardList,
    roles: ["administrator", "storekeeper"],
  },
  {
    label: "Supplier Payment History",
    icon: ReceiptText,
    roles: ["administrator"],
  },
  {
    label: "Audit Trail",
    icon: History,
    roles: ["administrator"],
  },
  {
    label: "Subscription Management",
    icon: CreditCard,
    roles: ["administrator"],
  },
  {
    label: "Settings",
    icon: Settings,
    roles: ["administrator"],
  },
];


export default function Dashboard({ user, token, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const hasNotificationIssue = Boolean(notificationError);

  const refreshLowStock = useCallback(async () => {
    try {
      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/products`
      );
      const result = await response.json();

      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.message || "Unable to load stock notifications.");
      }

      setLowStockProducts(
        result.data.filter((product) => {
          const quantity = Number(product.stock_quantity);
          const reorderLevel = Number(product.reorder_level ?? 5);

          return (
            Number.isFinite(quantity) &&
            Number.isFinite(reorderLevel) &&
            quantity <= reorderLevel
          );
        })
      );
      setNotificationError("");
    } catch (error) {
      setNotificationError(
        error.message || "Unable to load stock notifications."
      );
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshLowStock();
    }, 0);
    const intervalId = window.setInterval(() => {
      void refreshLowStock();
    }, 60_000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [refreshLowStock, token]);
  
  const [activeModule, setActiveModule] = useState(() => {
    const preferredModules = {
      administrator: "Overview",
      cashier: "Point of Sale",
      storekeeper: "Stock Management",
    };

    const defaultModule = modules.find(
      (module) =>
        module.label === preferredModules[user?.role] &&
        module.roles.includes(user?.role)
    );

    return (
      defaultModule?.label ??
      modules.find((module) => module.roles.includes(user?.role))?.label ??
      "Overview"
    );
  });


  useEffect(() => {
    const handleNavigation = (event) => {
      const module = event.detail?.module;

      if (
        modules.some(
          (item) =>
            item.label === module && item.roles.includes(user?.role)
        )
      ) {
        setActiveModule(module);
        setSidebarOpen(false);
      }
    };

    window.addEventListener("retailflow:navigate", handleNavigation);

    return () => {
      window.removeEventListener("retailflow:navigate", handleNavigation);
    };
  }, [user?.role]);

  function handleModuleChange(label) {
    setActiveModule(label);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-green-700 text-white transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <img
              src={brandLogo}
              alt="LUX logo"
              className="size-10 rounded-xl bg-white object-contain p-0.5"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                LUX
              </h1>
              <p className="text-[9px] font-bold tracking-[0.18em] text-white/70">
                POS & INVENTORY
              </p>
            </div>
          </div>

          <button
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-white/60">
            WORKSPACE
          </p>

          <nav
            aria-label="Dashboard navigation"
            className="space-y-1"
          >
            {modules
              .filter((module) => module.roles.includes(user?.role))
              .map(({ label, icon: Icon }) => {
                const selected = activeModule === label;

                return (
                  <button
                    key={label}
                    aria-current={selected ? "page" : undefined}
                    onClick={() => handleModuleChange(label)}
                    title={label}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition ${
                      selected
                        ? "bg-white/15 font-semibold text-white ring-1 ring-inset ring-white/20"
                        : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="flex-1">{label}</span>

                    {selected && (
                      <span className="size-1.5 rounded-full bg-red-300" />
                    )}
                  </button>
                );
              })}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-xl border border-white/20 bg-white/10 p-3">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-white/15 text-green-100">
                <Settings size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold">System setup</p>
                <p className="mt-1 text-[10px] text-white/70">
                  Products & Customers enabled
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[10px] text-white/60">
            LUX · Kenya · KES
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col md:ml-64">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
            >
              <Menu size={20} />
            </button>

            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline">
                Workspace
              </span>
              <ChevronRight
                size={15}
                className="hidden text-slate-400 sm:block"
              />
              <span className="truncate border-l-2 border-red-500 pl-2 font-semibold text-slate-800">
                {activeModule}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <span className="rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-bold text-slate-600 sm:text-xs">
              KES · KSh
            </span>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationOpen((open) => !open);
                  void refreshLowStock();
                }}
                title={
                  hasNotificationIssue
                    ? "Unable to load notifications"
                    : lowStockProducts.length
                    ? `${lowStockProducts.length} low-stock notification${lowStockProducts.length === 1 ? "" : "s"}`
                    : "Notifications"
                }
                aria-label={`Notifications${hasNotificationIssue ? ", unable to load alerts" : lowStockProducts.length ? `, ${lowStockProducts.length} low-stock items` : ""}`}
                aria-expanded={notificationOpen}
                aria-haspopup="dialog"
                className={`relative grid size-9 place-items-center rounded-lg transition ${
                  hasNotificationIssue
                    ? "text-red-700 hover:bg-red-50"
                    : lowStockProducts.length
                    ? "text-amber-700 hover:bg-amber-50"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Bell size={19} />
                {(lowStockProducts.length > 0 || hasNotificationIssue) && (
                  <span
                    className={`absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold leading-none text-white ${
                      hasNotificationIssue ? "bg-red-600" : "bg-amber-600"
                    }`}
                  >
                    {hasNotificationIssue
                      ? "!"
                      : lowStockProducts.length > 99
                        ? "99+"
                        : lowStockProducts.length}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <section
                  role="dialog"
                  aria-label="Notifications"
                  className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Notifications
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {lowStockProducts.length
                          ? `${lowStockProducts.length} product${lowStockProducts.length === 1 ? "" : "s"} at or below reorder level`
                          : "Inventory alerts"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationOpen(false)}
                      aria-label="Close notifications"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {notificationError ? (
                    <p role="alert" className="px-4 py-4 text-sm text-red-700">
                      {notificationError}
                    </p>
                  ) : lowStockProducts.length ? (
                    <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                      {lowStockProducts.map((product) => (
                        <li
                          key={product.id}
                          className="flex items-start justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {product.product_name}
                            </p>
                            <p className="mt-1 text-xs text-amber-700">
                              Low stock · {Number(product.stock_quantity)}{" "}
                              {product.unit_of_measure || "units"} remaining
                            </p>
                          </div>
                          <span className="shrink-0 text-right text-[11px] text-slate-500">
                            Reorder at{" "}
                            {Number(product.reorder_level ?? 5)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-6 text-center text-sm text-slate-500">
                      No low-stock products.
                    </p>
                  )}

                  {["administrator", "storekeeper"].includes(user?.role) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleModuleChange("Stock Management");
                        setNotificationOpen(false);
                      }}
                      className="w-full border-t border-slate-100 px-4 py-3 text-left text-xs font-semibold text-green-700 hover:bg-green-50"
                    >
                      Open Stock Management
                    </button>
                  )}
                </section>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-slate-800">
                  {user?.full_name || user?.username}
                </p>

                <p className="text-[10px] capitalize text-slate-500">
                  {user?.role}
                </p>
              </div>

              <div className="grid size-9 place-items-center rounded-full bg-purple-100 text-sm font-bold text-purple-800">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <button
                onClick={onLogout}
                title="Sign out"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="w-full min-w-0 flex-1 border-t-2 border-red-500/70">
          {activeModule === "Overview" && <Overview user={user} />}
          {activeModule === "Products" && <Product />}
          {activeModule === "Customers" && <Customer />}
          {activeModule === "Point of Sale" && <POS />}
          {activeModule === "Sales" && <Sales />}
          {activeModule === "Stock Management" && (
            <StockManagement token={token} />
          )}
          {activeModule === "Suppliers" && <Suppliers />}
          {activeModule === "Purchases" && <Purchases />}
          {activeModule === "Supplier Payment History" && <SupplierPaymentHistory />}
          {activeModule === "Audit Trail" && <ActivityLogs token={token} />}
          {activeModule === "Settings" && <SettingsPage token={token} />}
          {activeModule === "Subscription Management" && (
            <SubscriptionManagement />
          )}
        </main>

        <footer className="flex flex-col gap-1 border-t border-slate-200 bg-white px-4 py-4 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>LUX POS & Inventory Management</span>
          <span>Currency: Kenyan Shilling (KES)</span>
        </footer>
      </div>
    </div>
  );
}
