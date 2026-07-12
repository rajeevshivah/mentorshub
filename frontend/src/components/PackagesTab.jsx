// ============================================================
// PackagesTab — Admin CRUD for packages (Phase 1)
// Add/edit/delete, toggle active & popular, set sort order,
// switch brand (tech / meditation).
//
// Place this file at: frontend/src/components/PackagesTab.jsx
// Then render it inside AdminPage where the other tabs are
// (wiring instructions in the setup guide).
// ============================================================
import { useEffect, useState } from "react";
import { packageAPI } from "../utils/api";
import ConfirmModal from "./ConfirmModal";

const EMPTY = {
  name: "", duration: "", price: "", icon: "⭐", desc: "",
  features: "", popular: false, active: true, brand: "tech", sortOrder: 0,
};

export default function PackagesTab({ showToast }) {
  const [confirmState, setConfirmState] = useState(null);
  const [brand, setBrand] = useState("tech");
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = none, {} = new, {...} = edit
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async (b = brand) => {
    setLoading(true);
    try {
      const res = await packageAPI.getAll(b);
      setPackages(res.packages || []);
    } catch (err) {
      showToast(err.message || "Failed to load packages", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(brand); /* eslint-disable-next-line */ }, [brand]);

  const openNew = () => {
    setForm({ ...EMPTY, brand });
    setEditing({});
  };

  const openEdit = (pkg) => {
    setForm({
      ...pkg,
      price: pkg.price,
      features: (pkg.features || []).join("\n"), // textarea: one feature per line
    });
    setEditing(pkg);
  };

  const closeForm = () => { setEditing(null); setForm(EMPTY); };

  const handleSave = async () => {
    if (!form.name || !form.duration || form.price === "") {
      showToast("Name, duration and price are required", "error");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      sortOrder: Number(form.sortOrder) || 0,
      features: form.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    };
    try {
      if (editing && editing._id) {
        await packageAPI.update(editing._id, payload);
        showToast("Package updated");
      } else {
        await packageAPI.create(payload);
        showToast("Package created");
      }
      closeForm();
      load();
    } catch (err) {
      showToast(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (pkg) => {
    setConfirmState({
      title: `Delete "${pkg.name}"?`,
      message: "The package will be removed permanently. Existing bookings keep their records, but students can no longer book it.",
      confirmLabel: "Delete package",
      tone: "danger",
      onConfirm: async () => {
        try {
          await packageAPI.remove(pkg._id);
          showToast("Package deleted");
          load();
        } catch (err) {
          showToast(err.message || "Delete failed", "error");
        }
      },
    });
  };

  const quickToggle = async (pkg, field) => {
    try {
      await packageAPI.update(pkg._id, { [field]: !pkg[field] });
      load();
    } catch (err) {
      showToast(err.message || "Update failed", "error");
    }
  };

  const inputClass =
    "bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-yellow-500/50 transition-colors w-full";

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-black text-xl">Packages</h2>
          <p className="text-gray-400 text-xs mt-1">
            Add, edit, or remove the packages shown on your site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Brand switch */}
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 text-xs">
            {["tech", "meditation"].map((b) => (
              <button key={b} onClick={() => setBrand(b)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all
                  ${brand === b ? "bg-yellow-500 text-black font-bold" : "text-gray-400 hover:text-white"}`}>
                {b}
              </button>
            ))}
          </div>
          <button onClick={openNew}
            className="bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-display
              font-bold px-4 py-2 rounded-xl text-sm hover:opacity-90 transition-all">
            + New Package
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-gray-400 text-sm py-10">Loading…</div>
      ) : packages.length === 0 ? (
        <div className="text-gray-400 text-sm py-10">
          No <span className="capitalize">{brand}</span> packages yet. Click “New Package”.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packages.map((pkg) => (
            <div key={pkg._id}
              className={`border rounded-2xl p-5 transition-all
                ${pkg.active ? "bg-white/4 border-white/10" : "bg-white/2 border-white/5 opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{pkg.icon}</span>
                  <div>
                    <div className="font-display font-bold text-sm flex items-center gap-2">
                      {pkg.name}
                      {pkg.popular && (
                        <span className="text-yellow-400 text-xs bg-yellow-500/15 px-2 py-0.5 rounded-full">Popular</span>
                      )}
                      {!pkg.active && (
                        <span className="text-gray-400 text-xs bg-white/10 px-2 py-0.5 rounded-full">Hidden</span>
                      )}
                    </div>
                    <div className="text-gray-400 text-xs">⏱ {pkg.duration} · ₹{pkg.price} · order {pkg.sortOrder}</div>
                  </div>
                </div>
              </div>

              <p className="text-gray-400 text-xs mt-3">{pkg.desc}</p>

              {pkg.features?.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {pkg.features.map((f, i) => (
                    <li key={i} className="text-gray-300 text-xs flex gap-2">
                      <span className="text-green-400">✓</span>{f}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 mt-4 text-xs">
                <button onClick={() => openEdit(pkg)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5">Edit</button>
                <button onClick={() => quickToggle(pkg, "active")}
                  className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5">
                  {pkg.active ? "Hide" : "Show"}
                </button>
                <button onClick={() => quickToggle(pkg, "popular")}
                  className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5">
                  {pkg.popular ? "Unmark Popular" : "Mark Popular"}
                </button>
                <button onClick={() => handleDelete(pkg)}
                  className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={closeForm}>
          <div className="bg-dark-2 border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-black text-lg mb-4">
              {editing._id ? "Edit Package" : "New Package"}
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Name *</label>
                  <input className={inputClass} value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Icon (emoji)</label>
                  <input className={inputClass} value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Duration *</label>
                  <input className={inputClass} placeholder="30 min" value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Price (₹) *</label>
                  <input type="number" className={inputClass} value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Sort order</label>
                  <input type="number" className={inputClass} value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Short description</label>
                <input className={inputClass} value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })} />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Features (one per line)
                </label>
                <textarea rows={4} className={inputClass} value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Brand</label>
                  <select className={inputClass} value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}>
                    <option value="tech">tech</option>
                    <option value="meditation">meditation</option>
                  </select>
                </div>
                <div className="flex items-end gap-4 pb-1">
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input type="checkbox" checked={form.popular}
                      onChange={(e) => setForm({ ...form, popular: e.target.checked })} />
                    Popular
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input type="checkbox" checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeForm}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm hover:bg-white/5">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-300
                  text-black font-display font-bold text-sm hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  );
}
