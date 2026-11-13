import React, { useState } from 'react';
import {
  LayoutDashboard,
  Tractor,
  MapPin,
  Activity,
  Sparkles,
  History,
  Sprout,
  CheckCircle2,
  Droplets,
  TrendingUp,
  Layers,
  Menu,
  X,
  User,
  Cpu,
  LogOut,
  LogIn,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { FarmModel, HealthStatus } from '../../types';
import { isHealthOnline } from '../../hooks/useBackendHealth';
import { AgriBadge } from '../ui/AgriBadge';
import { AgriButton } from '../ui/AgriButton';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSelector } from '../ui/LanguageSelector';

export type ScreenId =
  | 'dashboard'
  | 'farms'
  | 'farm-details'
  | 'measurements'
  | 'orchestrator'
  | 'history'
  | 'crop-rec'
  | 'crop-confirm'
  | 'irrigation'
  | 'fertilizer'
  | 'yield'
  | 'results'
  | 'settings'
  | 'account'
  | 'diagnostics';

interface AppShellProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  farms: FarmModel[];
  selectedFarmId: string;
  onSelectFarmId: (id: string) => void;
  health: HealthStatus | null;
  healthLoading: boolean;
  isOnline?: boolean;
  onRefreshHealth: () => void;
  onOpenLogin: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentScreen,
  onNavigate,
  farms,
  selectedFarmId,
  onSelectFarmId,
  health,
  healthLoading,
  isOnline,
  onRefreshHealth,
  onOpenLogin,
  children,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isBackendOnline = isOnline !== undefined ? isOnline : isHealthOnline(health);

  const selectedFarm = farms.find((f) => f.farm_id === selectedFarmId) || farms[0];

  const navItems: {
    section: string;
    items: { id: ScreenId; label: string; icon: React.ReactNode; badge?: string }[];
  }[] = [
    {
      section: t('navOverview'),
      items: [
        { id: 'dashboard', label: t('navDashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      section: t('navFarmTelemetry'),
      items: [
        { id: 'farms', label: t('navFarms'), icon: <Tractor className="w-4 h-4" />, badge: farms.length > 0 ? `${farms.length}` : undefined },
        { id: 'farm-details', label: t('navFarmDetails'), icon: <MapPin className="w-4 h-4" /> },
        { id: 'measurements', label: t('navMeasurements'), icon: <Activity className="w-4 h-4" /> },
      ],
    },
    {
      section: t('navAiOrchestration'),
      items: [
        { id: 'orchestrator', label: t('navOrchestrator'), icon: <Sparkles className="w-4 h-4 text-brand-secondary" /> },
        { id: 'history', label: t('navHistory'), icon: <History className="w-4 h-4" /> },
      ],
    },
    {
      section: t('navAiSubsystems'),
      items: [
        { id: 'crop-rec', label: t('navCropRec'), icon: <Sprout className="w-4 h-4 text-emerald-600" /> },
        { id: 'crop-confirm', label: t('navCropConfirm'), icon: <CheckCircle2 className="w-4 h-4 text-blue-600" /> },
        { id: 'irrigation', label: t('navIrrigation'), icon: <Droplets className="w-4 h-4 text-sky-600" /> },
        { id: 'fertilizer', label: t('navFertilizer'), icon: <Layers className="w-4 h-4 text-amber-600" /> },
        { id: 'yield', label: t('navYield'), icon: <TrendingUp className="w-4 h-4 text-purple-600" /> },
        { id: 'results', label: t('navCombinedResults'), icon: <Sparkles className="w-4 h-4 text-brand-primary" /> },
      ],
    },
    {
      section: t('navPlatform'),
      items: [
        { id: 'account', label: t('navAccountSettings'), icon: <User className="w-4 h-4 text-brand-primary" /> },
      ],
    },
    ...(isAdmin
      ? [
          {
            section: t('navAdminSystem'),
            items: [
              {
                id: 'diagnostics' as ScreenId,
                label: t('navSystemDiagnostics'),
                icon: <Cpu className="w-4 h-4 text-amber-600" />,
                badge: 'ADMIN',
              },
            ],
          },
        ]
      : []),
  ];

  const handleNavClick = (screen: ScreenId) => {
    onNavigate(screen);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-canvas text-content-primary flex flex-col antialiased selection:bg-brand-primary selection:text-white">
      <div className="flex flex-1">
        {/* ================================================================= */}
        {/* DESKTOP SIDEBAR (Stitch Layout Specification)                     */}
        {/* ================================================================= */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-surface border-r border-border shrink-0 fixed inset-y-0 z-30">
          {/* Brand Header */}
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded bg-brand-primary flex items-center justify-center text-white shadow-xs">
                <Sprout className="w-5 h-5 text-brand-secondary" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-base tracking-tight text-content-primary">AgriSense AI</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary bg-brand-tint px-1.5 py-0.2 rounded">
                    {isDark ? 'Night Precision' : 'Daylight Precision'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Farm Selector */}
          <div className="p-4 border-b border-border bg-slate-50/60">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-content-muted mb-1.5">
              {t('activeFarmContext')}
            </label>
            <div className="relative">
              <select
                value={selectedFarmId}
                onChange={(e) => onSelectFarmId(e.target.value)}
                className="w-full h-9 pl-3 pr-8 bg-surface border border-border-subtle rounded text-xs font-semibold text-content-primary appearance-none focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer truncate"
              >
                {farms.length === 0 ? (
                  <option value="">{t('noFarmsRegistered')}</option>
                ) : (
                  farms.map((farm) => (
                    <option key={farm.farm_id} value={farm.farm_id}>
                      {farm.name} ({farm.total_area_hectares} ha)
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-content-muted absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin">
            {navItems.map((section) => (
              <div key={section.section} className="space-y-1">
                <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-content-muted">
                  {section.section}
                </div>
                {section.items.map((item) => {
                  const isActive = currentScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full h-10 px-3 rounded flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-brand-tint text-brand-primary border-l-3 border-l-brand-primary font-bold shadow-2xs'
                          : 'text-content-primary hover:bg-slate-100 hover:text-brand-primary'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <span className={isActive ? 'text-brand-primary' : 'text-content-muted'}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-content-primary">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User Profile / Auth Bottom Card */}
          <div className="p-3 border-t border-border bg-slate-50/50">
            {user ? (
              <div className="p-2.5 rounded bg-surface border border-border flex items-center justify-between">
                <div className="flex items-center space-x-2.5 truncate">
                  <div className="w-8 h-8 rounded bg-brand-tint flex items-center justify-center text-brand-primary font-bold text-xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-content-primary truncate">
                        {user.displayName || 'Authorized User'}
                      </span>
                      {isAdmin ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded shrink-0">
                          {t('roleAdmin')}
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-brand-primary bg-brand-tint px-1.5 py-0.2 rounded shrink-0">
                          {t('roleFarmer')}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-content-muted truncate">{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="w-7 h-7 rounded flex items-center justify-center text-content-muted hover:text-semantic-error hover:bg-red-50 transition-colors ml-1 shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="w-full h-10 px-3 rounded bg-surface border border-border-subtle hover:border-brand-primary text-xs font-semibold text-content-primary flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-brand-primary" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </aside>

        {/* ================================================================= */}
        {/* MOBILE NAVIGATION DRAWER (Slide-Over)                             */}
        {/* ================================================================= */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <div className="relative w-72 max-w-[85vw] bg-surface h-full flex flex-col z-10 shadow-2xl border-r border-border">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded bg-brand-primary flex items-center justify-center text-white">
                    <Sprout className="w-4 h-4 text-brand-secondary" />
                  </div>
                  <span className="font-bold text-base text-content-primary">AgriSense AI</span>
                </div>
                <div className="flex items-center space-x-2">
                  <LanguageSelector />
                  <ThemeToggle />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-8 h-8 rounded flex items-center justify-center text-content-muted hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile Active Farm */}
              <div className="p-3 border-b border-border bg-slate-50">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1">
                  {t('activeFarmContext')}
                </label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => onSelectFarmId(e.target.value)}
                  className="w-full h-9 px-2 bg-surface border border-border-subtle rounded text-xs font-semibold text-content-primary"
                >
                  {farms.map((f) => (
                    <option key={f.farm_id} value={f.farm_id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Links */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                {navItems.map((section) => (
                  <div key={section.section} className="space-y-1">
                    <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-content-muted">
                      {section.section}
                    </div>
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full h-11 px-3 rounded flex items-center justify-between text-xs font-semibold ${
                          currentScreen === item.id
                            ? 'bg-brand-tint text-brand-primary font-bold'
                            : 'text-content-primary hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </nav>

              {/* Mobile Profile Card */}
              <div className="p-3 border-t border-border">
                {user ? (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-content-primary truncate">{user.email}</span>
                      {isAdmin ? (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded shrink-0">
                          Admin
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-brand-primary bg-brand-tint px-1.5 py-0.2 rounded shrink-0">
                          Farmer
                        </span>
                      )}
                    </div>
                    <button onClick={logout} className="text-semantic-error font-semibold shrink-0 ml-2">Sign Out</button>
                  </div>
                ) : (
                  <AgriButton variant="primary" size="sm" className="w-full" onClick={onOpenLogin}>
                    Sign In
                  </AgriButton>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MAIN VIEW AREA                                                    */}
        {/* ================================================================= */}
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          {/* Top Navigation Bar */}
          <header className="h-16 bg-surface border-b border-border sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-2xs">
            <div className="flex items-center space-x-3">
              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 rounded flex items-center justify-center text-content-primary hover:bg-slate-100 cursor-pointer"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Screen Breadcrumb */}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-content-primary tracking-tight capitalize">
                  {currentScreen.replace('-', ' ')}
                </h2>
                {selectedFarm && (
                  <div className="text-[11px] text-content-muted flex items-center gap-1.5 hidden sm:flex">
                    <MapPin className="w-3 h-3 text-brand-primary" />
                    <span>{selectedFarm.name}</span>
                    <span>&bull;</span>
                    <span>{selectedFarm.fields.length} field plot(s)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Topbar Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Language Selector */}
              <LanguageSelector />

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Backend Live Indicator */}
              <button
                onClick={onRefreshHealth}
                title="Click to re-verify backend readiness"
                data-testid="global-health-indicator"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-border hover:border-border-subtle text-xs transition-colors cursor-pointer"
              >
                {healthLoading ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-content-muted text-[11px]" data-testid="global-health-text">{t('connecting')}</span>
                  </>
                ) : isBackendOnline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-brand-secondary" />
                    <span className="text-brand-primary font-semibold text-[11px]" data-testid="global-health-text">{t('backendLive')}</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-semantic-error" />
                    <span className="text-semantic-error font-semibold text-[11px]" data-testid="global-health-text">{t('backendOffline')}</span>
                  </>
                )}
              </button>

              {/* New Assessment Primary Action */}
              <AgriButton
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5 text-brand-secondary" />}
                onClick={() => onNavigate('orchestrator')}
                className="hidden sm:inline-flex"
              >
                {t('newAssessment')}
              </AgriButton>

              {/* User Avatar Button (if on mobile or unauthenticated) */}
              {!user && (
                <button
                  onClick={onOpenLogin}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-brand-tint text-brand-primary border border-brand-tint-border hover:bg-emerald-100 cursor-pointer lg:hidden"
                >
                  Sign In
                </button>
              )}
            </div>
          </header>

          {/* Main Content Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-border bg-surface py-5 text-center text-xs text-content-muted">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-content-primary">AgriSense AI</span>
                <span>&bull;</span>
                <span>Google Stitch {isDark ? 'Night' : 'Daylight'} Precision Design System</span>
              </div>
              <div className="flex items-center space-x-3 text-[11px]">
                <AgriBadge variant="academic-demo">Decision Tree v1.0</AgriBadge>
                <AgriBadge variant="academic-demo">Fuzzy Irrigation v1.0</AgriBadge>
                <AgriBadge variant="academic-demo">KB Fertilizer v0.1</AgriBadge>
                <AgriBadge variant="academic-demo">Ridge Yield v1.0</AgriBadge>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
