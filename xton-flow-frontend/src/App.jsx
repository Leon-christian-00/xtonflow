import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { getStoredUser, persistStoredUser } from './utils/authStorage';
import ThemeToggle from './components/ThemeToggle';

function PrivateRoute({ children }) {
  const [status, setStatus] = useState(getStoredUser() ? 'ready' : 'loading');

  useEffect(() => {
    if (status === 'ready') return;
    fetch('/api/auth/session', { credentials: 'include' })
      .then(response => {
        if (!response.ok) throw new Error('Session unavailable');
        return response.json();
      })
      .then(user => {
        persistStoredUser(user);
        setStatus('ready');
      })
      .catch(() => setStatus('unauthenticated'));
  }, [status]);

  if (status === 'loading') return <div className="min-h-screen bg-[var(--bg)]" />;
  return status === 'ready' ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
