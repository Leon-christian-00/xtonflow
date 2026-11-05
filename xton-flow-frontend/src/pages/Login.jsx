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
    <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src={logo} alt="XtonFlow" className="h-10 w-10 object-contain" />
          <span className="font-display text-2xl font-bold text-white tracking-tight">XtonFlow</span>
        </div>

        <div className="auth-card p-8 animate-slide-up">
          <h2 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-7">Sign in to your workspace</p>

          {banner && (
            <div className="flex items-start gap-2.5 bg-amber-400/10 border border-amber-400/25 text-amber-300 p-3.5 rounded-xl mb-4 text-sm animate-fade-in">
              <i className="fa-solid fa-circle-info mt-0.5" />
              <span>{banner}</span>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-300 p-3.5 rounded-xl mb-4 text-sm animate-fade-in">
              <i className="fa-solid fa-triangle-exclamation mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="field-input"
                required
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="field-input pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                </button>
              </div>
            </div>

            {/* Multi-org toggle */}
            <button
              type="button"
              onClick={() => setShowOrgField(!showOrgField)}
              className="text-brand-300 hover:text-brand-200 text-xs font-medium transition inline-flex items-center gap-1.5"
            >
              <i className={`fa-solid ${showOrgField ? 'fa-minus' : 'fa-plus'} text-[10px]`} />
              {showOrgField ? 'Hide workspace option' : 'Member of multiple workspaces?'}
            </button>

            {showOrgField && (
              <div className="animate-slide-up">
                <label className="field-label">Workspace slug</label>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="e.g. wastonix-tech"
                  className="field-input"
                />
                <p className="text-slate-500 text-xs mt-1.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-question text-[10px]" />
                  Leave blank to enter your default workspace
                </p>
              </div>
            )}

            <label className="flex items-center gap-2.5 text-slate-400 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-500"
              />
              Remember me
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full !py-3"
            >
              {loading ? (
                <><i className="fa-solid fa-circle-notch fa-spin" /> Signing in…</>
              ) : (
                <>Sign In <i className="fa-solid fa-arrow-right text-xs" /></>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs text-slate-500">
            <span className="h-px flex-1 bg-white/10" />
            <span className="uppercase tracking-wider font-medium">or continue with</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <a
            href="/oauth2/authorization/google"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 hover:-translate-y-px hover:shadow-tilt"
          >
            <i className="fa-brands fa-google text-base text-[#1a73e8]" />
            Continue with Google
          </a>

          <p className="text-slate-400 text-sm mt-6 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-300 hover:text-brand-200 font-medium">Create one</Link>
          </p>
        </div>

        <p className="text-center mt-5">
          <Link to="/" className="text-slate-600 hover:text-slate-400 text-xs font-medium transition inline-flex items-center gap-1.5">
            <i className="fa-solid fa-arrow-left text-[10px]" /> Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
