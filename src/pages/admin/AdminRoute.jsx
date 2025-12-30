// src/pages/admin/AdminRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getUser, getToken } from '../../services/auth';

export default function AdminRoute() {
    const token = getToken();
    const user = getUser();
    const isAdminFlag = localStorage.getItem('fb_is_admin') === '1';


    if (!token || !user || !isAdminFlag) {
        return <Navigate to="/admin/login" replace />;
    }

    const isAdmin =
        user.isAdmin === true ||
        (user.role && String(user.role).toLowerCase() === 'admin');

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
