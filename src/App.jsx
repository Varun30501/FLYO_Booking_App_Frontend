// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import NavBar from "./components/navbar"; // note: adjusted name to match earlier file casing
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import SearchPage from "./pages/SearchPage";
import BookingPage from "./pages/BookingPage";
import BookingDetails from "./pages/BookingDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import MyBookings from "./pages/MyBookings";
import Support from "./pages/Support";
import ContactUs from "./pages/ContactUs";
import { getToken } from "./services/auth";
import ReconciliationDashboard from "./pages/admin/ReconciliationDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminFlights from "./pages/admin/AdminFlights";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminBookingDetails from "./pages/admin/AdminBookingDetails";
import AdminExports from "./pages/admin/AdminExports";
import AdminOverview from "./pages/admin/AdminOverview";
import FAQs from "./pages/admin/AdminFAQs";
import AdminProviderHealth from "./pages/admin/AdminProviderHealth";
import PaymentRetryDashboard from "./pages/admin/PaymentRetryDashboard";
import Footer from "./components/Footer";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function onStorage() {
      setLoggedIn(!!getToken());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function handleAuthChange() {
    setLoggedIn(!!getToken());
    if (getToken()) navigate("/dashboard");
  }

  // Pages where we explicitly don't want navbar/footer (public landing / auth modals)
  // include forgot/reset so they use the same "landing" shell behavior as login/register
  const simplePaths = ["/", "/login", "/register", "/admin/login", "/forgot-password"];
  // treat any route that starts with /reset-password as a simple/auth page (covers /reset-password and /reset-password/:token)
  const hideShell = simplePaths.includes(location.pathname) || location.pathname.startsWith("/reset-password");

  return (
    // `app-shell` gets `with-navbar` only when navbar is shown
    <div className="app-background">
      {/* Render navbar only for logged-in users */}
      {loggedIn && (
        <div className="fixed top-0 left-0 w-full z-50 app-navbar" style={{ height: 56 }}>
          <NavBar onAuthChange={handleAuthChange} />
        </div>
      )}

      {/* app-shell toggles with-navbar so top padding exists only when navbar present */}
      <div className={`app-shell ${loggedIn ? "with-navbar" : ""} overflow-x-hidden min-h-screen flex flex-col`}>
        <Routes>
          <Route path="/" element={<Home onAuthChange={handleAuthChange} />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/booking/:id" element={<BookingPage />} />
          <Route path="/booking-details/:ref" element={<BookingDetails />} />
          <Route path="/login" element={<Login onAuthChange={handleAuthChange} />} />
          <Route path="/register" element={<Register onAuthChange={handleAuthChange} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* support token in path as well as without */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/support" element={<Support />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            {/* ✅ DEFAULT LANDING PAGE */}
            <Route index element={<Navigate to="overview" replace />} />

            <Route path="overview" element={<AdminOverview />} />
            <Route path="reconciliation" element={<ReconciliationDashboard />} />
            <Route path="flights" element={<AdminFlights />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="bookings/:id" element={<AdminBookingDetails />} />
            <Route path="exports" element={<AdminExports />} />
            <Route path="providers" element={<AdminProviderHealth />} />
            <Route path="payment-retries" element={<PaymentRetryDashboard />} />
            <Route path="faqs" element={<FAQs />} />
          </Route>


          <Route path="*" element={<div className="p-6">Page not found</div>} />
        </Routes>

        {/* Show footer only when not on the simple auth/landing shell */}
        {!hideShell && <Footer />}
      </div>
    </div>
  );
}
