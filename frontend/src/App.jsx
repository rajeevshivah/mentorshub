// ============================================================
// App.jsx — real URL routing via react-router.
//
// Why: the old version kept the current page in useState, so the URL
// never changed. Any reload dumped you back on Home, browser back did
// nothing, and /admin could not be bookmarked. Now:
//   /                → Home
//   /booking         → Booking (optional ?pkg=<id> preselects a package)
//   /dashboard       → Student dashboard
//   /admin           → Admin panel (guarded inside AdminPage)
//   /reset-password  → Password reset (?token=... from the email link)
//
// Pages still receive a setPage(id) prop, mapped to navigation here,
// so none of the page components needed changes.
// vercel.json already rewrites all paths to index.html, so deep links
// and reloads work in production.
// ============================================================
import { useEffect } from "react";
import {
  BrowserRouter, Routes, Route, Navigate,
  useNavigate, useLocation, useSearchParams,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import HomePage from "./pages/HomePage";
import BookingPage from "./pages/BookingPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { useState } from "react";

const PAGE_TO_PATH = {
  home: "/",
  booking: "/booking",
  dashboard: "/dashboard",
  admin: "/admin",
  reset: "/reset-password",
};

const PATH_TO_PAGE = {
  "/": "home",
  "/booking": "booking",
  "/dashboard": "dashboard",
  "/admin": "admin",
  "/reset-password": "reset",
};

// Scroll to top on every route change (mirrors old handleBook behavior).
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Shell() {
  const { bootstrapping } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showAuth, setShowAuth] = useState(false);

  const currentPage = PATH_TO_PAGE[location.pathname] || "home";

  // Adapter so existing pages keep working: setPage("dashboard") etc.
  const setPage = (id) => navigate(PAGE_TO_PATH[id] || "/");

  const handleBook = (pkgId = null) =>
    navigate(pkgId ? `/booking?pkg=${pkgId}` : "/booking");

  // Legacy reset links arrive as /?token=... — forward them to the
  // proper route so old emails keep working.
  const legacyToken = searchParams.get("token");
  if (location.pathname !== "/reset-password" && legacyToken) {
    return <Navigate to={`/reset-password?token=${legacyToken}`} replace />;
  }

  if (bootstrapping && location.pathname !== "/reset-password") {
    return (
      <div className="min-h-screen bg-dark text-white flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  const hideNavbar = ["admin", "reset"].includes(currentPage);

  return (
    <div className="min-h-screen bg-dark text-white">
      <ScrollToTop />
      {!hideNavbar && (
        <Navbar currentPage={currentPage} setCurrentPage={setPage} setShowAuth={setShowAuth} />
      )}

      <Routes>
        <Route path="/" element={<HomePage onBook={handleBook} />} />
        <Route path="/booking" element={
          <BookingPage selectedPkgId={searchParams.get("pkg")} setPage={setPage} />
        } />
        <Route path="/dashboard" element={<DashboardPage setPage={setPage} />} />
        <Route path="/admin" element={<AdminPage setPage={setPage} />} />
        <Route path="/reset-password" element={
          <ResetPasswordPage token={searchParams.get("token")} setPage={setPage} />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
