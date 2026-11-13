export type Language = 'en' | 'si';

export const translations = {
  en: {
    // Brand & Header
    appName: 'AgriSense AI',
    tagline: 'Precision Agronomic Intelligence Platform',
    daylightPrecision: 'Daylight Precision',
    nightPrecision: 'Night Precision',
    designSystemDaylight: 'Google Stitch Daylight Precision Design System',
    designSystemNight: 'Google Stitch Night Precision Design System',

    // Navigation Sections
    navOverview: 'OVERVIEW',
    navFarmTelemetry: 'FARM TELEMETRY',
    navAiOrchestration: 'AI ORCHESTRATION',
    navAiSubsystems: 'AI SUBSYSTEMS',
    navPlatform: 'PLATFORM',
    navAdminSystem: 'ADMIN / SYSTEM',

    // Navigation Screens
    navDashboard: 'Main Dashboard',
    navFarms: 'My Farms',
    navFarmDetails: 'Farm & Fields',
    navMeasurements: 'Soil & Climate Telemetry',
    navOrchestrator: 'Two-Stage Assessment',
    navHistory: 'Assessment Audit Trail',
    navCropRec: 'Crop Recommendation',
    navCropConfirm: 'Crop Confirmation',
    navIrrigation: 'Irrigation Advisory',
    navFertilizer: 'Fertilizer Advisory',
    navYield: 'Crop Yield Prediction',
    navCombinedResults: 'Combined AI Results',
    navAccountSettings: 'Account Settings',
    navSystemDiagnostics: 'System Diagnostics',

    // Top Header & Context
    activeFarmContext: 'Active Farm Context',
    noFarmsRegistered: 'No farms registered',
    backendLive: 'Backend: Live',
    backendOffline: 'Backend: Offline',
    connecting: 'Connecting...',
    newAssessment: 'New Assessment',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    roleFarmer: 'Farmer',
    roleAdmin: 'Admin',
    fieldPlotsSuffix: 'field plot(s)',

    // Dashboard Hero & KPIs
    heroBadge1: 'Daylight Field Intelligence',
    heroBadge1Night: 'Night Field Intelligence',
    heroBadge2: '4 Specialized Engines Integrated',
    heroTitle: 'AgriSense AI Decision Support Platform',
    heroDescription: 'Coordinated precision agriculture combining Decision Tree crop suitability, Mamdani fuzzy irrigation, rule-based nutrient diagnosis, and supervised yield prediction within a two-stage farmer-in-the-loop workflow.',
    auditTrailBtn: 'Audit Trail',
    startAssessmentBtn: 'Start Assessment',

    kpiRegisteredFarms: 'Registered Farms',
    kpiAcrossHectares: 'Across {hectares} total hectares',
    kpiActivePlots: 'Active Plots',
    kpiPlotZones: 'Individual soil & crop zones',
    kpiTwoStageWorkflow: 'Two-Stage Workflow',
    kpiFarmerConfirmationRequired: 'Farmer confirmation required',
    kpiAiSubsystems: 'AI Subsystems',
    kpiSubsystemsOperational: 'All subsystems operational',
    kpiDecisionSupportOperational: 'Decision support operational',

    // Dashboard Subsystem Cards
    specializedSubsystemsTitle: 'Specialized Autonomous AI Subsystems',
    specializedSubsystemsDesc: 'Direct access to individual analytical modules with isolated boundaries and rule bases.',

    cropRecTitle: '1. Crop Recommendation',
    cropRecSubtitle: 'Decision Tree • 22 Supported Crop Classes',
    cropRecDesc: 'Evaluates soil nitrogen, phosphorus, potassium, pH, temperature, relative humidity, and rainfall to classify optimal botanical suitability.',
    cropRecNotice: 'Agronomic Invariant: Output is an advisory candidate only. Explicit farmer confirmation required for field planning.',
    cropRecBtn: 'Launch Crop Recommendation',

    irrigationTitle: '2. Irrigation Advisory',
    irrigationSubtitle: 'Mamdani Fuzzy Logic • 36 Rule Base',
    irrigationDesc: 'Models non-linear expert reasoning on soil-water depletion, atmospheric evapotranspiration demand, and effective rainfall with dedicated standing-water routing for paddy rice.',
    irrigationNotice: 'Safety Rule: Urgency score (0-100) represents scheduling priority, not application volume.',
    irrigationBtn: 'Launch Irrigation Advisory',

    fertilizerTitle: '3. Fertilizer Advisory',
    fertilizerSubtitle: 'Knowledge-Based Expert System • Forward Chaining',
    fertilizerDesc: 'Deduces nutrient sufficiency from soil test facts and calculates crop-specific N-P-K nutrient application rates with stoichiometric product conversion.',
    fertilizerNotice: 'Policy Block: Unapproved draft rules are blocked from issuing operational quantities in production mode.',
    fertilizerBtn: 'Launch Fertilizer Diagnosis',

    yieldTitle: '4. Crop Yield Prediction',
    yieldSubtitle: 'Supervised Ridge Regression • 5-Crop Whitelist',
    yieldDesc: 'Estimates harvest tonnage per hectare using regularized multivariate L2 regression across historical soil chemistry and environmental indices.',
    yieldNotice: 'Whitelisted Crops: Wheat, Barley, Corn, Rice, and Soybean only.',
    yieldBtn: 'Launch Yield Prediction',

    // Preferences & Settings
    preferencesTitle: 'Application Preferences',
    unitSystemLabel: 'Measurement Unit System',
    metricUnit: 'Metric (kg/ha, °C)',
    imperialUnit: 'Imperial (lbs/ac, °F)',
    unitSystemDesc: 'Default: Metric (calibrated for agricultural soil chemistry and rainfall telemetry).',
    themeLabel: 'Interface Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    themeDesc: 'Sync with your device appearance or choose light / dark mode.',
    languageLabel: 'Interface Language',
    langEnglish: 'English',
    langSinhala: 'සිංහල',
    languageDesc: 'Select your preferred language / ඔබ කැමති භාෂාව තෝරන්න.',
    autoSaveTelemetry: 'Auto-Save Telemetry',
    autoSaveDesc: 'Automatically syncs field sensor readings directly to your farm records.',

    // Common
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    loading: 'Loading...',
  },

  si: {
    // Brand & Header
    appName: 'AgriSense AI',
    tagline: 'නිරවද්‍ය කෘෂිකාර්මික බුද්ධිමය වේදිකාව',
    daylightPrecision: 'දිවා නිරවද්‍යතාව',
    nightPrecision: 'රාත්‍රී නිරවද්‍යතාව',
    designSystemDaylight: 'Google Stitch දිවා නිරවද්‍යතා සැලසුම් පද්ධතිය',
    designSystemNight: 'Google Stitch රාත්‍රී නිරවද්‍යතා සැලසුම් පද්ධතිය',

    // Navigation Sections
    navOverview: 'දළ විශ්ලේෂණය',
    navFarmTelemetry: 'ගොවිපළ ටෙලිමෙට්‍රි',
    navAiOrchestration: 'AI සම්බන්ධීකරණය',
    navAiSubsystems: 'AI අනුපද්ධති',
    navPlatform: 'වේදිකාව',
    navAdminSystem: 'පරිපාලක / පද්ධතිය',

    // Navigation Screens
    navDashboard: 'ප්‍රධාන උපකරණ පුවරුව',
    navFarms: 'මගේ ගොවිපළවල්',
    navFarmDetails: 'ගොවිපළ සහ ක්ෂේත්‍ර',
    navMeasurements: 'පස සහ දේශගුණ දත්ත',
    navOrchestrator: 'ද්වි-අදියර තක්සේරුව',
    navHistory: 'තක්සේරු විගණන වාර්තාව',
    navCropRec: 'බෝග නිර්දේශය',
    navCropConfirm: 'බෝග තහවුරු කිරීම',
    navIrrigation: 'ජල සම්පාදන උපදේශනය',
    navFertilizer: 'පොහොර උපදේශනය',
    navYield: 'අස්වැන්න පුරෝකථනය',
    navCombinedResults: 'ඒකාබද්ධ AI ප්‍රතිඵල',
    navAccountSettings: 'ගිණුම් සැකසුම්',
    navSystemDiagnostics: 'පද්ධති විනිශ්චය',

    // Top Header & Context
    activeFarmContext: 'ක්‍රියාකාරී ගොවිපළ',
    noFarmsRegistered: 'ගොවිපළවල් ලියාපදිංචි කර නැත',
    backendLive: 'පසුපස සේවා: සක්‍රීයයි',
    backendOffline: 'පසුපස සේවා: අක්‍රීයයි',
    connecting: 'සම්බන්ධ වෙමින්...',
    newAssessment: 'නව තක්සේරුව',
    signIn: 'ඇතුල් වන්න',
    signOut: 'ඉවත් වන්න',
    roleFarmer: 'ගොවි මහතා',
    roleAdmin: 'පරිපාලක',
    fieldPlotsSuffix: 'ක්ෂේත්‍ර බිම් කොටස්',

    // Dashboard Hero & KPIs
    heroBadge1: 'ක්ෂේත්‍ර බුද්ධි තොරතුරු',
    heroBadge1Night: 'රාත්‍රී ක්ෂේත්‍ර තොරතුරු',
    heroBadge2: 'විශේෂිත එන්ජින් 4ක් ඒකාබද්ධයි',
    heroTitle: 'AgriSense AI තීරණ සහායක වේදිකාව',
    heroDescription: 'තීරණ වෘක්ෂ බෝග යෝග්‍යතාව, මැම්ඩානි නොපැහැදිලි තර්කනය මත පදනම් වූ ජල සම්පාදනය, නීති පාදක පොහොර නිර්දේශය සහ අස්වැන්න පුරෝකථනය ගොවි තහවුරු කිරීම් සහිත ද්වි-අදියර ක්‍රියාවලියක් ඔස්සේ සම්බන්ධීකරණය කෙරේ.',
    auditTrailBtn: 'විගණන වාර්තාව',
    startAssessmentBtn: 'තක්සේරුව අරඹන්න',

    kpiRegisteredFarms: 'ලියාපදිංචි ගොවිපළවල්',
    kpiAcrossHectares: 'මුළු හෙක්ටයාර {hectares} ක වපසරියක්',
    kpiActivePlots: 'ක්‍රියාකාරී බිම් කොටස්',
    kpiPlotZones: 'තනි පස සහ බෝග කලාප',
    kpiTwoStageWorkflow: 'ද්වි-අදියර ක්‍රියාවලිය',
    kpiFarmerConfirmationRequired: 'ගොවි තහවුරු කිරීම අවශ්‍යයි',
    kpiAiSubsystems: 'AI අනුපද්ධති',
    kpiSubsystemsOperational: 'සියලු අනුපද්ධති ක්‍රියාකාරීයි',
    kpiDecisionSupportOperational: 'තීරණ සහායක ක්‍රියාකාරීයි',

    // Dashboard Subsystem Cards
    specializedSubsystemsTitle: 'විශේෂිත ස්වාධීන AI අනුපද්ධති',
    specializedSubsystemsDesc: 'ස්වාධීන නීති පද්ධති සහිත විශ්ලේෂණ මොඩියුල වෙත සෘජු ප්‍රවේශය.',

    cropRecTitle: '1. බෝග නිර්දේශය',
    cropRecSubtitle: 'තීරණ වෘක්ෂය • බෝග වර්ග 22ක් සඳහා සහාය',
    cropRecDesc: 'පසෙහි නයිට්‍රජන්, පොස්පරස්, පොටෑසියම්, pH අගය, උෂ්ණත්වය, ආර්ද්‍රතාව සහ වර්ෂාපතනය ඇගයීමෙන් ප්‍රශස්ත බෝග යෝග්‍යතාව වර්ගීකරණය කරයි.',
    cropRecNotice: 'කෘෂි විද්‍යාත්මක නීතිය: මෙම ප්‍රතිඵලය උපදේශන යෝජනාවක් පමණි. ක්ෂේත්‍ර සැලසුම් සඳහා ගොවියාගේ තහවුරු කිරීම අවශ්‍ය වේ.',
    cropRecBtn: 'බෝග නිර්දේශය අරඹන්න',

    irrigationTitle: '2. ජල සම්පාදන උපදේශනය',
    irrigationSubtitle: 'මැම්ඩානි ෆසි තර්කනය • නීති 36ක් සහිත පද්ධතිය',
    irrigationDesc: 'පස්-ජල ක්ෂයවීම, වායුගෝලීය වාෂ්පීකරණ ඉල්ලුම සහ ඵලදායී වර්ෂාපතනය මත පදනම්ව විශේෂඥ දැනුම ආකෘතිකරණය කරයි.',
    irrigationNotice: 'ආරක්ෂිත රීතිය: හදිසි ලකුණු (0-100) කාලසටහන්ගත කිරීමේ ප්‍රමුඛතාවය නියෝජනය කරන අතර ජල ප්‍රමාණය නොවේ.',
    irrigationBtn: 'ජල උපදේශනය අරඹන්න',

    fertilizerTitle: '3. පොහොර උපදේශනය',
    fertilizerSubtitle: 'දැනුම පාදක විශේෂඥ පද්ධතිය • ඉදිරි දාමකරණය',
    fertilizerDesc: 'පස් පරීක්ෂණ දත්ත වලින් පෝෂක ප්‍රමාණවත් බව තීරණය කර නිශ්චිත N-P-K රසායනික පොහොර අවශ්‍යතා ගණනය කරයි.',
    fertilizerNotice: 'ප්‍රතිපත්ති අවහිරය: අනුමත නොකළ කෙටුම්පත් නීති නිෂ්පාදන ප්‍රකාරයේදී ක්‍රියාත්මක වීම වළක්වා ඇත.',
    fertilizerBtn: 'පොහොර රෝග විනිශ්චය අරඹන්න',

    yieldTitle: '4. බෝග අස්වැන්න පුරෝකථනය',
    yieldSubtitle: 'රිජ් ප්‍රතිපායනය • අනුමත බෝග 5ක්',
    yieldDesc: 'ඓතිහාසික පස් රසායනික සහ පාරිසරික දර්ශක හරහා හෙක්ටයාරයකට අපේක්ෂිත අස්වැන්න ටොන් වලින් ගණනය කරයි.',
    yieldNotice: 'අනුමත බෝග: තිරිඟු, බාර්ලි, බඩඉරිඟු, වී සහ සෝයා බෝංචි පමණි.',
    yieldBtn: 'අස්වැන්න පුරෝකථනය අරඹන්න',

    // Preferences & Settings
    preferencesTitle: 'යෙදුම් මනාප',
    unitSystemLabel: 'මිනුම් ඒකක ක්‍රමය',
    metricUnit: 'මෙට්‍රික් (kg/ha, °C)',
    imperialUnit: 'ඉම්පීරියල් (lbs/ac, °F)',
    unitSystemDesc: 'පෙරනිමිය: මෙට්‍රික් (පස් රසායන විද්‍යාව සහ වර්ෂාපතන ටෙලිමෙට්‍රි සඳහා ක්‍රමාංකනය කර ඇත).',
    themeLabel: 'පෙනුම (තේමාව)',
    themeLight: 'දිවා (Light)',
    themeDark: 'රාත්‍රී (Dark)',
    themeSystem: 'පද්ධතිය (System)',
    themeDesc: 'ඔබේ උපාංගයේ පෙනුම සමඟ සමමුහුර්ත කරන්න හෝ දිවා / රාත්‍රී තෝරන්න.',
    languageLabel: 'පද්ධතියේ භාෂාව',
    langEnglish: 'English',
    langSinhala: 'සිංහල',
    languageDesc: 'ඔබ කැමති භාෂාව තෝරන්න / Select your preferred language.',
    autoSaveTelemetry: 'දත්ත ස්වයංක්‍රීයව සුරැකීම',
    autoSaveDesc: 'ක්ෂේත්‍ර සංවේදක කියවීම් ඔබගේ ගොවිපළ වාර්තා වෙත ස්වයංක්‍රීයව සමමුහුර්ත කරයි.',

    // Common
    save: 'සුරකින්න',
    cancel: 'අවලංගු කරන්න',
    confirm: 'තහවුරු කරන්න',
    back: 'ආපසු',
    next: 'ඊළඟ',
    loading: 'පූරණය වෙමින්...',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
