import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { apiService } from './services/api';
import { useBackendHealth } from './hooks/useBackendHealth';
import { FarmModel, StageBResponse } from './types';
import { AppShell, ScreenId } from './components/layout/AppShell';
import { LoginModal } from './features/auth/LoginModal';
import { AuthLoadingScreen } from './features/auth/AuthLoadingScreen';
import { AuthPage } from './features/auth/AuthPage';

// 13 Screen Views
import { DashboardView } from './features/dashboard/DashboardView';
import { FarmsListView } from './features/farm-management/FarmsListView';
import { FarmDetailView } from './features/farm-management/FarmDetailView';
import { MeasurementsView } from './features/farm-management/MeasurementsView';
import { OrchestratorWorkflow } from './features/orchestrator/OrchestratorWorkflow';
import { AssessmentHistoryView } from './features/orchestrator/AssessmentHistoryView';
import { CropRecommendationView } from './features/crop-recommendation/CropRecommendationView';
import { CropConfirmationView } from './features/crop-recommendation/CropConfirmationView';
import { IrrigationAdvisoryView } from './features/irrigation-advisory/IrrigationAdvisoryView';
import { FertilizerAdvisoryView } from './features/fertilizer-advisory/FertilizerAdvisoryView';
import { YieldPredictionView } from './features/yield-prediction/YieldPredictionView';
import { CombinedAssessmentView } from './features/orchestrator/CombinedAssessmentView';
import { AccountSettingsView } from './features/account/AccountSettingsView';
import { SystemDiagnosticsView } from './features/settings/SettingsView';

const AgriSenseApp: React.FC = () => {
  const { user, isAdmin, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Centralized Health State
  const {
    health,
    loading: healthLoading,
    isOnline,
    apiBase,
    refresh: fetchHealth,
  } = useBackendHealth();

  const [farms, setFarms] = useState<FarmModel[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');

  // Cross-view state transfer
  const [latestAssessment, setLatestAssessment] = useState<StageBResponse | null>(null);
  const [candidateCrop, setCandidateCrop] = useState<string>('rice');
  const [selectedFieldForTelemetry, setSelectedFieldForTelemetry] = useState<string>('');
  const [orchestratorPresetInputs, setOrchestratorPresetInputs] = useState<any>(null);

  const fetchFarms = async () => {
    try {
      const resp = await apiService.getFarms();
      setFarms(resp.data);
      if (!selectedFarmId && resp.data.length > 0) {
        setSelectedFarmId(resp.data[0].farm_id);
      }
    } catch {
      // Unauthenticated or offline
    }
  };

  useEffect(() => {
    if (user) {
      fetchFarms();
    } else {
      // Clear user-specific application state when logged out
      setFarms([]);
      setSelectedFarmId('');
      setLatestAssessment(null);
      setSelectedFieldForTelemetry('');
      setOrchestratorPresetInputs(null);
      setCurrentScreen('dashboard');
    }
  }, [user]);

  const handleAssessmentCompleted = (assessment: StageBResponse) => {
    setLatestAssessment(assessment);
  };

  const handleProceedToConfirmation = (crop: string) => {
    setCandidateCrop(crop);
    setCurrentScreen('crop-confirm');
  };

  const handleStartNewAssessment = () => {
    setCurrentScreen('orchestrator');
  };

  // 1. Dedicated loading screen prevents protected UI flash while Firebase session resolves
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // 2. Unauthenticated Gate: Only render the authentication experience
  if (!user) {
    return <AuthPage />;
  }

  // 3. Authenticated: Render the full protected application
  return (
    <AppShell
      currentScreen={currentScreen}
      onNavigate={(s) => setCurrentScreen(s)}
      farms={farms}
      selectedFarmId={selectedFarmId}
      onSelectFarmId={(id) => setSelectedFarmId(id)}
      health={health}
      healthLoading={healthLoading}
      isOnline={isOnline}
      onRefreshHealth={fetchHealth}
      onOpenLogin={() => setShowLoginModal(true)}
    >
      {/* SCREEN 1: Main Dashboard */}
      {currentScreen === 'dashboard' && (
        <DashboardView
          farms={farms}
          selectedFarmId={selectedFarmId}
          onNavigate={(s) => setCurrentScreen(s)}
          health={health}
        />
      )}

      {/* SCREEN 2: My Farms */}
      {currentScreen === 'farms' && (
        <FarmsListView
          farms={farms}
          selectedFarmId={selectedFarmId}
          onSelectFarmId={(id) => setSelectedFarmId(id)}
          onRefreshFarms={fetchFarms}
          onNavigate={(s) => setCurrentScreen(s)}
        />
      )}

      {/* SCREEN 3: Farm Details & Field Plots */}
      {currentScreen === 'farm-details' && (
        <FarmDetailView
          farms={farms}
          selectedFarmId={selectedFarmId}
          onSelectFarmId={(id) => setSelectedFarmId(id)}
          onRefreshFarms={fetchFarms}
          onNavigate={(s) => setCurrentScreen(s)}
          onSelectFieldForTelemetry={(fId) => {
            setSelectedFieldForTelemetry(fId);
            setCurrentScreen('measurements');
          }}
        />
      )}

      {/* SCREEN 4: Soil & Climate Telemetry Measurements */}
      {currentScreen === 'measurements' && (
        <MeasurementsView
          farms={farms}
          selectedFarmId={selectedFarmId}
          selectedFieldId={selectedFieldForTelemetry}
          onRefreshFarms={fetchFarms}
          onNavigate={(s) => setCurrentScreen(s)}
          onPopulateOrchestrator={(inputs) => {
            setOrchestratorPresetInputs(inputs);
            setCurrentScreen('orchestrator');
          }}
        />
      )}

      {/* SCREEN 5: Two-Stage Assessment Orchestrator */}
      {currentScreen === 'orchestrator' && (
        <OrchestratorWorkflow
          farms={farms}
          selectedFarmId={selectedFarmId}
          onAssessmentCompleted={handleAssessmentCompleted}
          initialInputs={orchestratorPresetInputs}
        />
      )}

      {/* SCREEN 6: Assessment Audit History */}
      {currentScreen === 'history' && (
        <AssessmentHistoryView
          onSelectAssessment={(a) => {
            setLatestAssessment(a);
            setCurrentScreen('results');
          }}
        />
      )}

      {/* SCREEN 7: Crop Recommendation (Standalone Engine 1) */}
      {currentScreen === 'crop-rec' && (
        <CropRecommendationView
          onNavigate={(s) => setCurrentScreen(s)}
          onProceedToConfirmation={handleProceedToConfirmation}
        />
      )}

      {/* SCREEN 8: Crop Confirmation (Stage B Gate) */}
      {currentScreen === 'crop-confirm' && (
        <CropConfirmationView
          farms={farms}
          candidateCrop={candidateCrop}
          onNavigate={(s) => setCurrentScreen(s)}
          onAssessmentCompleted={handleAssessmentCompleted}
        />
      )}

      {/* SCREEN 9: Irrigation Advisory (Standalone Engine 2) */}
      {currentScreen === 'irrigation' && <IrrigationAdvisoryView />}

      {/* SCREEN 10: Fertilizer Advisory (Standalone Engine 3) */}
      {currentScreen === 'fertilizer' && <FertilizerAdvisoryView />}

      {/* SCREEN 11: Yield Prediction (Standalone Engine 4) */}
      {currentScreen === 'yield' && (
        <YieldPredictionView onNavigate={(s) => setCurrentScreen(s)} />
      )}

      {/* SCREEN 12: Combined Multi-Engine Results */}
      {currentScreen === 'results' && (
        <CombinedAssessmentView
          assessment={latestAssessment}
          onNavigate={(s) => setCurrentScreen(s)}
          onStartNewAssessment={handleStartNewAssessment}
        />
      )}

      {/* SCREEN 13: Account Settings (Normal User Experience) */}
      {currentScreen === 'account' && <AccountSettingsView />}

      {/* SCREEN 14: System Diagnostics (Strictly Admin Authorized Only) */}
      {(currentScreen === 'diagnostics' || currentScreen === 'settings') && (
        isAdmin ? (
          <SystemDiagnosticsView
            health={health}
            healthLoading={healthLoading}
            isOnline={isOnline}
            apiBase={apiBase}
            onRefreshHealth={fetchHealth}
          />
        ) : (
          <AccountSettingsView />
        )
      )}

      {/* Authentication / Profile Modal (Screen 1 Login) */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AgriSenseApp />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
