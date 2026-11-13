import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { ThemeToggle } from '../components/ui/ThemeToggle';

describe('Theme Management (Dark Mode & Light Mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default or saved theme and synchronizes with html class', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.theme).toBeDefined();
    // Default should be either light or dark based on system
    expect(['light', 'dark']).toContain(result.current.resolvedTheme);
  });

  it('can explicitly set dark mode, updating document class and localStorage', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('agrisense_theme')).toBe('dark');
  });

  it('can explicitly set light mode, removing dark class', () => {
    localStorage.setItem('agrisense_theme', 'dark');

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('agrisense_theme')).toBe('light');
  });

  it('toggles seamlessly between light and dark modes', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    act(() => {
      result.current.setTheme('light');
    });
    expect(result.current.isDark).toBe(false);

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('returns safe fallback defaults if useTheme is called outside ThemeProvider', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('system');
    expect(result.current.isDark).toBe(false);
    expect(typeof result.current.toggleTheme).toBe('function');
  });

  it('ThemeToggle icon variant renders and toggles theme on click', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /switch to/i });
    expect(button).toBeTruthy();

    const initialThemeIsDark = document.documentElement.classList.contains('dark');
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(!initialThemeIsDark);
  });

  it('ThemeToggle segmented variant renders light, dark, and system buttons', () => {
    render(
      <ThemeProvider>
        <ThemeToggle variant="segmented" />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /switch to system mode/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /switch to light mode/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
