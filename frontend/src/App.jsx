import { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import HomePage from "./pages/HomePage";
import BookingPage from "./pages/BookingPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [showAuth, setShowAuth] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState(null);

  const handleBook = (pkgId = null) => {
    setSelectedPkgId(pkgId);
    setCurrentPage("booking");
    window.scrollTo(0, 0);
  };

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen bg-dark text-white">

          {/* Hide navbar on admin page for cleaner look */}
          {currentPage !== "admin" && (
            <Navbar
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              setShowAuth={setShowAuth}
            />
          )}

          {currentPage === "home" && <HomePage onBook={handleBook} />}
          {currentPage === "booking" && (
            <BookingPage selectedPkgId={selectedPkgId} setPage={setCurrentPage} />
          )}
          {currentPage === "dashboard" && <DashboardPage setPage={setCurrentPage} />}
          {currentPage === "admin" && <AdminPage setPage={setCurrentPage} />}

          {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

        </div>
      </ToastProvider>
    </AuthProvider>
  );
}