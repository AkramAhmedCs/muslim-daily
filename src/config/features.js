/**
 * Feature Flags for Advanced Features
 * Toggle these to enable/disable features in the app.
 * Only enable strict QA features (Scholar Review) for authorized builds.
 */
export const FEATURES = {
  // Provenance & Content
  tafsir: true,
  search: true,
  scholar_review: true, // Enable for dev/QA

  // User Engagement
  goals: true,
  haptics: true,
  share_card: true,
};

export const isFeatureEnabled = (featureName) => {
  return FEATURES[featureName] || false;
};
