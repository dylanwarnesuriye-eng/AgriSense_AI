import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CropRecommendationView } from './CropRecommendationView';
import { apiService } from '../../services/api';

vi.mock('../../services/api', () => ({
  apiService: {
    recommendCrop: vi.fn(),
  },
}));

describe('CropRecommendationView - Task 2 Confidence Invariant', () => {
  it('displays recommended crop, version, and warnings without fabricating confidence when confidence is null', async () => {
    // Mock API output where Decision Tree withholds uncalibrated confidence
    (apiService.recommendCrop as any).mockResolvedValueOnce({
      data: {
        recommended_crop: 'rice',
        model_version: 'crop_decision_tree_v1.0',
        prediction_status: 'success',
        confidence: null, // WITHHELD UNCALIBRATED PROBABILITY
        available_crops: ['rice', 'maize', 'chickpea'],
        pathway_available: true,
        units_verified: false,
        warnings: [
          'Academic Demonstration Mode: Input values evaluated on benchmark scale.',
          'Soil nutrient units require localized agronomic calibration.',
        ],
      },
    });

    const mockNavigate = vi.fn();
    const mockProceed = vi.fn();

    render(
      <CropRecommendationView
        onNavigate={mockNavigate}
        onProceedToConfirmation={mockProceed}
      />
    );

    // Click submit to run evaluation
    const submitBtn = screen.getByRole('button', { name: /Evaluate Crop Suitability/i });
    fireEvent.click(submitBtn);

    // Wait for recommendation result
    await waitFor(() => {
      expect(screen.getByTestId('recommended-crop-name')).toBeDefined();
    });

    // Verify recommended crop is displayed
    const cropNameEl = screen.getByTestId('recommended-crop-name');
    expect(cropNameEl.textContent).toBe('rice');

    // Verify model version is displayed
    expect(screen.getByText('crop_decision_tree_v1.0')).toBeDefined();

    // Verify uncalibrated confidence is withheld and badge clearly explains it
    const withheldBadge = screen.getByTestId('confidence-withheld-badge');
    expect(withheldBadge.textContent).toContain('Confidence: Withheld (Uncalibrated)');

    // Verify no synthetic percentage is shown (e.g. no 100%, 95%, 85%)
    expect(screen.queryByText(/%\s*confidence/i)).toBeNull();

    // Verify all applicable warnings from result.warnings are rendered
    expect(
      screen.getByText('Academic Demonstration Mode: Input values evaluated on benchmark scale.')
    ).toBeDefined();
    expect(
      screen.getByText('Soil nutrient units require localized agronomic calibration.')
    ).toBeDefined();
  });
});
