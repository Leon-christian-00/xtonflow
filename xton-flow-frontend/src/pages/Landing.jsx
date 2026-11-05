import { useNavigate } from 'react-router-dom';
import logo from '../assets/XtonFlow Logo.png';

const features = [
  { icon: 'fa-solid fa-sitemap', title: 'Organisation-first', desc: 'Every workspace belongs to an org — personal or team. Everyone has a place.' },
  { icon: 'fa-solid fa-list-check', title: 'Task Boards', desc: 'Kanban-style boards with real-time updates. Drag, assign, track — all in one place.' },
  { icon: 'fa-solid fa-users-gear', title: 'Custom Roles', desc: 'Define your own roles. Developer, Bartender, Teacher — your org, your rules.' },
  { icon: 'fa-solid fa-bell', title: 'Real-time Notifications', desc: 'Stay in the loop with live updates across your whole team instantly.' },
  { icon: 'fa-solid fa-shuffle', title: 'Multi-workspace', desc: 'Belong to multiple orgs? Switch between them seamlessly without logging out.' },
  { icon: 'fa-solid fa-envelope-open-text', title: 'Invite by Email', desc: 'Invite teammates via email link. They verify, they\u2019re in. Simple.' },
];

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-bg min-h-screen text-white flex flex-col">

      {/* Nav */}
      <nav className="glass-nav sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 py-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="XtonFlow" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-bold tracking-tight">XtonFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="hidden sm:inline-flex text-slate-400 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition shadow-glow"
          >
            Get Started <i className="fa-solid fa-arrow-right text-xs" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-24 pb-28 flex-1 overflow-hidden">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full bg-brand-600/25 blur-[140px]" aria-hidden="true" />

        <div className="badge-pill mb-7 animate-fade-in">
          <span className="flex h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
          Built for teams of all sizes
        </div>

        <h1 className="hero-title font-display text-5xl md:text-7xl font-bold leading-[1.05] max-w-4xl mb-7 animate-slide-up">
          Coordinate your team.<br />
          Flow without friction.
        </h1>

        <p className="text-slate-400 text-lg max-w-xl mb-10 animate-slide-up">
          XtonFlow is a task management platform built around organisations. Whether you're a dev team, a restaurant crew, or a school project group — everyone gets a workspace that fits.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-5 animate-slide-up">
          <button onClick={() => navigate('/register')} className="btn-hero text-lg">
            Get started with XtonFlow <i className="fa-solid fa-arrow-right text-sm" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-slate-400 hover:text-white text-sm font-medium px-4 py-3 rounded-xl hover:bg-white/5 transition"
          >
            Already have an account? <span className="text-brand-300 font-semibold"> Sign in</span>
          </button>
        </div>

        {/* Floating board mock */}
        <div className="hidden lg:block mt-20 w-full max-w-4xl animate-slide-up" aria-hidden="true">
          <div className="rounded-2xl border border-brand-500/20 bg-white/[.04] p-5 shadow-tilt backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <div className="ml-4 h-6 w-40 rounded-md bg-white/5 border border-white/5" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[3, 2, 4, 2].map((n, col) => (
                <div key={col} className="rounded-xl bg-white/[.03] border border-white/5 p-3 space-y-2.5">
                  <div className={`h-1.5 w-10 rounded-full ${['bg-brand-500', 'bg-sky-400', 'bg-amber-400', 'bg-emerald-400'][col]}`} />
                  {Array.from({ length: n }).map((_, i) => (
                    <div key={i} className="rounded-lg bg-white/[.05] border border-white/5 p-2.5 space-y-1.5">
                      <div className="h-2 w-3/4 rounded bg-white/15" />
                      <div className="h-2 w-1/2 rounded bg-white/8" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-6 h-px w-2/3 bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-10 py-24">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-brand-300 text-xs font-bold uppercase tracking-[.18em] mb-3">Features</p>
          <h2 className="font-display text-center text-3xl md:text-4xl font-bold mb-4 text-white">Everything your team needs</h2>
          <p className="text-center text-slate-400 max-w-lg mx-auto mb-14">
            One workspace for planning, tracking and shipping — no matter what kind of team you run.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon"><i className={f.icon} /></div>
                <h3 className="font-display font-semibold text-white text-lg mb-1.5">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="relative max-w-3xl mx-auto overflow-hidden rounded-3xl border border-brand-500/25 p-12 text-center bg-gradient-to-b from-brand-600/20 via-brand-600/8 to-transparent">
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[280px] rounded-full bg-brand-500/30 blur-[110px]" aria-hidden="true" />
          <h2 className="font-display relative text-3xl md:text-4xl font-bold mb-4 text-white">Ready to flow?</h2>
          <p className="relative text-slate-400 mb-9">Create your workspace in under 2 minutes.</p>
          <button onClick={() => navigate('/register')} className="btn-hero relative">
            Create your workspace <i className="fa-solid fa-arrow-right text-sm" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-slate-600 text-xs py-8 border-t border-white/5">
        © {new Date().getFullYear()} XtonFlow. Built with purpose.
      </footer>
    </div>
  );
}

export default Landing;
