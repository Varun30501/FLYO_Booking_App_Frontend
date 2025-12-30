// src/pages/admin/ReconciliationDashboard.jsx
import React, { useEffect, useState } from "react";
import { get, post } from "../../services/api";
import ReconciliationRunView from "./ReconciliationRunView";

export default function ReconciliationDashboard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [error, setError] = useState(null);

  // provider status
  const [providerStatus, setProviderStatus] = useState(null);

  /* -------------------- INITIAL LOAD + AUTO REFRESH -------------------- */
  useEffect(() => {
    fetchLogs();
    fetchProviderStatus();

    // auto-refresh logs every 30s (scheduler visibility)
    const logsTimer = setInterval(fetchLogs, 30000);
    const providerTimer = setInterval(fetchProviderStatus, 30000);

    return () => {
      clearInterval(logsTimer);
      clearInterval(providerTimer);
    };
    // eslint-disable-next-line
  }, []);

  /* -------------------- PROVIDER STATUS -------------------- */
  async function fetchProviderStatus() {
    try {
      const res = await get("/providers/status");
      if (res) setProviderStatus(res);
    } catch {
      /* non-blocking */
    }
  }

  /* -------------------- FETCH LOGS -------------------- */
  async function fetchLogs() {
    try {
      const res = await get("/admin/reconcile/logs");

      if (res?.ok && Array.isArray(res.logs)) {
        setLogs(res.logs);
        return;
      }

      if (Array.isArray(res)) {
        setLogs(res);
        return;
      }

      setLogs([]);
    } catch (err) {
      console.error("[ReconciliationDashboard] fetchLogs error", err);
      setError("Failed to load reconciliation logs");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------- TRIGGER RECONCILE -------------------- */
  async function triggerReconcile(dryRun = false) {
    setRunning(true);
    setError(null);

    try {
      const res = await post("/admin/reconcile", { dryRun });

      if (res?.ok || res?.success) {
        // logs are written async → give backend a moment
        setTimeout(fetchLogs, 800);
        setSelectedLogId(null);
        return;
      }

      setError("Reconciliation failed");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to run reconciliation");
    } finally {
      setRunning(false);
    }
  }

  /* -------------------- RENDER -------------------- */
  return (
    <div className="p-6 bg-[#07102a] min-h-screen text-white">
      {/* HEADER */}
      <div className="p-4 panel-strong mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Reconciliation</h1>
            <div className="text-sm text-slate-400">
              Monitor and retry pending payments
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Provider status</div>
            {providerStatus?.ok === false ? (
              <div className="mt-1 px-3 py-1 rounded bg-yellow-600 text-black text-sm">
                Provider unavailable
              </div>
            ) : providerStatus ? (
              <div className="mt-1 px-3 py-1 rounded bg-green-700 text-sm">
                Providers OK
              </div>
            ) : (
              <div className="mt-1 px-3 py-1 rounded bg-white/6 text-sm">
                Unknown
              </div>
            )}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 items-center mt-4">
          <button
            onClick={() => triggerReconcile(true)}
            className="px-3 py-2 rounded bg-white/6 hover:bg-white/10"
            disabled={running}
          >
            Dry Run
          </button>

          <button
            onClick={() => triggerReconcile(false)}
            className="px-3 py-2 rounded btn-accent"
            disabled={running}
          >
            {running ? "Running…" : "Run Now"}
          </button>

          <button
            onClick={fetchLogs}
            className="px-3 py-2 rounded bg-white/6 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-red-400">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: RUN LIST */}
        <div className="lg:col-span-1">
          <div className="panel-3d p-4 sticky top-20">
            <div className="flex justify-between mb-3">
              <h2 className="text-sm font-medium">Recent runs</h2>
              <div className="text-xs text-slate-400">{logs.length}</div>
            </div>

            {loading ? (
              <div className="text-slate-300">Loading…</div>
            ) : logs.length === 0 ? (
              <div className="text-slate-400">No runs yet</div>
            ) : (
              <ul className="space-y-2 max-h-[60vh] overflow-auto">
                {logs.map((l) => {
                  const id = l._id;
                  const checked = l.processedCount ?? l.checked ?? 0;
                  const retried = l.updatedCount ?? l.retried ?? 0;
                  const expired = l.expiredCount ?? l.expired ?? 0;
                  const errors = l.failedCount ?? l.errors ?? 0;

                  return (
                    <li
                      key={id}
                      onClick={() => setSelectedLogId(id)}
                      className={`p-3 rounded cursor-pointer border ${
                        selectedLogId === id
                          ? "bg-white/6 border-cyan-400"
                          : "border-white/6 hover:bg-white/4"
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {new Date(l.runAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">By {l.runBy}</div>

                      <div className="text-xs mt-2 space-y-0.5">
                        <div>Checked: {checked}</div>
                        <div className="text-cyan-300">Retried: {retried}</div>
                        <div className="text-yellow-400">Expired: {expired}</div>
                        <div className="text-red-400">Errors: {errors}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT: RUN DETAILS */}
        <div className="lg:col-span-2">
          <div className="panel-3d p-4 min-h-[320px]">
            {selectedLogId ? (
              <ReconciliationRunView logId={selectedLogId} />
            ) : (
              <div className="text-center py-16 text-slate-400">
                <div className="text-lg text-white mb-2">
                  Select a run to view details
                </div>
                <div className="text-sm">
                  Run the reconciler and click a run from the list.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
