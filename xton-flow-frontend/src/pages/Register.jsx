import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/XtonFlow Logo.png';

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

function LogoHeader() {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <img src={logo} alt="XtonFlow" className="h-10 w-10 object-contain" />
      <span className="font-display text-2xl font-bold text-white tracking-tight">XtonFlow</span>
    </div>
  );
}

function BackLink({ onClick }) {
  return (
    <button onClick={onClick} className="text-slate-500 hover:text-slate-300 text-xs mb-4 transition inline-flex items-center gap-1.5 font-medium">
      <i className="fa-solid fa-arrow-left text-[10px]" /> Back
    </button>
  );
}

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
      <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <LogoHeader />

          <div className="auth-card p-8 animate-slide-up">
            <h2 className="font-display text-2xl font-bold text-white mb-1">Create your account</h2>
            <p className="text-slate-400 text-sm mb-8">How will you be using XtonFlow?</p>

            <div className="space-y-4">
              <button onClick={() => setWorkspaceType('PERSONAL')} className="option-card !bg-white/[.05] group">
                <div className="flex items-center gap-4">
                  <span className="option-icon !bg-brand-500/20"><i className="fa-solid fa-user-astronaut" /></span>
                  <div>
                    <p className="font-semibold text-white">Personal workspace</p>
                    <p className="text-slate-400 text-sm mt-0.5">Just for you — your own private task space. Solo projects, personal goals.</p>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-600 text-xs ml-auto opacity-0 group-hover:opacity-100 transition" />
                </div>
              </button>

              <button onClick={() => setWorkspaceType('TEAM')} className="option-card !bg-white/[.05] group">
                <div className="flex items-center gap-4">
                  <span className="option-icon !bg-brand-500/20"><i className="fa-solid fa-sitemap" /></span>
                  <div>
                    <p className="font-semibold text-white">Organisation / Team</p>
                    <p className="text-slate-400 text-sm mt-0.5">For companies, schools, restaurants, dev teams — any group of 2 or more.</p>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-600 text-xs ml-auto opacity-0 group-hover:opacity-100 transition" />
                </div>
              </button>
            </div>
          </div>

          <p className="text-center mt-4">
            <Link to="/login" className="text-slate-500 hover:text-slate-300 text-xs font-medium transition">Already have an account? Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  if (workspaceType === 'TEAM' && !teamAction) {
    return (
      <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <LogoHeader />

          <div className="auth-card p-8 animate-slide-up">
            <BackLink onClick={() => setWorkspaceType(null)} />
            <h2 className="font-display text-2xl font-bold text-white mb-1">Organisation / Team</h2>
            <p className="text-slate-400 text-sm mb-8">Are you joining an existing org or creating a new one?</p>

            <div className="space-y-4">
              <button onClick={() => setTeamAction('join')} className="option-card !bg-white/[.05] group">
                <div className="flex items-center gap-4">
                  <span className="option-icon !bg-brand-500/20"><i className="fa-solid fa-link" /></span>
                  <div>
                    <p className="font-semibold text-white">Join existing organisation</p>
                    <p className="text-slate-400 text-sm mt-0.5">You have an invite link or org slug from your admin.</p>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-600 text-xs ml-auto opacity-0 group-hover:opacity-100 transition" />
                </div>
              </button>

              <button onClick={() => setTeamAction('create')} className="option-card !bg-white/[.05] group">
                <div className="flex items-center gap-4">
                  <span className="option-icon !bg-brand-500/20"><i className="fa-solid fa-wand-magic-sparkles" /></span>
                  <div>
                    <p className="font-semibold text-white">Create new organisation</p>
                    <p className="text-slate-400 text-sm mt-0.5">You'll be the owner and can invite your team after setup.</p>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-600 text-xs ml-auto opacity-0 group-hover:opacity-100 transition" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: registration form ────────────────────────────────────────────
  if (success) {
    return (
      <div className="auth-bg min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <LogoHeader />
          <div className="auth-card p-8 text-center animate-scale-in">
            <div className="mx-auto mb-5 flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-500/15 border border-brand-500/30">
              <i className="fa-solid fa-envelope-circle-check text-2xl text-brand-300" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-slate-400 text-sm mb-7">{success}</p>
            <button onClick={() => navigate('/login')} className="btn btn-primary w-full">
              Go to Sign In <i className="fa-solid fa-arrow-right text-xs" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const backLabel = workspaceType === 'TEAM' ? () => setTeamAction(null) : () => setWorkspaceType(null);

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <LogoHeader />

        <div className="auth-card p-8 animate-slide-up">
          <BackLink onClick={backLabel} />

          <h2 className="font-display text-2xl font-bold text-white mb-1">
            {workspaceType === 'PERSONAL' && 'Personal workspace'}
            {workspaceType === 'TEAM' && teamAction === 'create' && 'New organisation'}
            {workspaceType === 'TEAM' && teamAction === 'join' && 'Join organisation'}
          </h2>
          <p className="text-slate-400 text-sm mb-7">Fill in your details to get started</p>

          {error && (
            <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-300 p-3.5 rounded-xl mb-4 text-sm animate-fade-in">
              <i className="fa-solid fa-triangle-exclamation mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Org name — only when creating new team */}
            {workspaceType === 'TEAM' && teamAction === 'create' && (
              <div>
                <label className="field-label">Organisation name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Wastonix Tech, The Rusty Fork Bar"
                  className="field-input"
                  required
                />
              </div>
            )}

            {/* Org slug — only when joining */}
            {workspaceType === 'TEAM' && teamAction === 'join' && (
              <div>
                <label className="field-label">Organisation slug / invite code</label>
                <input
                  type="text"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="e.g. wastonix-tech"
                  className="field-input"
                  required
                />
                <p className="text-slate-500 text-xs mt-1.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-question text-[10px]" />
                  Ask your admin for the org slug or use the invite link they sent you
                </p>
              </div>
            )}

            <div>
              <label className="field-label">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="field-input"
                required
              />
            </div>

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
                  placeholder="Min. 6 characters"
                  className="field-input pr-12"
                  required
                  minLength={6}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Birthday <span className="text-slate-600">(optional)</span></label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="field-input [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="field-label">Gender <span className="text-slate-600">(optional)</span></label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="field-input field-select"
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
              className="btn btn-primary w-full !py-3 !mt-2"
            >
              {loading ? (
                <><i className="fa-solid fa-circle-notch fa-spin" /> Creating account…</>
              ) : (
                <>Create account <i className="fa-solid fa-arrow-right text-xs" /></>
              )}
            </button>
          </form>

          <p className="text-slate-400 text-sm mt-6 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-300 hover:text-brand-200 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
