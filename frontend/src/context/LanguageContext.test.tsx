import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { LanguageSelector } from '../components/ui/LanguageSelector';

describe('Language Management (Sinhala & English i18n)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default English language', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>,
    });

    expect(result.current.language).toBe('en');
    expect(result.current.t('navDashboard')).toBe('Main Dashboard');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches to Sinhala language and translates keys accurately', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>,
    });

    act(() => {
      result.current.setLanguage('si');
    });

    expect(result.current.language).toBe('si');
    expect(result.current.t('navDashboard')).toBe('ප්‍රධාන උපකරණ පුවරුව');
    expect(result.current.t('navFarms')).toBe('මගේ ගොවිපළවල්');
    expect(result.current.t('newAssessment')).toBe('නව තක්සේරුව');
    expect(document.documentElement.lang).toBe('si');
    expect(localStorage.getItem('agrisense_language')).toBe('si');
  });

  it('toggles between English and Sinhala seamlessly', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>,
    });

    expect(result.current.language).toBe('en');

    act(() => {
      result.current.toggleLanguage();
    });
    expect(result.current.language).toBe('si');
    expect(result.current.t('navOverview')).toBe('දළ විශ්ලේෂණය');

    act(() => {
      result.current.toggleLanguage();
    });
    expect(result.current.language).toBe('en');
    expect(result.current.t('navOverview')).toBe('OVERVIEW');
  });

  it('correctly interpolates dynamic parameters in translations', () => {
    const { result } = renderHook(() => useLanguage(), {
      wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>,
    });

    expect(result.current.t('kpiAcrossHectares', { hectares: '12.5' })).toBe('Across 12.5 total hectares');

    act(() => {
      result.current.setLanguage('si');
    });

    expect(result.current.t('kpiAcrossHectares', { hectares: '12.5' })).toBe('මුළු හෙක්ටයාර 12.5 ක වපසරියක්');
  });

  it('provides safe fallback defaults outside LanguageProvider', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('en');
    expect(result.current.t('navDashboard')).toBe('Main Dashboard');
  });

  it('LanguageSelector compact variant toggles language on click', () => {
    render(
      <LanguageProvider>
        <LanguageSelector variant="compact" />
      </LanguageProvider>
    );

    const button = screen.getByRole('button', { name: /switch language to/i });
    expect(button).toBeTruthy();
    expect(screen.getByText('EN')).toBeTruthy();

    fireEvent.click(button);
    expect(screen.getByText('සිං')).toBeTruthy();
    expect(document.documentElement.lang).toBe('si');
  });

  it('LanguageSelector segmented variant selects English and Sinhala explicitly', () => {
    render(
      <LanguageProvider>
        <LanguageSelector variant="segmented" />
      </LanguageProvider>
    );

    const sinhalaBtn = screen.getByRole('button', { name: /select sinhala language/i });
    expect(sinhalaBtn).toBeTruthy();

    fireEvent.click(sinhalaBtn);
    expect(document.documentElement.lang).toBe('si');

    const englishBtn = screen.getByRole('button', { name: /select english language/i });
    fireEvent.click(englishBtn);
    expect(document.documentElement.lang).toBe('en');
  });
});
