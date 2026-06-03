import { useAuth } from "../context/AuthContext";

export default function Navbar({ currentPage, setCurrentPage, setShowAuth }) {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-dark/90 backdrop-blur-xl border-b border-white/7 px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-16">

        {/* Logo */}
        <div
          onClick={() => setCurrentPage("home")}
          className="font-display text-xl font-black cursor-pointer"
        >
          Mentor<span className="text-yellow-400">Hub</span>
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {[
            { id: "home", label: "Home" },
            { id: "booking", label: "Book Session" },
            { id: "dashboard", label: "My Bookings" },
          ].map((link) => (
            <button
              key={link.id}
              onClick={() => setCurrentPage(link.id)}
              className={`px-3 py-2 rounded-lg text-sm transition-all hidden md:block
                ${currentPage === link.id
                  ? "bg-white/8 text-white"
                  : "text-gray-400 hover:text-white"}`}
            >
              {link.label}
            </button>
          ))}

          {/* Admin button — only visible to admin */}
          {user?.role === "admin" && (
            <button
              onClick={() => setCurrentPage("admin")}
              className={`px-3 py-2 rounded-lg text-sm transition-all hidden md:block
                ${currentPage === "admin"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"}`}
            >
              ⚙️ Admin
            </button>
          )}

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1 hidden md:block" />

          {/* Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400
                font-display font-bold text-sm flex items-center justify-center cursor-pointer"
                onClick={() => setCurrentPage("dashboard")}
                title={user.name}
              >
                {user.name[0].toUpperCase()}
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white text-sm transition-colors hidden md:block"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="ml-1 bg-gradient-to-r from-yellow-500 to-yellow-300
                text-black font-display font-bold px-4 py-2 rounded-lg text-sm
                hover:opacity-90 transition-all"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}