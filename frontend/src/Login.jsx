
import { useState } from "react";
import brandLogo from "./assets/lux-logo.svg";
import { Eye, EyeOff, Mail, UserRound, LockKeyhole } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL}/auth`;

function Login({ onLogin, onShowSignUp }) {
  const [form, setForm] = useState({
    business_email: "",
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [view, setView] = useState(() =>
    new URLSearchParams(window.location.search).has("resetToken")
      ? "reset"
      : "login"
  );

  const resetToken = new URLSearchParams(
    window.location.search
  ).get("resetToken");

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
    setLoading(true);

    try {
      const response = await fetch(`${API}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (!data.token || !data.user) {
        throw new Error("Invalid login response from server.");
      }

      onLogin(data);
    } catch (error) {
      setError(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_email: form.business_email,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to request a password reset."
        );
      }

      setMessage(data.message);
    } catch (requestError) {
      setError(
        requestError.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: resetToken,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to reset your password.");
      }

      window.history.replaceState({}, "", window.location.pathname);
      setView("reset-success");
      setMessage(data.message);
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(
        requestError.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  function showLogin() {
    setError("");
    setMessage("");
    setView("login");
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100";

  const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-10">

      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-32 -top-32 size-80 rounded-full bg-green-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 size-96 rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="relative w-full max-w-md">

        {/* Login card */}
        <div className="rounded-3xl border border-white bg-white/95 p-7 shadow-2xl shadow-green-900/10 sm:p-10">

          {/* Brand */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-3 flex size-16 items-center justify-center rounded-2xl bg-green-50 p-2 shadow-sm ring-1 ring-green-100">
              <img
                src={brandLogo}
                alt="LUX logo"
                className="size-full object-contain"
              />
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-green-800">
              LUX
            </h1>

            <p className="mt-1 text-[10px] font-bold tracking-[0.25em] text-green-700/70">
              POS & INVENTORY
            </p>
          </div>

          {/* Heading */}
          <div className="mb-7 text-center">
            {view === "login" ? (
              <>
                <p className="mb-2 text-xs font-bold tracking-[0.2em] text-green-700">
                  WELCOME BACK
                </p>

                <h2 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                  Sign in to Lux
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Enter your login details to continue.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">
                  {view === "forgot"
                    ? "Reset your password"
                    : view === "reset"
                      ? "Choose a new password"
                      : "Password updated"}
                </h2>

                {(view === "forgot" || view === "reset") && (
                  <p className="mt-2 text-sm text-slate-500">
                    {view === "forgot"
                      ? "Enter the email address linked to your employee account."
                      : "Choose a new password with at least 12 characters."}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Error and success messages */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {/* LOGIN */}
          {view === "login" && (
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className={labelClass}>
                  Business Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    name="business_email"
                    value={form.business_email}
                    onChange={handleChange}
                    required
                    autoComplete="organization"
                    className={inputClass}
                    placeholder="Enter your business email"
                  />
                </div>
              </div>

              
              <div>
                <label className={labelClass}>
                  Username <span className="font-normal text-slate-400">(Optional for business administrators)</span>
                </label>

                <div className="relative">
                  <UserRound
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    autoComplete="username"
                    className={inputClass}
                    placeholder="Enter your username (employees)"
                  />
                </div>
              </div>


              <div>
                <label className={labelClass}>
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={showLoginPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    className={`${inputClass} pr-12`}
                    placeholder="Enter your password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowLoginPassword(!showLoginPassword)
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-green-700"
                    aria-label={
                      showLoginPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showLoginPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMessage("");
                    setView("forgot");
                  }}
                  className="text-sm font-semibold text-green-700 transition hover:text-green-900"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-700/20 transition duration-200 hover:-translate-y-0.5 hover:bg-green-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {view === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className={labelClass}>
                  Business Email
                </label>

                <input
                  type="email"
                  name="business_email"
                  value={form.business_email}
                  onChange={handleChange}
                  required
                  autoComplete="organization"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  placeholder="Enter your business email"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Email address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  placeholder="Enter your account email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-green-700 py-3.5 text-sm font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>

              <button
                type="button"
                onClick={showLogin}
                className="w-full py-2 text-sm font-semibold text-slate-500 transition hover:text-green-700"
              >
                Back to sign in
              </button>
            </form>
          )}

          {/* RESET PASSWORD */}
          {view === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className={labelClass}>
                  New password
                </label>

                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(event.target.value)
                    }
                    required
                    minLength={12}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-sm outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                    placeholder="At least 12 characters"
                  />

                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-700"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Confirm new password
                </label>

                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    required
                    minLength={12}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-sm outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                    placeholder="Re-enter your new password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-700"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-green-700 py-3.5 text-sm font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
              >
                {loading ? "Updating..." : "Update password"}
              </button>

              <button
                type="button"
                onClick={showLogin}
                className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-green-700"
              >
                Back to sign in
              </button>
            </form>
          )}

          {/* PASSWORD RESET SUCCESS */}
          {view === "reset-success" && (
            <button
              type="button"
              onClick={showLogin}
              className="w-full rounded-xl bg-green-700 py-3.5 text-sm font-bold text-white transition hover:bg-green-800"
            >
              Back to sign in
            </button>
          )}

          {/* Footer */}
          {view === "login" && (
            <div className="mt-7 border-t border-slate-100 pt-6 text-center">
              <p className="text-sm text-slate-500">
                New to Lux?{" "}
                <button
                  type="button"
                  onClick={onShowSignUp}
                  className="font-bold text-green-700 transition hover:text-green-900"
                >
                  Create an account
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs font-medium tracking-wide text-slate-400">
          Secure business access · Powered by Lux
        </p>
      </div>
    </div>
  );
}

export default Login;
