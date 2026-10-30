
import { useEffect, useState } from "react";
import {
  Users,
  ShieldCheck,
  Building2,
  LockKeyhole,
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
  const [updatingEmployeeId, setUpdatingEmployeeId] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  
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

    setFormSuccess("Employee account created successfully.");

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

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
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
            className={`rounded-xl border p-5 text-left transition ${
              activeSection === key
                ? "border-green-600 bg-green-50"
                : "border-slate-200 bg-white hover:border-green-300"
            }`}
          >
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <Icon size={20} />
            </div>

            <h2 className="font-semibold text-slate-800">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
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
                   setShowEmployeeForm(!showEmployeeForm);
                   setFormError("");
                   setFormSuccess("");
                }}
                className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
              >
                {showEmployeeForm ? "Cancel" : "+ Create Employee"}
              </button>
            </div>

            {formSuccess && (
              <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {formSuccess}
              </p>
            )}

            {formError && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}

            {showEmployeeForm && (
              <form
                onSubmit={handleCreateEmployee}
                className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
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
                   className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                   placeholder="Login username"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={employeeForm.email}
                    onChange={(e) =>
                      setEmployeeForm({
                        ...employeeForm,
                        email: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="storekeeper">Storekeeper</option>
                    <option value="administrator">Administrator</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={savingEmployee}
                    className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                  >
                    {savingEmployee ? "Creating..." : "Save Employee"}
                  </button>
                </div>
              </form>
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
                <div className="mt-5 overflow-x-auto">
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
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
                                          employee.is_active
                                            ? "bg-red-600 hover:bg-red-700"
                                            : "bg-green-700 hover:bg-green-800"
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
          <h2 className="text-lg font-semibold text-slate-800">
            Roles & Permissions
          </h2>
        )}

        {activeSection === "business" && (
          <h2 className="text-lg font-semibold text-slate-800">
            Business Settings
          </h2>
        )}

        {activeSection === "security" && (
          <h2 className="text-lg font-semibold text-slate-800">
            Security Settings
          </h2>
        )}
      </div>
    </div>
  );
}
