// src/pages/admin/AdminLayout.jsx
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuth } from '../../services/auth';

export default function AdminLayout() {
    const navigate = useNavigate();

    function logout() {
        clearAuth();
        navigate('/admin/login');
    }

    return (
        <div className="min-h-screen bg-[#060d22] text-white flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[#07102a] border-r border-white/10 p-4">
                <h2 className="text-lg font-semibold mb-6">Admin Panel</h2>

                <nav className="space-y-2 text-sm">
                    <NavLink
                        to="/admin/overview" className={({ isActive }) =>
                            `block px-3 py-2 rounded ${isActive ? 'bg-cyan-600 text-black' : 'hover:bg-white/10'
                            }`
                        }>
                        Overview
                    </NavLink>
                    <NavLink
                        to="/admin/exports" className={({ isActive }) =>
                            `block px-3 py-2 rounded ${isActive ? 'bg-cyan-600 text-black' : 'hover:bg-white/10'
                            }`
                        }>
                        Exports
                    </NavLink>
                    <NavLink
                        to="/admin/reconciliation"
                        className={({ isActive }) =>
                            `block px-3 py-2 rounded ${isActive ? 'bg-cyan-600 text-black' : 'hover:bg-white/10'
                            }`
                        }
                    >
                        Reconciliation
                    </NavLink>
                    {/* Future modules */}
                    <NavLink
                        to="/admin/flights" className={({ isActive }) =>
                            `block px-3 py-2 rounded ${isActive ? 'bg-cyan-600 text-black' : 'hover:bg-white/10'
                            }`
                        }>
                        Flights
                    </NavLink>
                    <NavLink
                        to="/admin/bookings" className={({ isActive }) =>
                            `block px-3 py-2 rounded ${isActive ? 'bg-cyan-600 text-black' : 'hover:bg-white/10'
                            }`
                        }>
                        Bookings
                    </NavLink>
                    <NavLink
                        to="/admin/providers" className={({ isActive }) =>
                            `block px-3 py-2 rounded ${isActive ? 'bg-cyan-600 text-black' : 'hover:bg-white/10'
                            }`
                        }>
                        Providers
                    </NavLink>
                    <NavLink
                        to="/admin/faqs" className={({ isActive }) =>
                            `block px-3 py-2 rounded ${isActive ? 'bg-cyan-600 text-black' : 'hover:bg-white/10'
                            }`
                        }>
                        FAQs
                    </NavLink>
                </nav>
            </aside>

            {/* Main */}
            <main className="flex-1">
                <Outlet />
            </main>
        </div>
    );
}
