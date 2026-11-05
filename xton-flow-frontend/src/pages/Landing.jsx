import { useNavigate } from 'react-router-dom';
import logo from '../assets/XtonFlow Logo.png';

const features = [
  { icon: '🏢', title: 'Organisation-first', desc: 'Every workspace belongs to an org — personal or team. Everyone has a place.' },
  { icon: '📋', title: 'Task Boards', desc: 'Kanban-style boards with real-time updates. Drag, assign, track — all in one place.' },
  { icon: '👥', title: 'Custom Roles', desc: 'Define your own roles. Developer, Bartender, Teacher — your org, your rules.' },
  { icon: '🔔', title: 'Real-time Notifications', desc: 'Stay in the loop with live updates across your whole team instantly.' },
  { icon: '🔀', title: 'Multi-workspace', desc: 'Belong to multiple orgs? Switch between them seamlessly without logging out.' },
  { icon: '✉️', title: 'Invite by Email', desc: 'Invite teammates via email link. They verify, they\'re in. Simple.' },
];

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <img src={logo} alt="XtonFlow" className="h-8 w-8 object-contain" />
          <span className="text-xl font-bold tracking-tight">XtonFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="text-gray-400 hover:text-white text-sm transition"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 flex-1">
        <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/30 text-blue-400 text-xs font-medium px-3 py-1 rounded-full mb-6">
          ✦ Built for teams of all sizes
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight max-w-3xl mb-6">
          Coordinate your team.<br />
          <span className="text-blue-500">Flow without friction.</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mb-10">
          XtonFlow is a task management platform built around organisations. Whether you're a dev team, a restaurant crew, or a school project group — everyone gets a workspace that fits.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/register')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition shadow-lg shadow-blue-600/20"
          >
            Get started with XtonFlow →
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-gray-400 hover:text-white text-sm transition"
          >
            Already have an account?
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-16 bg-gray-900/50 border-t border-gray-800">
        <h2 className="text-center text-2xl font-bold mb-12 text-gray-100">Everything your team needs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((f) => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500/40 transition">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-6 py-16 border-t border-gray-800">
        <h2 className="text-3xl font-bold mb-4">Ready to flow?</h2>
        <p className="text-gray-400 mb-8">Create your workspace in under 2 minutes.</p>
        <button
          onClick={() => navigate('/register')}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition"
        >
          Create your workspace
        </button>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-600 text-xs py-6 border-t border-gray-800">
        © {new Date().getFullYear()} XtonFlow. Built with purpose.
      </footer>
    </div>
  );
}

export default Landing;
