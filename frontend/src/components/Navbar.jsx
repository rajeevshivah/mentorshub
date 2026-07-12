import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ currentPage, setCurrentPage, setShowAuth }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { id: "home", label: "Home" },
    { id: "booking", label: "Book Session" },
    { id: "dashboard", label: "My Bookings" },
  ];

  const go = (id) => { setCurrentPage(id); setMenuOpen(false); };

  return (
    <nav className="sticky top-0 z-50 bg-dark/90 backdrop-blur-xl border-b border-white/7 px-4 md:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-16">

        {/* Logo */}
        <div
          onClick={() => go("home")}
          className="font-display text-xl font-black cursor-pointer"
        >
          Mentor<span className="text-yellow-400">Hub</span>
        </div>

        {/* ---- Desktop nav ---- */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => go(link.id)}
              className={`px-3 py-2 rounded-lg text-sm transition-all
                ${currentPage === link.id ? "bg-white/8 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {link.label}
            </button>
          ))}
          {user?.role === "admin" && (
            <button
              onClick={() => go("admin")}
              className={`px-3 py-2 rounded-lg text-sm transition-all
                ${currentPage === "admin" ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"}`}
            >
              ⚙️ Admin
            </button>
          )}
          <div className="w-px h-5 bg-white/10 mx-1" />
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 font-display font-bold text-sm flex items-center justify-center cursor-pointer"
                onClick={() => go("dashboard")} title={user.name}>
                {user.name[0].toUpperCase()}
              </div>
              <button onClick={logout}
                className="text-gray-400 hover:text-white text-sm transition-colors">
                Logout
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)}
              className="ml-1 bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-all">
              Login
            </button>
          )}
        </div>

        {/* ---- Mobile: avatar (if logged in) + hamburger ---- */}
        <div className="flex md:hidden items-center gap-3">
          {user && (
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 font-display font-bold text-sm flex items-center justify-center"
              title={user.name}>
              {user.name[0].toUpperCase()}
            </div>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-white/5"
            aria-label="Menu"
          >
            <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* ---- Mobile dropdown menu ---- */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/7 py-3 space-y-1">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => go(link.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all
                ${currentPage === link.id ? "bg-white/8 text-white" : "text-gray-300 hover:bg-white/5"}`}
            >
              {link.label}
            </button>
          ))}
          {user?.role === "admin" && (
            <button
              onClick={() => go("admin")}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all
                ${currentPage === "admin" ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-500/10 text-yellow-400"}`}
            >
              ⚙️ Admin
            </button>
          )}
          <div className="pt-2 mt-2 border-t border-white/7">
            {user ? (
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-lg text-sm text-red-400 hover:bg-red-500/10"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => { setShowAuth(true); setMenuOpen(false); }}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display font-bold px-4 py-3 rounded-lg text-sm"
              >
                Login
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
