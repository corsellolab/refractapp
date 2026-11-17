import React, { useEffect, useState } from 'react';
import { Chip } from '@mui/material';
import DataTable from './DataTable';
import { PredictionScatter, HorizontalBars } from './Charts';
import { getJSON, endpointPath, fmt, pct, modelLabel, MODEL_LABELS } from './lib';

// Shows a PNG served by the API, or a fallback message if it is missing
export const ResultImage = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed) return <p className="hint">No {alt} image available.</p>;
  return <img className="figure-img" src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
};

// Loads JSON for the current endpoint/model; null while loading or if unavailable
function useJSON(url) {
  const [state, setState] = useState({ url: null, data: null });
  useEffect(() => {
    if (!url) return undefined;
    let cancelled = false;
    getJSON(url)
      .then((data) => !cancelled && setState({ url, data }))
      .catch(() => !cancelled && setState({ url, data: null }));
    return () => {
      cancelled = true;
    };
  }, [url]);
  return state.url === url ? state.data : null;
}

const PERFORMANCE_COLUMNS = [
  { key: 'pearson_r', label: 'Pearson r', digits: 3 },
  { key: 'spearman_r', label: 'Spearman r', digits: 3 },
  { key: 'r2', label: 'R²', digits: 3 },
  { key: 'rmse', label: 'RMSE', digits: 3 },
  { key: 'mae', label: 'MAE', digits: 3 },
  { key: 'relative_mse_skill', label: 'MSE skill', digits: 3 },
  { key: 'precision_at_10pct', label: 'Precision @10%', digits: 2 },
  { key: 'recall_at_10pct', label: 'Recall @10%', digits: 2 },
];

function ModelComparison({ performance, model, onModelChange, bestModel, hasResults }) {
  const columns = PERFORMANCE_COLUMNS.filter((c) => performance.some((p) => p[c.key] !== null && p[c.key] !== undefined));
  const order = Object.keys(MODEL_LABELS);
  const rows = [...performance].sort((a, b) => order.indexOf(a.model) - order.indexOf(b.model));

  return (
    <div className="section">
      <h3>Model comparison</h3>
      <p className="hint">
        Pooled out-of-fold metrics for all seven models. Click a row to switch the plots below to that model.
        {!hasResults && ' Only Pearson r and tail precision are available until this endpoint’s results folder is downloaded.'}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="metrics-table" style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={th}>Model</th>
              {columns.map((c) => (
                <th key={c.key} style={{ ...th, textAlign: 'right' }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const selected = p.model === model;
              return (
                <tr
                  key={p.model}
                  onClick={() => onModelChange(p.model)}
                  style={{ cursor: 'pointer', background: selected ? 'var(--highlight)' : undefined }}
                >
                  <td style={{ ...td, fontWeight: selected ? 600 : 400 }}>
                    {modelLabel(p.model)}
                    {p.model === bestModel && <Chip label="best r" size="small" style={{ marginLeft: 8 }} />}
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(p[c.key], c.digits)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { borderBottom: '1px solid var(--axis)', padding: '6px 10px', textAlign: 'left', whiteSpace: 'nowrap' };
const td = { borderBottom: '1px solid var(--grid)', padding: '6px 10px', whiteSpace: 'nowrap' };

const SELECTED_COLUMNS = [
  { key: 'sel_rank', label: 'Rank', numeric: true, width: 60 },
  { key: 'feature_id', label: 'Feature' },
  { key: 'gene', label: 'Gene' },
  { key: 'modality', label: 'Data type' },
  { key: 'paired_exceedance_frequency', label: 'Exceedance', numeric: true, format: (v) => fmt(v, 2) },
  { key: 'mean_excess_importance', label: 'Excess importance', numeric: true, format: (v) => fmt(v, 4) },
  { key: 'rf_rank', label: 'RF rank', numeric: true, format: (v) => (v == null ? 'N/A' : v) },
];

const TOP_FEATURE_COLUMNS = [
  { key: 'rank', label: 'Rank', numeric: true, width: 60 },
  { key: 'feature_id', label: 'Feature' },
  { key: 'modality', label: 'Data type' },
  { key: 'mean_abs_shap', label: 'Mean |SHAP|', numeric: true, format: (v) => fmt(v, 4) },
  { key: 'fold_fraction', label: 'Folds', numeric: true, format: (v) => pct(v) },
];

const EndpointDetail = ({ endpointId, model, onModelChange, onFeatureSelect }) => {
  const detail = useJSON(endpointId ? endpointPath(endpointId) : null);
  const hasResults = Boolean(detail && detail.has_results);
  const base = endpointId ? endpointPath(endpointId) : '';
  const modelQuery = `?model=${encodeURIComponent(model)}`;
  const predictions = useJSON(hasResults ? `${base}/predictions${modelQuery}` : null);
  const topFeatures = useJSON(hasResults ? `${base}/top_features${modelQuery}` : null);

  if (!endpointId) {
    return <p className="hint">Select an endpoint in the table to see its results.</p>;
  }
  if (!detail || detail.id !== endpointId) {
    return <p className="hint">Loading endpoint…</p>;
  }

  const r = detail.pearson ? detail.pearson[model] : null;
  const weights = (detail.weights || []).map((w) => ({ label: w.component, value: w.weight }));
  const chips = [
    detail.Type,
    detail.Target && `Target: ${detail.Target}`,
    detail.MOA && `MOA: ${detail.MOA}`,
    detail.Class && `Class: ${detail.Class}`,
    detail['Cell Lines'] && `${detail['Cell Lines']} cell lines`,
    ...Object.entries(detail.info || {}).map(([k, v]) => `${k}: ${v}`),
  ].filter(Boolean);

  return (
    <div>
      <div className="section">
        <h2 style={{ marginBottom: 8 }}>{detail.Name}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {chips.map((c) => (
            <Chip key={c} label={c} size="small" variant="outlined" />
          ))}
        </div>
        {!hasResults && (
          <p className="notice" style={{ marginTop: 12 }}>
            This endpoint’s results folder isn’t downloaded, so only run-level data is shown (model r values,
            hybrid weights and selected features). Copy <code>results/{detail.id}/</code> into your local
            data folder to see its plots, full metrics, top features and predictions.
          </p>
        )}
      </div>

      <ModelComparison
        performance={detail.performance}
        model={model}
        onModelChange={onModelChange}
        bestModel={detail['Best Model']}
        hasResults={hasResults}
      />

      <div className="section grid-2">
        {hasResults ? (
          predictions && predictions.length ? (
            <PredictionScatter
              points={predictions}
              title={`Predicted vs. observed · ${modelLabel(model)}`}
              subtitle={`Pearson r = ${fmt(r)} · ${predictions.length} cell lines · hover a point for details`}
              unit={detail.info && detail.info['Response unit']}
            />
          ) : (
            <div className="chart">
              <p className="hint">Loading predictions…</p>
            </div>
          )
        ) : (
          <div className="chart">
            <div className="chart-title">Predicted vs. observed</div>
            <p className="hint">Needs the endpoint’s results folder.</p>
          </div>
        )}
        {weights.length > 0 && (
          <HorizontalBars
            rows={weights}
            title="How the XGBoost hybrid weights each data type"
            subtitle="Mean additive weight across outer folds (XGBoost + modality ridge). “not used” = data type excluded for this screen."
          />
        )}
      </div>

      {hasResults && (
        <div className="section grid-2">
          <div>
            <h3>SHAP summary · {modelLabel(model)}</h3>
            <p className="hint">Top features by SHAP value for the selected model.</p>
            <ResultImage src={`${base}/plots/shap_summary${modelQuery}`} alt="SHAP summary" />
          </div>
          <div>
            <h3>Top features · {modelLabel(model)}</h3>
            <p className="hint">Ranked by mean |SHAP|; “Folds” is the share of outer folds where the feature was used.</p>
            {topFeatures ? (
              <DataTable
                columns={TOP_FEATURE_COLUMNS}
                data={topFeatures}
                rowKey={(row) => row.feature_id}
                filterKeys={['feature_id', 'gene_symbol', 'modality']}
                filterLabel="Filter features"
                rowsPerPageOptions={[10, 25, 50]}
              />
            ) : (
              <p className="hint">Loading…</p>
            )}
          </div>
        </div>
      )}

      <div className="section">
        <h3>Selected features ({detail.selected_features.length})</h3>
        <p className="hint">
          Features whose importance on real labels reproducibly exceeds a shuffled-label reference (D &gt; 0.5 in at least
          half of 100 partitions). “Exceedance” is that fraction of partitions. Click a feature to see every endpoint that
          selects it.
        </p>
        <DataTable
          columns={SELECTED_COLUMNS}
          data={detail.selected_features}
          rowKey={(row) => row.feature_id}
          filterKeys={['feature_id', 'gene', 'modality']}
          filterLabel="Filter selected features"
          onRowClick={(row) => onFeatureSelect(row.feature_id)}
          emptyMessage="No features were selected for this endpoint."
        />
        {hasResults && (
          <div style={{ marginTop: 16, maxWidth: 720 }}>
            <ResultImage src={`${base}/plots/selection`} alt="feature selection" />
          </div>
        )}
      </div>
    </div>
  );
};

export default EndpointDetail;
