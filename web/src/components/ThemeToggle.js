import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ThemeToggle — small icon button that flips between dark and light.
 * Uses semantic tokens so it adapts to the active theme.
 */
const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`relative group p-2 rounded-lg transition-all duration-200 ${className}`}
      style={{
        background: 'var(--token-surface-elevated)',
        border: '1px solid var(--token-border)',
        color: 'var(--token-text-secondary)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--token-border-strong)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--token-border)'; }}
      data-testid="theme-toggle"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <div className="relative w-4 h-4">
        <Sun
          className={`absolute inset-0 w-4 h-4 transition-all duration-300 ${
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'
          }`}
          style={{ color: 'var(--t-warning)' }}
        />
        <Moon
          className={`absolute inset-0 w-4 h-4 transition-all duration-300 ${
            !isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
          }`}
          style={{ color: 'var(--token-text-secondary)' }}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
