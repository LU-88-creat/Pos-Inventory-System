
import { useState } from "react";
import brandLogo from "./assets/lux-logo.svg";
import { Eye, EyeOff } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL}/auth`;

function SignUp({ onRegistrationComplete, onShowLogin }) {
  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    business_email: "",
    password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      if (!data.registrationToken || !data.business) {
        throw new Error("Invalid registration response from server.");
      }

      onRegistrationComplete(data);
    } catch (requestError) {
      setError(
        requestError.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-green-50 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-green-100 bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img
            src={brandLogo}
            alt="LUX logo"
            className="size-14 rounded-xl bg-white object-contain p-0.5 shadow-sm"
          />

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-green-700">
              LUX
            </h1>
            <p className="text-[10px] font-bold tracking-[0.18em] text-green-700/70">
              POS & INVENTORY
            </p>
          </div>
        </div>

        <h2 className="mb-2 text-center text-2xl font-semibold text-slate-800">
          Create your business account
        </h2>

        <p className="mb-6 text-center text-sm text-slate-500">
          Register your business and choose a subscription plan.
        </p>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              required
              autoComplete="name"
              className={inputClass}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Business Name
            </label>
            <input
              type="text"
              name="business_name"
              value={form.business_name}
              onChange={handleChange}
              required
              autoComplete="organization"
              className={inputClass}
              placeholder="Enter your business name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Business Email
            </label>
            <input
              type="email"
              name="business_email"
              value={form.business_email}
              onChange={handleChange}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="Enter your business email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={12}
                autoComplete="new-password"
                className={`${inputClass} pr-12`}
                placeholder="At least 12 characters"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-green-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Confirm Password
            </label>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                required
                minLength={12}
                autoComplete="new-password"
                className={`${inputClass} pr-12`}
                placeholder="Re-enter your password"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-green-600"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-700 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have a Lux account?{" "}
          <button
            type="button"
            onClick={onShowLogin}
            className="font-semibold text-green-700 hover:text-green-800"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
