// ============================================================
// UpiQrSettings.jsx — upload / replace the UPI QR shown on the
// payment step. One QR per brand:
//   tech       → MentorHub booking page (live as soon as you save)
//   meditation → talkWithShivah booking page
// The image is resized in the browser and stored in MongoDB, so
// no Cloudinary or other image host is needed.
// ============================================================
import { useState, useEffect, useRef } from "react";
import { settingsAPI } from "../utils/api";

const BRANDS = [
  { id: "tech", label: "MentorHub", icon: "💻", note: "Shown on the MentorHub payment step" },
  { id: "meditation", label: "talkWithShivah", icon: "🧘", note: "Shown on the talkWithShivah payment step" },
];

const MAX_SIDE = 800;           // px — plenty for a phone to scan
const MAX_FILE = 8 * 1024 * 1024; // raw file accepted before resizing

// Read an image file, shrink it to MAX_SIDE, return a data URL.
function fileToResizedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a readable image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";           // transparent PNGs → white background
        ctx.fillRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = scale === 1 ? false : true;
        ctx.drawImage(img, 0, 0, w, h);
        let out = canvas.toDataURL("image/png");
        // Photos compress badly as PNG — fall back to high-quality JPEG.
        if (out.length > 1.4 * 1024 * 1024) out = canvas.toDataURL("image/jpeg", 0.92);
        resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function UpiQrSettings({ showToast, askConfirm }) {
  const [current, setCurrent] = useState({ tech: null, meditation: null }); // saved data URLs
  const [updated, setUpdated] = useState({ tech: null, meditation: null });
  const [pending, setPending] = useState({ tech: null, meditation: null }); // chosen, not yet saved
  const [busy, setBusy] = useState({ tech: false, meditation: false });
  const [loading, setLoading] = useState(true);
  const inputs = { tech: useRef(null), meditation: useRef(null) };

  useEffect(() => {
    Promise.all(BRANDS.map((b) => settingsAPI.getUpiQr(b.id).catch(() => ({ qr: null }))))
      .then((results) => {
        const c = {}, u = {};
        BRANDS.forEach((b, i) => { c[b.id] = results[i].qr || null; u[b.id] = results[i].updatedAt || null; });
        setCurrent(c);
        setUpdated(u);
      })
      .finally(() => setLoading(false));
  }, []);

  const setFor = (setter, brand, value) => setter((s) => ({ ...s, [brand]: value }));

  const onPick = async (brand, e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      showToast("Pick a PNG, JPG or WEBP image", "error");
      return;
    }
    if (file.size > MAX_FILE) {
      showToast("File too large (max 8 MB)", "error");
      return;
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setFor(setPending, brand, dataUrl);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const save = async (brand) => {
    setFor(setBusy, brand, true);
    try {
      const d = await settingsAPI.setUpiQr(brand, pending[brand]);
      setFor(setCurrent, brand, d.qr);
      setFor(setUpdated, brand, d.updatedAt);
      setFor(setPending, brand, null);
      showToast("QR updated ✅");
    } catch (err) {
      showToast(err.message || "Upload failed", "error");
    } finally {
      setFor(setBusy, brand, false);
    }
  };

  const reset = (brand, label) => {
    askConfirm({
      title: `Remove the ${label} QR?`,
      message: "The payment page will go back to showing the built-in default QR.",
      confirmLabel: "Remove QR",
      tone: "danger",
      onConfirm: async () => {
        setFor(setBusy, brand, true);
        try {
          await settingsAPI.resetUpiQr(brand);
          setFor(setCurrent, brand, null);
          setFor(setUpdated, brand, null);
          showToast("QR removed — default QR is showing");
        } catch (err) {
          showToast(err.message || "Could not remove QR", "error");
        } finally {
          setFor(setBusy, brand, false);
        }
      },
    });
  };

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl font-black">UPI QR Code</h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {BRANDS.map((b) => {
          const shown = pending[b.id] || current[b.id];
          const isPending = !!pending[b.id];
          return (
            <div key={b.id} className="bg-white/2 border border-white/7 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="font-display font-bold">{b.icon} {b.label}</div>
                {isPending ? (
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                    Preview — not saved
                  </span>
                ) : current[b.id] ? (
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                    Custom QR
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-white/5 text-gray-400 border-white/10">
                    Default QR
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">{b.note}</p>

              <div className="flex gap-4 items-start">
                <div className="bg-white p-2 rounded-xl flex-shrink-0">
                  {loading ? (
                    <div className="w-32 h-32 rounded-lg bg-gray-200 animate-pulse" />
                  ) : shown ? (
                    <img src={shown} alt={`${b.label} UPI QR`} className="w-32 h-32 object-contain rounded-lg" />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-gray-100 flex items-center justify-center text-center text-xs text-gray-500 p-2">
                      No custom QR uploaded
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-0">
                  <input
                    ref={inputs[b.id]}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => onPick(b.id, e)}
                  />
                  {isPending ? (
                    <>
                      <p className="text-xs text-yellow-300/90">
                        Scan this preview with your phone and check the name before saving.
                      </p>
                      <button
                        onClick={() => save(b.id)}
                        disabled={busy[b.id]}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50"
                      >
                        {busy[b.id] ? "Saving…" : "Save QR"}
                      </button>
                      <button
                        onClick={() => setFor(setPending, b.id, null)}
                        disabled={busy[b.id]}
                        className="px-4 py-2 rounded-lg text-sm border border-white/10 text-gray-300 hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => inputs[b.id].current?.click()}
                        disabled={loading || busy[b.id]}
                        className="px-4 py-2 rounded-lg text-sm font-semibold border border-yellow-500/30 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 disabled:opacity-50"
                      >
                        {current[b.id] ? "Replace QR" : "Upload QR"}
                      </button>
                      {current[b.id] && (
                        <button
                          onClick={() => reset(b.id, b.label)}
                          disabled={busy[b.id]}
                          className="px-4 py-2 rounded-lg text-sm border border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                      {updated[b.id] && (
                        <p className="text-xs text-gray-500">
                          Updated {new Date(updated[b.id]).toLocaleString("en-IN")}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
