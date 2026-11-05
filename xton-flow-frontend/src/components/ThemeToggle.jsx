import { useTheme } from '../utils/themeContext';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === 'dark'}
      title={`Switch to ${nextTheme} mode`}
      className="fixed bottom-5 right-5 z-[100] inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text)] shadow-lg transition hover:bg-[var(--surface-2)] focus-visible:outline-none"
    >
      <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true" />
      <span>{nextTheme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
    </button>
  );
}

export default ThemeToggle;
