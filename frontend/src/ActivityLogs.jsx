import { useEffect, useState } from "react";
import {
  History,
  Search,
  RefreshCw,
  User,
  Calendar,
  Monitor,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

export default function ActivityLogs({ token }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionFilter, setActionFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter, startDate, endDate, logs.length]);

  useEffect(() => {
    let active = true;

    async function fetchActivityLogs() {
      try {
        const response = await fetch(`${API_BASE}/activity-logs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load activity logs.");
        }

        if (active) {
          setLogs(Array.isArray(data.logs) ? data.logs : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load activity logs.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchActivityLogs();
    return () => {
      active = false;
    };
  }, [token, refreshKey]);

  function refreshActivityLogs() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredLogs = logs.filter((log) => {
    // 1. Search filter
    const matchesSearch = [
      log.employee_name,
      log.username,
      log.action,
      log.description,
      log.entity_type,
      log.entity_id,
      log.ip_address,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedSearch)
    );

    // 2. Action filter
    const matchesAction =
      actionFilter === "all" || log.action === actionFilter;

    // 3. Date filters
    const logDate = log.created_at
      ? new Date(log.created_at)
      : null;

    const matchesStartDate =
      !startDate ||
      (logDate &&
        !Number.isNaN(logDate.getTime()) &&
        logDate >= new Date(`${startDate}T00:00:00`));

    const matchesEndDate =
      !endDate ||
      (logDate &&
        !Number.isNaN(logDate.getTime()) &&
        logDate <= new Date(`${endDate}T23:59:59.999`));

    return (
      matchesSearch &&
      matchesAction &&
      matchesStartDate &&
      matchesEndDate
    );
  });

  // Audit Trail Statistics
  const totalActivities = logs.length;

  const today = new Date();
  const todayActivities = logs.filter((log) => {
    if (!log.created_at) return false;

    const activityDate = new Date(log.created_at);

    return (
      !Number.isNaN(activityDate.getTime()) &&
      activityDate.getDate() === today.getDate() &&
      activityDate.getMonth() === today.getMonth() &&
      activityDate.getFullYear() === today.getFullYear()
    );
  }).length;

  const activeEmployees = new Set(
    logs
      .filter((log) => log.user_id != null)
      .map((log) => log.user_id)
  ).size;

  const activityTypes = new Set(
    logs.map((log) => log.action).filter(Boolean)
  ).size;

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Audit Trail</h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor activities performed by employees.
            </p>
          </div>

          <button
            onClick={refreshActivityLogs}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* Audit Trail Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* Total Activities */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Activities
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-800">
                  {totalActivities}
                </h3>
              </div>
              <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <History size={22} />
              </span>
            </div>
          </div>

          {/* Today's Activities */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Today's Activities
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-800">
                  {todayActivities}
                </h3>
              </div>
              <span className="grid size-11 place-items-center rounded-xl bg-green-50 text-green-700">
                <Calendar size={22} />
              </span>
            </div>
          </div>

          {/* Active Employees */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active Employees
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-800">
                  {activeEmployees}
                </h3>
              </div>
              <span className="grid size-11 place-items-center rounded-xl bg-purple-50 text-purple-700">
                <User size={22} />
              </span>
            </div>
          </div>

          {/* Activity Types */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Activity Types
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-800">
                  {activityTypes}
                </h3>
              </div>
              <span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700">
                <Monitor size={22} />
              </span>
            </div>
          </div>

        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-green-50 text-green-700">
              <History size={20} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-800">Employee Activities</h2>
              <p className="text-xs text-slate-500">
                {filteredLogs.length} of {logs.length} records
              </p>
            </div>
          </div>
          <label className="relative block sm:w-72">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activities..."
              aria-label="Search audit trail"
              className="min-h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">

          {/* Action Filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Filter by Action
            </label>

            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-green-500"
            >
              <option value="all">All Activities</option>

              {[...new Set(logs.map((log) => log.action).filter(Boolean))]
                .sort()
                .map((action) => (
                  <option key={action} value={action}>
                    {action.replaceAll("_", " ")}
                  </option>
                ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Start Date
            </label>

            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
              className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-green-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              End Date
            </label>

            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-green-500"
            />
          </div>

        </div>

        {/* Clear Filters */}
        <div className="flex justify-end border-b border-slate-200 px-5 py-2">
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActionFilter("all");
              setStartDate("");
              setEndDate("");
            }}
            className="text-xs font-semibold text-green-700 hover:text-green-900"
          >
            Clear all filters
          </button>
        </div>

        {error ? (
          <div className="m-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <button
              onClick={refreshActivityLogs}
              disabled={loading}
              className="font-semibold underline underline-offset-2 disabled:opacity-60"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Loading activity logs...
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {logs.length === 0
              ? "No activity records found."
              : "No activities match your search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">Employee</th>
                  <th scope="col" className="px-5 py-3">Action</th>
                  <th scope="col" className="px-5 py-3">Description</th>
                  <th scope="col" className="px-5 py-3">Record</th>
                  <th scope="col" className="px-5 py-3">IP Address</th>
                  <th scope="col" className="px-5 py-3">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map((log) => {
                  const createdAt = log.created_at
                    ? new Date(log.created_at)
                    : null;

                  return (
                    <tr key={log.id} className="align-top hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2">
                          <User size={16} className="mt-0.5 shrink-0 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-800">
                              {log.employee_name || "Unknown employee"}
                            </p>
                            <p className="text-xs text-slate-500">
                              @{log.username || "unknown"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-800">
                          {String(log.action || "Unknown action").replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="max-w-sm whitespace-normal break-words px-5 py-4 text-slate-600">
                        {log.description || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {log.entity_type
                          ? `${String(log.entity_type).replaceAll("_", " ")} #${log.entity_id ?? "—"}`
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Monitor size={14} className="text-slate-400" />
                          {log.ip_address || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-400" />
                          {createdAt && !Number.isNaN(createdAt.getTime())
                            ? createdAt.toLocaleString()
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </section>
        {/* Pagination Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
           <p className="text-sm text-slate-500">
             Showing{" "}
             {filteredLogs.length === 0 ? 0 : startIndex + 1}{" "}
             to {Math.min(endIndex, filteredLogs.length)} of{" "}
             {filteredLogs.length} activities
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCurrentPage((previous) => Math.max(previous - 1, 1))
                }
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm font-medium text-slate-600">
                Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((previous) =>
                    Math.min(previous + 1, totalPages)
                  )
                }
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}