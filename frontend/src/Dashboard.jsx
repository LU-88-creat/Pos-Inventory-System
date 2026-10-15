
import { useState } from "react";
import {
  ShoppingCart,
  LayoutDashboard,
  ReceiptText,
  Users,
  Package,
  Boxes,
  Tags,
  Truck,
  ClipboardList,
  Menu,
  X,
  Bell,
  Settings,
  LockKeyhole,
  ChevronRight,
} from "lucide-react";

import Product from "./Product";
import Customer from "./Customer";
import POS from "./POS";
import Sales from "./Sales";


const modules = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Point of Sale", icon: ShoppingCart, active: true },
  { label: "Sales", icon: ReceiptText, active: true },
  { label: "Customers", icon: Users, active: true },
  { label: "Products", icon: Package, active: true },
  { label: "Stock Management", icon: Boxes },
  { label: "Suppliers", icon: Truck },
  { label: "Purchases", icon: ClipboardList },
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState("Products");

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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-white transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-orange-600">
              <ShoppingCart size={23} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                RetailFlow
              </h1>
              <p className="text-[9px] font-bold tracking-[0.18em] text-slate-400">
                POS & INVENTORY
              </p>
            </div>
          </div>

          <button
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-slate-500">
            WORKSPACE
          </p>

          <nav
            aria-label="Dashboard navigation"
            className="space-y-1"
          >
            {modules.map(({ label, icon: Icon, active }) => {
              const selected = activeModule === label;

              return (
                <button
                  key={label}
                  disabled={!active}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => {
                    if (active) handleModuleChange(label);
                  }}
                  title={active ? label : `${label} — coming soon`}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition ${
                    selected
                      ? "bg-orange-600/15 font-semibold text-orange-300 ring-1 ring-inset ring-orange-500/20"
                      : active
                        ? "text-slate-200 hover:bg-white/10"
                        : "cursor-not-allowed text-slate-400 opacity-60"
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1">{label}</span>

                  {selected ? (
                    <span className="size-1.5 rounded-full bg-orange-400" />
                  ) : !active ? (
                    <LockKeyhole size={13} />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-white/10 text-orange-300">
                <Settings size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold">System setup</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Products & Customers enabled
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[10px] text-slate-500">
            RetailFlow · Kenya · KES
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
              <span className="truncate font-semibold text-slate-800">
                {activeModule}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <span className="rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-bold text-slate-600 sm:text-xs">
              KES · KSh
            </span>

            <button
              disabled
              title="Notifications coming soon"
              aria-label="Notifications"
              className="grid size-9 place-items-center rounded-lg text-slate-400 opacity-60"
            >
              <Bell size={19} />
            </button>

            <div className="grid size-9 place-items-center rounded-full bg-orange-100 text-sm font-bold text-orange-800">
              A
            </div>
          </div>
        </header>

        <main className="w-full min-w-0 flex-1">
          {activeModule === "Products" && <Product />}
          {activeModule === "Customers" && <Customer />}
          {activeModule === "Point of Sale" && <POS />}
          {activeModule === "Sales" && <Sales />}
        </main>

        <footer className="flex flex-col gap-1 border-t border-slate-200 bg-white px-4 py-4 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>RetailFlow POS & Inventory Management</span>
          <span>Currency: Kenyan Shilling (KES)</span>
        </footer>
      </div>
    </div>
  );
}
