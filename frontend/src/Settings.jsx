
import { useEffect, useState } from "react";
import {
  Users,
  ShieldCheck,
  Building2,
  LockKeyhole,
  X,
} from "lucide-react";

const settingsSections = [
  {
    title: "Employee Management",
    description: "Create employee accounts and manage existing employees.",
    icon: Users,
    key: "employees",
  },
  {
    title: "Roles & Permissions",
    description: "Manage access for administrators, cashiers and storekeepers.",
    icon: ShieldCheck,
    key: "permissions",
  },
  {
    title: "Business Settings",
    description: "Configure your business information and receipt details.",
    icon: Building2,
    key: "business",
  },
  {
    title: "Security Settings",
    description: "Manage account security and password settings.",
    icon: LockKeyhole,
    key: "security",
  },
];

export default function Settings({ token }) {
  const [activeSection, setActiveSection] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeError, setEmployeeError] = useState("");
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formSuccessIsWarning, setFormSuccessIsWarning] = useState(false);
  const [updatingEmployeeId, setUpdatingEmployeeId] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");

  const [businessSettings, setBusinessSettings] = useState({
    business_name: "",
    phone: "",
    email: "",
    address: "",
    currency: "KES",
    receipt_header: "",
    receipt_footer: "Thank you for shopping with us!",
    tax_enabled: false,
    tax_rate: 0,
  });

  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [businessError, setBusinessError] = useState("");
  const [businessSuccess, setBusinessSuccess] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  
  const [employeeForm, setEmployeeForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    role: "cashier",
  });

  useEffect(() => {
  if (activeSection !== "employees" || !token) return;

  async function loadEmployees() {
    setLoadingEmployees(true);
    setEmployeeError("");

    try {
      const response = await fetch("http://localhost:5000/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load employees.");
      }

      setEmployees(data.users || []);
    } catch (error) {
      setEmployeeError(error.message);
    } finally {
      setLoadingEmployees(false);
    }
  }

  loadEmployees();
 }, [activeSection, token]);

 useEffect(() => {
  if (activeSection !== "business" || !token) return;

  async function loadBusinessSettings() {
    setLoadingBusiness(true);
    setBusinessError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/settings/business",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load business settings."
        );
      }

      setBusinessSettings({
        ...data.data,
        tax_enabled: Boolean(data.data.tax_enabled),
        tax_rate: Number(data.data.tax_rate),
      });
    } catch (error) {
      setBusinessError(error.message);
    } finally {
      setLoadingBusiness(false);
    }
  }

  loadBusinessSettings();
 }, [activeSection, token]);

 async function handleCreateEmployee(event) {
  event.preventDefault();

  setFormError("");
  setFormSuccess("");
  setSavingEmployee(true);

  try {
    const response = await fetch("http://localhost:5000/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(employeeForm),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to create employee.");
    }

    setEmployees((previous) => [data.user, ...previous]);

    setFormSuccess(data.message);
    setFormSuccessIsWarning(!data.credentialsEmailSent);

    setEmployeeForm({
      full_name: "",
      username: "",
      email: "",
      password: "",
      role: "cashier",
    });

    setShowEmployeeForm(false);
  } catch (error) {
    setFormError(error.message);
  } finally {
    setSavingEmployee(false);
  }
  }
  
  async function handleToggleEmployeeStatus(employee) {
    const newStatus = employee.is_active ? 0 : 1;

    const action = newStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${employee.full_name}?`
    );

    if (!confirmed) return;

    setUpdatingEmployeeId(employee.id);
    setStatusError("");
    setStatusSuccess("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/users/${employee.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_active: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update employee status.");
      }

      setEmployees((previous) =>
        previous.map((item) =>
          item.id === employee.id ? data.user : item
        )
      );

      setStatusSuccess(
        `${employee.full_name} has been ${newStatus ? "activated" : "deactivated"} successfully.`
      );
    } catch (error) {
      setStatusError(error.message);
    } finally {
      setUpdatingEmployeeId(null);
    }
  }

  async function handleSaveBusinessSettings(event) {
    event.preventDefault();

    setSavingBusiness(true);
    setBusinessError("");
    setBusinessSuccess("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/settings/business",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...businessSettings,
            tax_rate: Number(businessSettings.tax_rate),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to save business settings."
        );
      }

      setBusinessSettings({
        ...data.data,
        tax_enabled: Boolean(data.data.tax_enabled),
        tax_rate: Number(data.data.tax_rate),
      });

      setBusinessSuccess("Business settings saved successfully.");
    } catch (error) {
      setBusinessError(error.message);
    } finally {
      setSavingBusiness(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.new_password !== passwordForm.confirm_password) {
    setPasswordError("New password and confirmation do not match.");
    return;
  }

    if (passwordForm.new_password.length < 12) {
    setPasswordError("New password must contain at least 12 characters.");
    return;
  }

    setSavingPassword(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/users/change-password",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: passwordForm.current_password,
            new_password: passwordForm.new_password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to change password.");
      }

      setPasswordSuccess(
        "Password changed successfully. Please log in again."
      );

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Settings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your 7 to 7 system configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {settingsSections.map(({ title, description, icon: Icon, key }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${
              activeSection === key
                ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md"
            }`}
          >
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Icon size={20} />
            </div>

            <h2 className="text-base font-semibold text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          </button>
        ))}
      </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <>
          {activeSection === "employees" && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
                Employee Management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
                View and manage employee accounts.
            </p>

            
            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowEmployeeForm(true);
                  setFormError("");
                  setFormSuccess("");
                  setFormSuccessIsWarning(false);
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                + Create Employee
              </button>
            </div>

            {formSuccess && (
              <p className={`mt-4 rounded-lg p-3 text-sm ${
                formSuccessIsWarning
                  ? "bg-amber-50 text-amber-800"
                  : "bg-green-50 text-green-700"
              }`}>
                {formSuccess}
              </p>
            )}

            {showEmployeeForm && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
                onClick={(event) => {
                  if (event.target === event.currentTarget && !savingEmployee) {
                    setShowEmployeeForm(false);
                  }
                }}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="create-employee-title"
                  className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3
                        id="create-employee-title"
                        className="text-xl font-semibold text-slate-800"
                      >
                        Create Employee
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Enter the employee account details below.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEmployeeForm(false)}
                      disabled={savingEmployee}
                      aria-label="Close create employee form"
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {formError && (
                    <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {formError}
                    </p>
                  )}

                  <form
                    onSubmit={handleCreateEmployee}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                  >
               <div>
                 <label className="mb-1 block text-sm font-medium">
                   Full Name
                 </label>
                 <input
                    type="text"
                    required
                    value={employeeForm.full_name}
                    onChange={(e) =>
                      setEmployeeForm({
                        ...employeeForm,
                        full_name: e.target.value,
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Employee full name"
                 />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.username}
                    onChange={(e) =>
                      setEmployeeForm({
                        ...employeeForm,
                        username: e.target.value,
                    })
                   }
                   className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                   placeholder="Login username"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={employeeForm.email}
                    onChange={(e) =>
                      setEmployeeForm({
                        ...employeeForm,
                        email: e.target.value,
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder="employee@example.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Temporary Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={employeeForm.password}
                    onChange={(e) =>
                      setEmployeeForm({
                        ...employeeForm,
                        password: e.target.value,
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder="At least 12 characters"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Employee Role
                  </label>
                  <select
                    value={employeeForm.role}
                    onChange={(e) =>
                      setEmployeeForm({
                        ...employeeForm,
                        role: e.target.value,
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="storekeeper">Storekeeper</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </div>

                    <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setShowEmployeeForm(false)}
                        disabled={savingEmployee}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingEmployee}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {savingEmployee ? "Creating..." : "Save Employee"}
                      </button>
                    </div>
                  </form>
              </section>
              </div>
            )}
            
            {statusError && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {statusError}
              </p>
            )}
   
            {statusSuccess && (
              <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {statusSuccess}
              </p>
            )}

            {loadingEmployees && (
                <p className="mt-5 text-sm text-slate-500">
                    Loading employees...
                </p>
            )}

            {employeeError && (
                <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {employeeError}
                </p>
            )}

            {!loadingEmployees && !employeeError && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="p-3">Employee</th>
                                <th className="p-3">Username</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {employees.map((employee) => (
                                <tr key={employee.id} className="border-t border-slate-100">
                                    <td className="p-3 font-medium">
                                        {employee.full_name}
                                    </td>

                                    <td className="p-3">
                                        {employee.username}
                                    </td>

                                    <td className="p-3 capitalize">
                                        {employee.role}
                                    </td>

                                    <td className="p-3">
                                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                                            employee.is_active
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                        }`}>
                                            {employee.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>

                                    <td className="p-3">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleEmployeeStatus(employee)}
                                        disabled={updatingEmployeeId === employee.id}
                                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-60 ${
                                          employee.is_active
                                            ? "bg-red-600 hover:bg-red-700"
                                            : "bg-emerald-600 hover:bg-emerald-700"
                                        }`}
                                      >
                                        {updatingEmployeeId === employee.id
                                          ? "Updating..."
                                          : employee.is_active
                                            ? "Deactivate"
                                            : "Activate"}
                                      </button>
                                    </td>
                                </tr>
                            ))}

                            {employees.length === 0 && (
                              <tr>
                                <td colSpan="5" className="p-5 text-center text-slate-500">
                                    No employee accounts found.
                                </td>
                              </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        )}
          

        
          {activeSection === "permissions" && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Roles & Permissions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                View the access privileges assigned to each employee role.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  {
                    role: "Administrator",
                    description: "Full access to all system modules and settings.",
                    color: "blue",
                  },
                  {
                    role: "Cashier",
                    description: "Handles sales, checkout and customer management.",
                    color: "green",
                  },
                  {
                    role: "Storekeeper",
                    description: "Manages products, stock, suppliers and purchases.",
                    color: "orange",
                  },
                ].map((item) => (
                  <div
                    key={item.role}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <h3 className="font-semibold text-slate-800">
                      {item.role}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.description}
                    </p>
                    <span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      Fixed system role
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 overflow-x-auto">
                <h3 className="mb-3 font-semibold text-slate-800">
                  Module Access Matrix
                </h3>

                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">System Module</th>
                      <th className="p-3 text-center">Administrator</th>
                      <th className="p-3 text-center">Cashier</th>
                      <th className="p-3 text-center">Storekeeper</th>
                    </tr>
                  </thead>

                  <tbody>
                    {[
                      ["Overview", true, true, true],
                      ["Point of Sale", true, true, false],
                      ["Sales", true, true, false],
                      ["Customers", true, true, false],
                      ["Products", true, false, true],
                      ["Stock Management", true, false, true],
                      ["Suppliers", true, false, true],
                      ["Purchases", true, false, true],
                      ["Supplier Payment History", true, false, false],
                      ["Settings", true, false, false],
                    ].map(([module, admin, cashier, storekeeper]) => (
                      <tr key={module} className="border-t border-slate-100">
                        <td className="p-3 font-medium text-slate-700">
                          {module}
                        </td>

                        {[admin, cashier, storekeeper].map((allowed, index) => (
                          <td key={index} className="p-3 text-center">
                            {allowed ? (
                              <span className="font-semibold text-green-700">
                                ✓
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                Permissions are predefined by the system and enforced by backend
                authorization. They cannot be edited from this screen.
              </p>
            </div>
          )}

          {activeSection === "business" && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Business Settings
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Configure your business information, currency, receipts and tax.
              </p>

              {loadingBusiness ? (
                <p className="mt-5 text-sm text-slate-500">
                  Loading business settings...
                </p>
              ) : (
                <form
                  onSubmit={handleSaveBusinessSettings}
                  className="mt-6 space-y-6"
                >
                  {businessError && (
                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {businessError}
                    </p>
                  )}

                  {businessSuccess && (
                    <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                      {businessSuccess}
                    </p>
                  )}

                  <div>
                    <h3 className="mb-4 font-semibold text-slate-800">
                      Business Information
                    </h3>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Business Name
                        </label>
                        <input
                          required
                          value={businessSettings.business_name}
                          onChange={(e) =>
                            setBusinessSettings({
                              ...businessSettings,
                              business_name: e.target.value,
                            })
                          }
                          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Phone Number
                        </label>
                        <input
                          value={businessSettings.phone || ""}
                          onChange={(e) =>
                            setBusinessSettings({
                              ...businessSettings,
                              phone: e.target.value,
                            })
                          }
                          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={businessSettings.email || ""}
                          onChange={(e) =>
                            setBusinessSettings({
                              ...businessSettings,
                              email: e.target.value,
                            })
                          }
                          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Business Address
                        </label>
                        <input
                          value={businessSettings.address || ""}
                          onChange={(e) =>
                            setBusinessSettings({
                              ...businessSettings,
                              address: e.target.value,
                            })
                          }
                          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Currency
                        </label>
                        <select
                          value={businessSettings.currency}
                          onChange={(e) =>
                            setBusinessSettings({
                              ...businessSettings,
                              currency: e.target.value,
                            })
                          }
                          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        >
                          <option value="KES">KES - Kenyan Shilling</option>
                          <option value="USD">USD - US Dollar</option>
                          
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-5">
                    <h3 className="mb-4 font-semibold text-slate-800">
                      Receipt Configuration
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Receipt Header
                        </label>
                        <input
                          value={businessSettings.receipt_header || ""}
                          onChange={(e) =>
                            setBusinessSettings({
                              ...businessSettings,
                              receipt_header: e.target.value,
                            })
                          }
                          placeholder="Welcome to 7 to 7"
                          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Receipt Footer
                        </label>
                        <textarea
                          rows="3"
                          value={businessSettings.receipt_footer || ""}
                          onChange={(e) =>
                            setBusinessSettings({
                              ...businessSettings,
                              receipt_footer: e.target.value,
                            })
                          }
                          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-5">
                    <h3 className="mb-4 font-semibold text-slate-800">
                      Tax Configuration
                    </h3>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={businessSettings.tax_enabled}
                        onChange={(e) =>
                          setBusinessSettings({
                            ...businessSettings,
                            tax_enabled: e.target.checked,
                          })
                        }
                        className="size-4 accent-emerald-600"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Enable tax
                      </span>
                    </label>

                    {businessSettings.tax_enabled && (
                      <div className="mt-4 max-w-xs">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Tax Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          required
                          value={businessSettings.tax_rate}
                          onChange={(e) =>
                            setBusinessSettings({
                              ...businessSettings,
                              tax_rate: e.target.value,
                            })
                          }
                          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end border-t border-slate-200 pt-5">
                    <button
                      type="submit"
                      disabled={savingBusiness || loadingBusiness}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {savingBusiness ? "Saving..." : "Save Business Settings"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeSection === "security" && (
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Security Settings
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Change your account password to keep your account secure.
              </p>

              <form
                onSubmit={handleChangePassword}
                className="mt-6 max-w-xl space-y-5"
              >
                {passwordError && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {passwordError}
                  </p>
                )}

                {passwordSuccess && (
                  <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    {passwordSuccess}
                  </p>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        current_password: e.target.value,
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        new_password: e.target.value,
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder="At least 12 characters"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirm_password: e.target.value,
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Re-enter new password"
                  />
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {savingPassword ? "Changing Password..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          )}


        
        </>
        </div>
      </div>
    </div>
  );
}
