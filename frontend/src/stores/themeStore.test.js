import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from './themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ isDark: false });
  });

  it('setTheme("dark") updates state and persists to localStorage', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().isDark).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('setTheme("light") updates state and persists to localStorage', () => {
    useThemeStore.getState().setTheme('dark');
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().isDark).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('ignores invalid modes without changing state or storage', () => {
    useThemeStore.getState().setTheme('blue');
    expect(useThemeStore.getState().isDark).toBe(false);
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('restores the saved preference on a fresh load', async () => {
    localStorage.setItem('theme', 'dark');
    const vi_ = await import('vitest');
    vi_.vi.resetModules();
    const fresh = await import('./themeStore');
    expect(fresh.useThemeStore.getState().isDark).toBe(true);
  });
});
