import { test, expect, Page } from '@playwright/test';

async function navigateTo(page: Page, isMobile: boolean | undefined, label: string) {
  if (isMobile) {
    const menuBtn = page.locator('button[aria-label="Open mobile menu"]');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(300);
    }
    const navBtn = page.locator('nav').locator(`button:has-text("${label}")`).last();
    await navBtn.scrollIntoViewIfNeeded();
    await navBtn.click({ force: true });
    await page.waitForTimeout(300);
  } else {
    const navBtn = page.locator('aside').locator(`button:has-text("${label}")`).first();
    await navBtn.scrollIntoViewIfNeeded();
    await navBtn.click();
  }
}

test.describe.serial('AgriSense AI — Complete Farmer Journey (13 Screens)', () => {
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    // Shared page instance across serial steps to maintain farmer session and context
    const isMobile = testInfo.project.name.includes('Mobile');
    const context = await browser.newContext(
      isMobile
        ? {
            viewport: { width: 390, height: 844 },
            userAgent:
              'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          }
        : {
            viewport: { width: 1280, height: 720 },
          }
    );
    page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // If presented with Auth Guard Login view, authenticate session
    const welcomeTitle = page.locator('text=Welcome Back');
    if (await welcomeTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
      const demoBtn = page.locator('button:has-text("Farmer John (101)")');
      if (await demoBtn.isVisible()) {
        await demoBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test.afterAll(async () => {
    if (page) {
      await page.close();
    }
  });

  test('Screen 1 & 2: Main Dashboard, Health Diagnostic & Initial Session', async () => {
    // 1. Verify Backend Live badge in top header (visible on both mobile and desktop)
    await expect(page.locator('button:has-text("Backend: Live")')).toBeVisible({ timeout: 10000 });

    // 2. Verify Screen Title on Dashboard
    await expect(page.locator('h1')).toContainText('AgriSense AI Decision Support Platform');

    // 3. Verify System KPI metrics on Dashboard
    await expect(page.locator('text=Registered Farms').first()).toBeVisible();
    await expect(page.locator('text=Subsystems Live').first()).toBeVisible();
  });

  test('Screen 3 & 4: Farm Creation & Field Plot Management', async ({ isMobile }) => {
    await navigateTo(page, isMobile, 'My Farms');

    // Verify navigation to My Farms
    await expect(page.locator('h1')).toContainText('Farm Registry');

    // Click "Register New Farm" button
    const registerFarmBtn = page.locator('button:has-text("Register New Farm"), button:has-text("Register Farm Now")').first();
    await registerFarmBtn.click();

    // Fill Farm Registration Form in Modal
    await page.locator('input[placeholder*="Green Valley"]').fill('Piedmont Agroforestry Trial');
    await page.locator('input[placeholder*="Sacramento Valley"]').fill('Central Highland Region');
    await page.locator('input[placeholder*="Center pivot"]').fill('Primary field plot for Phase 5 verification');

    // Submit Farm Creation
    await page.locator('button:has-text("Create Farm")').click({ force: true });

    // Verify the newly created farm appears in main card list
    await expect(page.locator('main').locator('text=Piedmont Agroforestry Trial').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('main').locator('text=Central Highland Region').first()).toBeVisible();

    // Navigate to Farm & Fields Detail View
    const viewFieldsBtn = page.locator('main').locator('button:has-text("View Fields")').first();
    await viewFieldsBtn.click();

    await expect(page.locator('h1')).toContainText('Piedmont Agroforestry Trial');

    // Click "Add Field Plot"
    await page.locator('button:has-text("Add Field Plot")').click();

    // Fill Field Form
    await page.locator('input[placeholder*="North Plot B-12"]').fill('Terrace Plot Alpha');
    await page.locator('button:has-text("Save Field Plot")').click({ force: true });

    // Verify new field plot appears in main view
    await expect(page.locator('main').locator('text=Terrace Plot Alpha').first()).toBeVisible({ timeout: 10000 });
  });

  test('Screen 5: Soil & Climate Telemetry Logging', async ({ isMobile }) => {
    await navigateTo(page, isMobile, 'Soil & Climate Telemetry');

    await expect(page.locator('h1')).toContainText('Soil Chemistry & Environmental Telemetry');

    // Submit Telemetry Log
    await page.locator('button:has-text("Save Telemetry")').click({ force: true });

    // Verify Success Alert
    await expect(page.locator('text=Soil and climate telemetry recorded successfully.')).toBeVisible({ timeout: 10000 });
  });

  test('Screen 6: Crop Recommendation & Agronomic Confidence Invariant', async ({ isMobile }) => {
    await navigateTo(page, isMobile, '1. Crop Recommendation');

    await expect(page.locator('h1')).toContainText('Decision Tree Crop Recommendation');

    // Click "Load Paddy Preset"
    await page.locator('button:has-text("Load Paddy Preset")').click({ force: true });

    // Click "Evaluate Crop Suitability"
    await page.locator('button:has-text("Evaluate Crop Suitability")').click({ force: true });

    // Verify Recommended Crop appears
    const cropNameEl = page.locator('[data-testid="recommended-crop-name"]');
    await expect(cropNameEl).toBeVisible({ timeout: 10000 });
    await expect(cropNameEl).toHaveText('rice');

    // CRITICAL SAFETY CHECK: Uncalibrated confidence must be withheld
    const withheldBadge = page.locator('[data-testid="confidence-withheld-badge"]');
    await expect(withheldBadge).toBeVisible();
    await expect(withheldBadge).toContainText('Confidence: Withheld (Uncalibrated)');

    // Verify Caveat Warnings are rendered
    await expect(page.locator('[data-testid="crop-warnings-list"]')).toBeVisible();
  });

  test('Screen 7: Crop Confirmation & Operational Dispatch Gate', async ({ isMobile }) => {
    await navigateTo(page, isMobile, '2. Crop Confirmation');

    await expect(page.locator('h1')).toContainText('Crop Confirmation & Operational Dispatch');
    await expect(page.locator('text=Stage A AI Recommendation Candidate')).toBeVisible();

    // Dispatch Stage B from Crop Confirmation
    await page.locator('button:has-text("Confirm & Execute Stage B Evaluation")').click({ force: true });

    // Verify redirect/transition to Combined Results screen
    await expect(page.locator('text=Combined Precision Advisory').first()).toBeVisible({ timeout: 15000 });
  });

  test('Screen 8: Standalone Irrigation Advisory (Mamdani Fuzzy Logic)', async ({ isMobile }) => {
    await navigateTo(page, isMobile, '3. Irrigation Advisory');

    await expect(page.locator('h1')).toContainText('Mamdani Fuzzy Logic Irrigation Advisory');

    // Load Drought Stress Scenario
    await page.locator('button:has-text("Load Drought Stress Scenario")').click({ force: true });

    // Execute Fuzzy Inference
    await page.locator('button:has-text("Execute Fuzzy Inference")').click({ force: true });

    // Verify Output Urgency Score
    await expect(page.locator('text=Calculated Urgency Index')).toBeVisible({ timeout: 10000 });

    // Verify Draft Rules Status Notice
    await expect(page.locator('text=The 36 fuzzy rules are currently classified under')).toBeVisible();
  });

  test('Screen 9: Standalone Fertilizer Advisory (Rule-Based Expert System)', async ({ isMobile }) => {
    await navigateTo(page, isMobile, '4. Fertilizer Advisory');

    await expect(page.locator('h1')).toContainText('Rule-Based Fertilizer Expert System');

    // Enable Academic Simulation Mode to inspect draft prescriptions
    await page.locator('input[type="checkbox"]').first().check({ force: true });

    // Click "Diagnose Nutrients"
    await page.locator('button:has-text("Diagnose Nutrients")').click({ force: true });

    // Verify Nutrient Status
    await expect(page.locator('text=Nutrient Diagnosis & Prescriptions')).toBeVisible({ timeout: 10000 });

    // CRITICAL SAFETY CHECK: Simulation disclaimer on draft rules
    await expect(page.locator('text=Draft Simulation — Not an Approved Field Instruction').first()).toBeVisible();
  });

  test('Screen 10: Standalone Crop Yield Prediction (5-Crop Whitelist)', async ({ isMobile }) => {
    await navigateTo(page, isMobile, '5. Yield Prediction');

    await expect(page.locator('h1')).toContainText('Supervised Crop Yield Prediction');

    // Verify 5-crop whitelist card
    await expect(page.locator('text=Whitelist Invariant Enforcement')).toBeVisible();
    await expect(page.locator('text=Wheat, Barley, Corn, Rice, Soybean')).toBeVisible();

    // Click "Predict Crop Yield"
    await page.locator('button:has-text("Predict Crop Yield")').click({ force: true });

    // Verify Forecast Output
    await expect(page.locator('text=Predicted Yield Forecast')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Expected Productivity')).toBeVisible();
    await expect(page.getByText('t/ha', { exact: true }).first()).toBeVisible();
  });

  test('Screen 11 & Combined Results: Two-Stage Assessment Orchestrator', async ({ isMobile }) => {
    await navigateTo(page, isMobile, 'Two-Stage Assessment');

    await expect(page.locator('h1')).toContainText('Integrated Multi-Subsystem Assessment');

    // Step 1: Run Stage A Recommendation
    await page.locator('button:has-text("Evaluate Stage A Recommendation")').click({ force: true });

    // Step 2: Verify Farmer Confirmation Gate
    await expect(page.locator('text=Step 2: Explicit Farmer Crop Confirmation Gate')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Stage A Recommendation Proposal')).toBeVisible();

    // Confirm Crop and Dispatch Stage B
    await page.locator('button:has-text("Confirm & Run Multi-Engine Evaluation")').click({ force: true });

    // Step 3: Verify Combined Results (Autonomous Engine Result Cards)
    await expect(page.locator('text=Assessment Audit Record')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('main').locator('text=Irrigation Advisory').first()).toBeVisible();
    await expect(page.locator('main').locator('text=Fertilizer Advisory').first()).toBeVisible();
    await expect(page.locator('main').locator('text=Crop Yield Prediction').first()).toBeVisible();
  });

  test('Screen 12: Assessment Audit Trail & Historical Record', async ({ isMobile }) => {
    // View Assessment Audit Trail (Screen 12)
    await navigateTo(page, isMobile, 'Assessment Audit Trail');

    await expect(page.locator('h1')).toContainText('Assessment History & Audit Trail');
    // Verify historical audit record is listed
    await expect(page.locator('main').locator('text=rice').first()).toBeVisible({ timeout: 10000 });
  });

  test('Screen 13: Account Settings & Session Sign Out', async ({ isMobile }) => {
    await navigateTo(page, isMobile, 'Account Settings');

    await expect(page.locator('h1')).toContainText('Account Settings');
    await expect(page.locator('text=Profile Information')).toBeVisible();
    await expect(page.locator('text=Password & Security')).toBeVisible();

    // Test Sign Out
    if (isMobile) {
      await page.locator('button[aria-label="Open mobile menu"]').click();
      await page.waitForTimeout(300);
      await page.locator('button:has-text("Sign Out")').click({ force: true });
      // In mobile drawer, signing out immediately switches profile card to Sign In button
      await expect(page.locator('button:has-text("Sign In")').last()).toBeVisible({ timeout: 5000 });
    } else {
      const signOutBtn = page.locator('aside').locator('button[title="Sign out"]');
      await signOutBtn.click();
      await expect(page.locator('text=Sign In').first()).toBeVisible({ timeout: 5000 });
    }
  });
});
