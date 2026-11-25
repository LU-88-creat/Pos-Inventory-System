
import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  CalendarDays,
  Users,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
} from "lucide-react";

import { apiFetch } from "./api";

export default function SubscriptionManagement() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [changingPlan, setChangingPlan] = useState(false);
  const [changeMessage, setChangeMessage] = useState("");
  const [changeError, setChangeError] = useState("");

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/subscriptions/current`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to retrieve subscription details."
        );
      }

      setSubscription(result.subscription);
    } catch (err) {
      setError(
        err.message || "Unable to load subscription information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Retrieve available subscription plans and their features.
  const loadPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      setPlansError("");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/subscriptions/plans`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to retrieve subscription plans."
        );
      }

      setPlans(result.plans || []);
    } catch (err) {
      setPlansError(
        err.message || "Unable to load subscription plans."
      );
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubscription();
    void loadPlans();
  }, [loadSubscription, loadPlans]);

  async function handlePlanChange(planId) {
    const selectedPlan = plans.find(
      (plan) => Number(plan.id) === Number(planId)
    );

    const confirmed = window.confirm(
      `Are you sure you want to select the ${selectedPlan?.plan_name || "selected"} plan using ${billingCycle} billing?\n\nHigher-tier upgrades take effect immediately. Downgrades and billing-cycle changes are scheduled for the next subscription boundary.`
    );

    if (!confirmed) return;

    try {
    setChangingPlan(true);
    setChangeMessage("");
    setChangeError("");

    const response = await apiFetch(
      `${import.meta.env.VITE_API_URL}/subscriptions/change-plan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: Number(planId),
          billing_cycle: billingCycle,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to change subscription plan."
      );
    }

    setChangeMessage(result.message);

    await loadSubscription();
  } catch (err) {
    setChangeError(
      err.message || "Unable to change subscription plan."
    );
  } finally {
    setChangingPlan(false);
  }
}

  function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Not available";

    return date.toLocaleDateString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatStatus(status) {
    if (!status) return "Unknown";

    return status.replace("_", " ").replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
  }

  const statusStyles = {
    trial: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    past_due: "bg-amber-100 text-amber-700",
    expired: "bg-red-100 text-red-700",
    suspended: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-700",
  };

  const pageHeader = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CreditCard size={17} />
          <span>Billing &amp; subscription</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Subscription Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          View your plan, billing dates, and subscription access.
        </p>
      </div>

      <button
        type="button"
        onClick={loadSubscription}
        disabled={loading}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        Refresh
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {pageHeader}
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
            <RefreshCw size={30} className="animate-spin text-green-600" />
            <p className="text-sm">Loading subscription information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {pageHeader}
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <h2 className="font-semibold">Unable to load subscription</h2>
              <p className="mt-1 text-sm">{error}</p>
              <button
                type="button"
                onClick={loadSubscription}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) return null;

  const status = subscription.status?.toLowerCase();
  const statusClass =
    statusStyles[status] || "bg-slate-100 text-slate-700";

  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {pageHeader}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-green-100 text-green-700">
                <CreditCard size={24} />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Current subscription plan
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {subscription.plan_name || "Unknown Plan"}
                </h2>
              </div>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
            >
              {formatStatus(subscription.status)}
            </span>
          </div>

          <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Billing cycle</p>
              <p className="mt-1 font-semibold capitalize text-slate-800">
                {subscription.billing_cycle || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Plan code</p>
              <p className="mt-1 font-semibold text-slate-800">
                {subscription.plan_code || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Subscription start</p>
              <p className="mt-1 font-semibold text-slate-800">
                {formatDate(subscription.start_date)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Trial expiry</p>
              <p className="mt-1 font-semibold text-slate-800">
                {formatDate(subscription.trial_ends_at)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-blue-100 text-blue-700">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Subscription access</p>
              <h2 className="mt-1 font-bold text-slate-900">
                {Number(subscription.has_access) === 1
                  ? "Access Granted"
                  : "Access Restricted"}
              </h2>
            </div>
          </div>

          <div
            className={`mt-6 rounded-lg p-4 text-sm ${
              Number(subscription.has_access) === 1
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {Number(subscription.has_access) === 1
              ? "Your business currently has access to Lux."
              : "Your subscription does not currently grant access to Lux."}
          </div>

          <div className="mt-5 flex items-center gap-3 text-sm text-slate-600">
            <Users size={18} />
            <span>
              Employee limit:{" "}
              <strong>
                {subscription.max_employees ?? "Unlimited"}
              </strong>
            </span>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-slate-900">
          Subscription dates
        </h2>

        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-1 text-green-700" size={20} />
            <div>
              <p className="text-xs text-slate-500">
                Current period starts
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(subscription.current_period_start)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarDays className="mt-1 text-green-700" size={20} />
            <div>
              <p className="text-xs text-slate-500">
                Current period ends
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(subscription.current_period_end)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="mt-1 text-amber-600" size={20} />
            <div>
              <p className="text-xs text-slate-500">
                Grace period ends
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(subscription.grace_period_ends_at)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {subscription.pending_plan_id && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <Clock size={21} />
            </div>

            <div className="flex-1">
              <h2 className="font-semibold text-amber-900">
                Subscription change scheduled
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Your subscription will automatically change on the scheduled date.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-amber-700">New plan</p>
                  <p className="mt-1 font-semibold text-amber-950">
                    {subscription.pending_plan_name || "Pending plan"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-amber-700">New billing cycle</p>
                  <p className="mt-1 font-semibold capitalize text-amber-950">
                    {subscription.pending_billing_cycle || "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-amber-700">Effective date</p>
                  <p className="mt-1 font-semibold text-amber-950">
                    {formatDate(subscription.scheduled_change_date)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Available Subscription Plans */}
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Available subscription plans
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Compare plans and the features included in each.
            </p>
          </div>

          <div className="w-full sm:w-56">
            <label
              htmlFor="billingCycle"
              className="block text-sm font-medium text-slate-700"
            >
              Billing cycle
            </label>
            <select
              id="billingCycle"
              value={billingCycle}
              onChange={(event) => setBillingCycle(event.target.value)}
              disabled={changingPlan}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>

        {changeMessage && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {changeMessage}
          </div>
        )}

        {changeError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {changeError}
          </div>
        )}

        {plansLoading ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
            <RefreshCw size={28} className="animate-spin text-green-600" />
            <p className="text-sm">Loading subscription plans...</p>
          </div>
        ) : plansError ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm">{plansError}</p>
              <button
                type="button"
                onClick={loadPlans}
                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            No active subscription plans are currently available.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => {
                const isCurrentPlan =
                  Number(plan.id) === Number(subscription.plan_id);

                return (
                  <article
                    key={plan.id}
                    className={`relative rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6 ${
                      isCurrentPlan
                        ? "border-green-500 ring-2 ring-green-100"
                        : "border-slate-200 hover:border-green-300"
                    }`}
                  >
                    {isCurrentPlan && (
                      <span className="absolute right-4 top-4 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Current Plan
                      </span>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-xl bg-green-100 text-green-700">
                        <Layers size={21} />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900">
                          {plan.plan_name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {plan.plan_code}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 min-h-12 text-sm leading-6 text-slate-500">
                      {plan.description}
                    </p>

                    <div className="mt-5 border-y border-slate-100 py-5">
                      <p className="text-xs text-slate-500">
                        Monthly price
                      </p>
                      <p className="mt-1 text-2xl font-bold text-green-700">
                        {plan.currency}{" "}
                        {Number(plan.monthly_price).toLocaleString("en-KE", {
                          minimumFractionDigits: 2,
                        })}
                      </p>

                      <p className="mt-4 text-xs text-slate-500">
                        Annual price
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-800">
                        {plan.currency}{" "}
                        {Number(plan.annual_price).toLocaleString("en-KE", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center gap-2 text-sm text-slate-700">
                      <Users size={17} className="text-green-700" />
                      <span>
                        Employee limit:{" "}
                        <strong>
                          {plan.max_employees ?? "Unlimited"}
                        </strong>
                      </span>
                    </div>

                    <div className="mt-6">
                      <h4 className="mb-4 text-sm font-semibold text-slate-900">
                        Included Features
                      </h4>

                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li
                            key={feature.feature_code}
                            className="flex items-start gap-2 text-sm"
                          >
                            {Number(feature.is_enabled) === 1 ? (
                              <CheckCircle2
                                size={17}
                                className="mt-0.5 shrink-0 text-green-600"
                              />
                            ) : (
                              <XCircle
                                size={17}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />
                            )}

                            <span
                              className={
                                Number(feature.is_enabled) === 1
                                  ? "text-slate-700"
                                  : "text-slate-400"
                                }
                            >
                                {feature.feature_name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-7 border-t border-slate-100 pt-5">
                      <button
                        type="button"
                        disabled={
                          changingPlan ||
                          Boolean(subscription.pending_plan_id) ||
                          (isCurrentPlan &&
                            billingCycle === subscription.billing_cycle)
                        }
                        onClick={() => handlePlanChange(plan.id)}
                        className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                          changingPlan ||
                          Boolean(subscription.pending_plan_id) ||
                          (isCurrentPlan &&
                            billingCycle === subscription.billing_cycle)
                            ? "cursor-not-allowed bg-slate-100 text-slate-400 shadow-none focus:ring-0"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {subscription.pending_plan_id
                          ? "Change Already Scheduled"
                          : changingPlan
                            ? "Processing..."
                            : isCurrentPlan &&
                                billingCycle === subscription.billing_cycle
                            ? "Current Plan"
                            : isCurrentPlan
                              ? "Change Billing Cycle"
                              : "Select This Plan"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
