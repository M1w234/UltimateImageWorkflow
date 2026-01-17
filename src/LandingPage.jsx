import { Github, Sparkles } from 'lucide-react';

/**
 * Landing Page Hero Section Component
 * Showcases the value proposition and provides navigation to the main app
 */
export default function LandingPage({ onEnterApp }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* Banana Icon */}
        <div className="mb-8 flex justify-center">
          <span className="text-7xl animate-bounce">🍌</span>
        </div>

        {/* Main Headline with Gradient */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
          <span className="bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">
            Open-Source AI Creative Suite for Your Own API Keys
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl lg:text-2xl text-slate-300 mb-10 leading-relaxed max-w-3xl mx-auto">
          Stop paying monthly subscriptions. Generate unlimited AI images and videos at API cost—typically 10-100x cheaper than subscription services.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          {/* Primary CTA */}
          <button
            onClick={onEnterApp}
            className="group relative px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-amber-500/50 focus:outline-none focus:ring-4 focus:ring-amber-500/50 w-full sm:w-auto"
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Get Started Free
          </button>

          {/* Secondary CTA */}
          <a
            href="https://github.com/yourusername/vision-studio-unleashed"
            target="_blank"
            rel="noopener noreferrer"
            className="group px-8 py-4 border-2 border-amber-500 text-amber-500 hover:bg-amber-500/10 font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-amber-500/50 w-full sm:w-auto"
          >
            <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
            View on GitHub
          </a>
        </div>

        {/* Tech Stack Badge Line */}
        <div className="text-slate-400 text-sm flex flex-wrap items-center justify-center gap-2">
          <span>Built with React + Vite</span>
          <span className="text-slate-600">•</span>
          <span>Self-hosted</span>
          <span className="text-slate-600">•</span>
          <span>Zero cloud uploads</span>
        </div>

        {/* Feature Highlights */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700/50 hover:border-amber-500/50 transition-colors">
            <div className="text-3xl mb-3">🔑</div>
            <h3 className="text-white font-semibold mb-2 text-lg">Your API Keys</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Bring your own API keys from Google Gemini, OpenAI, and Kling. Full control, no middlemen.
            </p>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700/50 hover:border-amber-500/50 transition-colors">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-white font-semibold mb-2 text-lg">Pay Only API Costs</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              No monthly subscriptions. Pay pennies per generation instead of $20-200/month.
            </p>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700/50 hover:border-amber-500/50 transition-colors">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-white font-semibold mb-2 text-lg">Private & Secure</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Everything runs locally in your browser. Your images never touch our servers.
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-16 opacity-50">
          <p className="text-slate-500 text-xs mb-2">Scroll down to explore features</p>
          <div className="animate-bounce">
            <svg
              className="w-6 h-6 mx-auto text-slate-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
