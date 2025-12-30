import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../../services/api";

export default function AdminBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const bookingBadge = {
        CONFIRMED: 'bg-green-600/20 text-green-400',
        CANCELLED: 'bg-red-600/20 text-red-400',
        PENDING: 'bg-yellow-600/20 text-yellow-300'
    };

    const paymentBadge = {
        PAID: 'bg-green-600/20 text-green-400',
        PENDING: 'bg-yellow-600/20 text-yellow-300',
        PARTIALLY_REFUNDED: 'bg-orange-600/20 text-orange-300',
        REFUNDED: 'bg-slate-600/20 text-slate-300'
    };

    useEffect(() => {
        async function load() {
            try {
                const res = await get("/admin/bookings");
                setBookings(res.bookings || []);
            } catch (e) {
                setError("Failed to load bookings");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="p-6">Loading…</div>;
    if (error) return <div className="p-6 text-red-400">{error}</div>;

    async function resendPayment(id) {
        if (!window.confirm('Resend payment link to customer?')) return;

        try {
            await post(`/admin/bookings/${id}/resend-payment`);
            alert('Payment link sent successfully');
        } catch (e) {
            alert('Failed to resend payment link');
        }
    }

    return (
        <div className="p-6 bg-[#07102a] min-h-screen text-white">
            <h1 className="text-2xl font-semibold mb-4">Bookings</h1>

            <div className="panel-3d p-4 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="text-slate-400 border-b border-white/10">
                        <tr>
                            <th className="text-left py-2">Booking Reference</th>
                            <th>User</th>
                            <th>Booking Status</th>
                            <th>Payment Status</th>
                            <th>Amount</th>
                            <th>Resend Links</th>
                            <th>Created</th>
                            <th>Reconciliation Attempts</th>
                            <th>Last Reconciled</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map(b => (
                            <tr
                                key={b._id}
                                className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                                onClick={() => navigate(`/admin/bookings/${b._id}`)}
                            >
                                <td className="px-3 py-2 border-r border-white/10">{b.bookingRef}</td>
                                <td className="px-3 py-2 border-r border-white/10">{b.contact?.email || "—"}</td>
                                <td className="px-3 py-2 border-r border-white/10"><span className={`px-2 py-0.5 rounded text-xs ${bookingBadge[b.bookingStatus]}`}>
                                    {b.bookingStatus}
                                </span>
                                </td>
                                <td className="px-3 py-2 border-r border-white/10"><span className={`px-2 py-0.5 rounded text-xs ${paymentBadge[b.paymentStatus]}`}>
                                    {b.paymentStatus}
                                </span>
                                
                                </td>
                                <td className="px-3 py-2 border-r border-white/10">₹{b.price?.amount}</td>
                                <td className="px-3 py-2 border-r border-white/10">
                                    {b.paymentStatus === 'PENDING' && (
                                        <button
                                            onClick={() => resendPayment(b._id)}
                                            className="px-2 py-1 bg-indigo-600 rounded hover:bg-indigo-700"
                                        >
                                            Resend Payment Link
                                        </button>
                                    )}
                                </td>
                                <td className="px-3 py-2 border-r border-white/10">{new Date(b.createdAt).toLocaleString()}</td>
                                <td className="px-3 py-2 border-r border-white/10">{b.reconciliationAttempts || 0}</td>
                                <td className="px-3 py-2 border-r border-white/10">{b.lastReconciledAt ? new Date(b.lastReconciledAt).toLocaleString() : '-'}</td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
