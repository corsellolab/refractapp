// Shared API helper, labels and number formats

export async function getJSON(url) {
  const response = await fetch(url);
  if (response.status === 401) {
    // Session expired (e.g. the API restarted): back to the login page
    window.location.href = '/';
    throw new Error('Not logged in');
  }
  if (!response.ok) {
    const error = new Error(`${url} returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const MODEL_LABELS = {
  lightgbm: 'LightGBM',
  xgboost: 'XGBoost',
  rf: 'Random Forest',
  elasticnet: 'ElasticNet',
  rf_modality_ridge: 'RF + modality ridge',
  lgbm_modality_ridge: 'LightGBM + modality ridge',
  xgb_modality_ridge: 'XGBoost + modality ridge',
};

export const modelLabel = (model) => MODEL_LABELS[model] || model || 'N/A';

export const PREDICTABLE_R = 0.3;

export function fmt(value, digits = 3) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
    return 'N/A';
  }
  return Number(value).toFixed(digits);
}

export function pct(value, digits = 0) {
  if (value === null || value === undefined) return 'N/A';
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export const endpointPath = (id) => `/api/endpoints/${encodeURIComponent(id)}`;
