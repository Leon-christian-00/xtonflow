import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/XtonFlow Logo.png';

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

function Register() {
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.removeItem('auth-banner');
  }, []);

  // Step 1: choose workspace type
  const [workspaceType, setWorkspaceType] = useState(null); // 'PERSONAL' | 'TEAM'

  // Step 2: join existing or create new (only for TEAM)
  const [teamAction, setTeamAction] = useState(null); // 'join' | 'create'

  // Personal / user fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');

  // Org fields (create new)
  const [orgName, setOrgName] = useState('');

  // Join existing
  const [orgSlug, setOrgSlug] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const body = {
      fullName,
      email,
      password,
      birthday: birthday || null,
      gender: gender || null,
      workspaceType,
      orgName: workspaceType === 'TEAM' && teamAction === 'create' ? orgName : null,
      orgSlug: workspaceType === 'TEAM' && teamAction === 'join' ? orgSlug : null,
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Registration failed');
      setSuccess(data.message || 'Check your email to verify your account.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: pick workspace type ──────────────────────────────────────────
  if (!workspaceType) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={logo} alt="XtonFlow" className="h-9 w-9 object-contain" />
            <span className="text-2xl font-bold text-white tracking-tight">XtonFlow</span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
            <p className="text-gray-400 text-sm mb-8">How will you be using XtonFlow?</p>

            <div className="space-y-4">
              <button
                onClick={() => setWorkspaceType('PERSONAL')}
                className="w-full text-left bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-xl p-5 transition group"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🧑</span>
                  <div>
                    <p className="font-semibold text-white group-hover:text-blue-400 transition">Personal workspace</p>
                    <p className="text-gray-400 text-sm mt-0.5">Just for you — your own private task space. Solo projects, personal goals.</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setWorkspaceType('TEAM')}
                className="w-full text-left bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-xl p-5 transition group"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🏢</span>
                  <div>
                    <p className="font-semibold text-white group-hover:text-blue-400 transition">Organisation / Team</p>
                    <p className="text-gray-400 text-sm mt-0.5">For companies, schools, restaurants, dev teams — any group of 2 or more.</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <p className="text-center mt-4">
            <Link to="/login" className="text-gray-600 hover:text-gray-400 text-xs transition">Already have an account? Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  if (workspaceType === 'TEAM' && !teamAction) {
    return (
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={logo} alt="XtonFlow" className="h-9 w-9 object-contain" />
            <span className="text-2xl font-bold text-white tracking-tight">XtonFlow</span>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
            <button onClick={() => setWorkspaceType(null)} className="text-gray-500 hover:text-gray-300 text-xs mb-4 transition">← Back</button>
            <h2 className="text-2xl font-bold text-white mb-1">Organisation / Team</h2>
            <p className="text-gray-400 text-sm mb-8">Are you joining an existing org or creating a new one?</p>

            <div className="space-y-4">
              <button
                onClick={() => setTeamAction('join')}
                className="w-full text-left bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-xl p-5 transition group"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🔗</span>
                  <div>
                    <p className="font-semibold text-white group-hover:text-blue-400 transition">Join existing organisation</p>
                    <p className="text-gray-400 text-sm mt-0.5">You have an invite link or org slug from your admin.</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setTeamAction('create')}
                className="w-full text-left bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-xl p-5 transition group"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">✨</span>
                  <div>
                    <p className="font-semibold text-white group-hover:text-blue-400 transition">Create new organisation</p>
                    <p className="text-gray-400 text-sm mt-0.5">You'll be the owner and can invite your team after setup.</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
    );
  }

  // ── Step 3: registration form ────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-gray-400 text-sm mb-6">{success}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition text-sm"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  const backLabel = workspaceType === 'TEAM' ? () => setTeamAction(null) : () => setWorkspaceType(null);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={logo} alt="XtonFlow" className="h-9 w-9 object-contain" />
          <span className="text-2xl font-bold text-white tracking-tight">XtonFlow</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <button onClick={backLabel} className="text-gray-500 hover:text-gray-300 text-xs mb-4 transition">← Back</button>

          <h2 className="text-2xl font-bold text-white mb-1">
            {workspaceType === 'PERSONAL' && 'Personal workspace'}
            {workspaceType === 'TEAM' && teamAction === 'create' && 'New organisation'}
            {workspaceType === 'TEAM' && teamAction === 'join' && 'Join organisation'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">Fill in your details to get started</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Org name — only when creating new team */}
            {workspaceType === 'TEAM' && teamAction === 'create' && (
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">Organisation name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Wastonix Tech, The Rusty Fork Bar"
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
            )}

            {/* Org slug — only when joining */}
            {workspaceType === 'TEAM' && teamAction === 'join' && (
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">Organisation slug / invite code</label>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="e.g. wastonix-tech"
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
                <p className="text-gray-500 text-xs mt-1">Ask your admin for the org slug or use the invite link they sent you</p>
              </div>
            )}

            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3 pr-12 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(value => !value)} className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? '◉' : '◌'}</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">Birthday <span className="text-gray-600">(optional)</span></label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">Gender <span className="text-gray-600">(optional)</span></label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select</option>
                  {GENDERS.map(g => (
                    <option key={g} value={g}>{g.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition text-sm mt-2"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-gray-500 text-sm mt-5 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
