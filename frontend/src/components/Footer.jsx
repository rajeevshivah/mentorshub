export default function Footer() {
  return (
    <div className="bg-white/2 border-t border-white/7 py-12">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="font-display text-xl font-black mb-3">
              Mentor<span className="text-yellow-400">Hub</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-4">
              1-on-1 tech mentorship by Rajeev Shivah.
              Real guidance, real outcomes.
            </p>
            <div className="flex gap-3">
              <a href="https://www.youtube.com/@codewithshivah" target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-full border border-white/10 flex items-center
                  justify-center text-gray-400 hover:border-red-500/50 hover:text-red-400
                  cursor-pointer transition-all text-xs font-bold">
                YT
              </a>
              <a href="https://www.linkedin.com/in/rajeev-shivah-49745014a/" target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-full border border-white/10 flex items-center
                  justify-center text-gray-400 hover:border-blue-500/50 hover:text-blue-400
                  cursor-pointer transition-all text-xs font-bold">
                LI
              </a>
              <a href="https://minicimextech.com" target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-full border border-white/10 flex items-center
                  justify-center text-gray-400 hover:border-yellow-500/50 hover:text-yellow-400
                  cursor-pointer transition-all text-xs font-bold">
                🌐
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <div className="font-display font-bold text-sm mb-3 text-gray-300">Quick Links</div>
            <div className="space-y-2">
              {[
                ["Book a Session", "#packages"],
                ["YouTube — codeWithShivah", "https://www.youtube.com/@codewithshivah"],
                ["LinkedIn Profile", "https://www.linkedin.com/in/rajeev-shivah-49745014a/"],
                ["Minicimex Tech", "https://minicimextech.com"],
              ].map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noreferrer"
                  className="block text-gray-400 text-xs hover:text-yellow-400 transition-colors">
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="font-display font-bold text-sm mb-3 text-gray-300">Contact</div>
            <div className="space-y-2 text-xs text-gray-400">
              <div>📍 Dehradun, India</div>
              <div>🌐 minicimextech.com</div>
              <div>📺 youtube.com/@codewithshivah</div>
              <div className="pt-2 text-gray-500">
                For business enquiries, reach out via LinkedIn
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/7 pt-6 flex flex-wrap justify-between
          items-center gap-3 text-xs text-gray-500">
          <div>© 2026 MentorHub · Minicimex Tech Pvt Ltd · All rights reserved</div>
          <div>Made with ♥ in India 🇮🇳</div>
        </div>
      </div>
    </div>
  );
}