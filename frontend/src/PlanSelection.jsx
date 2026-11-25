
import { useEffect, useState } from "react";
import brandLogo from "./assets/lux-logo.svg";

const API = `${import.meta.env.VITE_API_URL}/subscriptions`;

function PlanSelection({ registrationToken, onPlanSelected, onBack }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch(`${API}/plans`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load plans.");
        }

        setPlans(data.plans || []);

        if (data.plans?.length) {
          setSelectedPlan(data.plans[0].id);
        }
      } catch (requestError) {
        setError(requestError.message || "Unable to load subscription plans.");
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  async function handleSelectPlan() {
    setError("");

    if (!selectedPlan) {
      setError("Please select a subscription plan.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API}/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${registrationToken}`,
        },
        body: JSON.stringify({
          plan_id: selectedPlan,
          billing_cycle: billingCycle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to select subscription plan.");
      }

      onPlanSelected(data);
    } catch (requestError) {
      setError(
        requestError.message || "Unable to connect to the server."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatPrice(value, currency) {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(Number(value));
  }

  return (
    <div className="min-h-screen bg-green-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          <img
            src={brandLogo}
            alt="LUX logo"
            className="size-12 rounded-xl bg-white object-contain p-0.5 shadow-sm"
          />
          <div>
            <h1 className="text-3xl font-bold text-green-700">LUX</h1>
            <p className="text-[10px] font-bold tracking-[0.18em] text-green-700/70">
              POS & INVENTORY
            </p>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-slate-800">
            Choose your subscription plan
          </h2>
          <p className="text-slate-600">
            Every plan starts with a 14-day free trial.
          </p>
        </div>

        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-lg border border-green-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-md px-5 py-2 text-sm font-medium ${
                billingCycle === "monthly"
                  ? "bg-green-700 text-white"
                  : "text-slate-600 hover:bg-green-50"
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`rounded-md px-5 py-2 text-sm font-medium ${
                billingCycle === "annual"
                  ? "bg-green-700 text-white"
                  : "text-slate-600 hover:bg-green-50"
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-auto mb-6 max-w-2xl rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-slate-600">
            Loading subscription plans...
          </p>
        ) : plans.length === 0 ? (
          <p className="py-12 text-center text-slate-600">
            No subscription plans are currently available.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const price =
                billingCycle === "annual"
                  ? plan.annual_price
                  : plan.monthly_price;

              const isSelected = selectedPlan === plan.id;

              return (
                <button
                  type="button"
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  aria-pressed={isSelected}
                  className={`flex flex-col rounded-2xl border bg-white p-6 text-left shadow-sm transition ${
                    isSelected
                      ? "border-green-600 ring-2 ring-green-200"
                      : "border-slate-200 hover:border-green-400"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">
                      {plan.plan_name}
                    </h3>

                    {isSelected && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Selected
                      </span>
                    )}
                  </div>

                  <p className="mb-5 min-h-16 text-sm leading-6 text-slate-600">
                    {plan.description}
                  </p>

                  <p className="mb-1 text-3xl font-bold text-green-700">
                    {formatPrice(price, plan.currency)}
                  </p>

                  <p className="mb-5 text-xs text-slate-500">
                    per {billingCycle === "annual" ? "year" : "month"}
                  </p>

                  <div className="mt-auto border-t border-slate-100 pt-4">
                    <p className="text-sm font-medium text-slate-700">
                      {plan.max_employees == null
                        ? "Unlimited employees"
                        : `Up to ${plan.max_employees} employees`}
                    </p>

                    <p className="mt-2 text-sm font-medium text-green-700">
                      Includes 14-day free trial
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mx-auto mt-8 max-w-md space-y-3">
          <button
            type="button"
            onClick={handleSelectPlan}
            disabled={loading || submitting || !selectedPlan}
            className="w-full rounded-lg bg-green-700 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Setting up your subscription..."
              : "Continue with selected plan"}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="w-full py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            Back to registration
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Select a plan to activate your 14-day trial.
        </p>
      </div>
    </div>
  );
}

export default PlanSelection;
