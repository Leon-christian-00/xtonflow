import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clearAuthState, storeAuth } from '../utils/authStorage';
import logo from '../assets/XtonFlow Logo.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [orgSlug, setOrgSlug] = useState('');
  const [showOrgField, setShowOrgField] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    clearAuthState();
    const b = sessionStorage.getItem('auth-banner');
    if (b) { setBanner(b); sessionStorage.removeItem('auth-banner'); }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe, orgSlug: orgSlug || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Login failed');
      storeAuth(data, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={logo} alt="XtonFlow" className="h-9 w-9 object-contain" />
          <span className="text-2xl font-bold text-white tracking-tight">XtonFlow</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-gray-400 text-sm mb-6">Sign in to your workspace</p>

          {banner && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 rounded-lg mb-4 text-sm">
              {banner}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
                <button type="button" onClick={() => setShowPassword(value => !value)} className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? '◉' : '◌'}</button>
              </div>
            </div>

            {/* Multi-org toggle */}
            <button
              type="button"
              onClick={() => setShowOrgField(!showOrgField)}
              className="text-blue-400 hover:text-blue-300 text-xs transition"
            >
              {showOrgField ? '− Hide' : '+ Member of multiple workspaces?'}
            </button>

            {showOrgField && (
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">Workspace slug</label>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="e.g. wastonix-tech"
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-gray-500 text-xs mt-1">Leave blank to enter your default workspace</p>
              </div>
            )}

            <label className="flex items-center gap-2 text-gray-400 text-sm">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-500"
              />
              Remember me
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-gray-600">
            <span className="h-px flex-1 bg-gray-800" />
            <span>or continue with</span>
            <span className="h-px flex-1 bg-gray-800" />
          </div>

          <a
            href="/oauth2/authorization/google"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-700 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
          >
            <span className="text-base font-bold">G</span>
            Continue with Google
          </a>

          <p className="text-gray-500 text-sm mt-5 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300">Create one</Link>
          </p>
        </div>

        <p className="text-center mt-4">
          <Link to="/" className="text-gray-600 hover:text-gray-400 text-xs transition">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
