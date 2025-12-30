import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get } from "../../services/api";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip
} from "recharts";

export default function AdminOverview() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        get("/admin/stats/overview")
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-6 text-slate-300">Loading overview…</div>;
    }

    if (!data || !data.ok) {
        return <div className="p-6 text-red-400">Failed to load overview</div>;
    }

    /* ---------------- KPI NORMALIZATION ---------------- */

    const kpis = {
        totalBookings:
            data.kpis?.totalBookings ??
            data.totalBookings ??
            0,

        confirmedBookings:
            data.kpis?.confirmedBookings ??
            data.confirmedBookings ??
            0,

        cancelledBookings:
            data.kpis?.cancelledBookings ??
            data.cancelledBookings ??
            0,

        pendingPayments:
            data.kpis?.pendingPayments ??
            data.pendingPayments ??
            0,

        revenue:
            data.kpis?.revenue ??
            data.revenue ??
            0,

        refunds:
            data.kpis?.refunds ??
            data.refunds ??
            0
    };

    const recentBookings = data.recentBookings || [];
    const lastReconcile = data.lastReconcile || null;
    const revenueTrend = data.revenueTrend || [];

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-2xl font-semibold">Admin Overview</h1>

            {/* -------- ALERT -------- */}
            {kpis.pendingPayments > 0 ? (
                <div className="p-3 rounded bg-rose-600/20 text-rose-300">
                    ⚠ {kpis.pendingPayments} bookings awaiting payment
                </div>
            ) : (
                <div className="p-3 rounded bg-emerald-600/20 text-emerald-300">
                    ✅ No stuck payments
                </div>
            )}

            {/* -------- KPI CARDS -------- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <KpiCard label="Total Bookings" value={kpis.totalBookings} />
                <KpiCard label="Confirmed" value={kpis.confirmedBookings} tone="success" />
                <KpiCard label="Pending Payments" value={kpis.pendingPayments} tone="warning" />
                <KpiCard label="Cancelled" value={kpis.cancelledBookings} tone="danger" />
                <KpiCard label="Revenue" value={`₹${kpis.revenue}`} tone="success" />
                <KpiCard label="Refunds" value={`₹${kpis.refunds}`} tone="danger" />
            </div>

            {/* -------- CHARTS -------- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* BOOKINGS BY STATUS */}
                <div className="panel-3d p-4">
                    <h3 className="text-sm font-semibold mb-3">Bookings by Status</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                            data={[
                                { name: "Confirmed", value: kpis.confirmedBookings, fill: "confirmed" },
                                { name: "Pending", value: kpis.pendingPayments, fill: "pending" },
                                { name: "Cancelled", value: kpis.cancelledBookings, fill: "cancelled" }
                            ]}
                        >
                            {/* Gradient definitions */}
                            <defs>
                                <linearGradient id="gradConfirmed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#34d399" />
                                    <stop offset="100%" stopColor="#059669" />
                                </linearGradient>

                                <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#fbbf24" />
                                    <stop offset="100%" stopColor="#d97706" />
                                </linearGradient>

                                <linearGradient id="gradCancelled" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#fb7185" />
                                    <stop offset="100%" stopColor="#be123c" />
                                </linearGradient>
                            </defs>

                            <XAxis
                                dataKey="name"
                                stroke="#94a3b8"
                                tick={{ fill: "#cbd5f5", fontSize: 12 }}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                tick={{ fill: "#cbd5f5", fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#020617",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: 8
                                }}
                                labelStyle={{ color: "#e5e7eb" }}
                                itemStyle={{ color: "#e5e7eb" }}
                            />

                            <Bar
                                dataKey="value"
                                radius={[8, 8, 0, 0]}
                                isAnimationActive
                                animationDuration={700}
                            >
                                {/* 🔥 COLOR PER BAR */}
                                <Cell fill="url(#gradConfirmed)" />
                                <Cell fill="url(#gradPending)" />
                                <Cell fill="url(#gradCancelled)" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>


                </div>

                {/* REVENUE TREND */}
                <div className="panel-3d p-4">
                    <h3 className="text-sm font-semibold mb-3">Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={revenueTrend}>
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line dataKey="amount" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* -------- RECENT BOOKINGS -------- */}
            <div className="panel-3d p-4">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold">Recent Bookings</h2>
                    <Link to="/admin/bookings" className="text-sm text-cyan-400">
                        View all →
                    </Link>
                </div>

                {recentBookings.length === 0 ? (
                    <div className="text-slate-400">No bookings yet</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="text-slate-400">
                            <tr>
                                <th>Ref</th>
                                <th>Status</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentBookings.map((b) => (
                                <tr key={b._id} className="border-t border-white/6">
                                    <td>{b.bookingRef}</td>
                                    <td>{b.paymentStatus}</td>
                                    <td>₹{b.price?.amount ?? 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* -------- LAST RECONCILIATION -------- */}
            <div className="panel-3d p-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold">Last Reconciliation</h2>
                    <Link to="/admin/reconciliation" className="text-sm text-cyan-400">
                        Open →
                    </Link>
                </div>

                {lastReconcile ? (
                    <div className="text-sm text-slate-300 mt-2">
                        Run at: {new Date(lastReconcile.runAt).toLocaleString()} <br />
                        Processed: {lastReconcile.processedCount} <br />
                        Updated: {lastReconcile.updatedCount}
                    </div>
                ) : (
                    <div className="text-slate-400 mt-2">
                        No reconciliation runs yet
                    </div>
                )}
            </div>
        </div>
    );
}

/* ---------------- COMPONENTS ---------------- */

function KpiCard({ label, value, tone = "neutral" }) {
    const tones = {
        neutral: "bg-white/5 border-white/10",
        success: "bg-emerald-500/10 border-emerald-400/30 text-emerald-300",
        warning: "bg-amber-500/10 border-amber-400/30 text-amber-300",
        danger: "bg-rose-500/10 border-rose-400/30 text-rose-300"
    };

    return (
        <div className={`rounded-xl border p-4 ${tones[tone]}`}>
            <div className="text-xs uppercase tracking-wide text-slate-400">
                {label}
            </div>
            <div className="text-2xl font-semibold mt-2">
                {value ?? "—"}
            </div>
        </div>
    );
}
