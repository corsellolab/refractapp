import React, { useEffect, useState } from 'react';
import { getJSON, fmt, pct } from './lib';

const StatTile = ({ label, value, detail }) => (
  <div className="chart" style={{ padding: '12px 14px' }}>
    <div className="chart-subtitle" style={{ marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: 26, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    {detail && <div className="chart-subtitle" style={{ margin: '4px 0 0' }}>{detail}</div>}
  </div>
);

const Overview = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    getJSON('/api/overview').then(setData).catch(() => setData(false));
  }, []);

  if (data === null) return <p className="hint">Loading overview…</p>;
  if (data === false) return <p className="notice">Couldn’t load the overview.</p>;

  return (
    <div>
      <div className="section">
        <h3>Run at a glance</h3>
        <p className="hint">
          {data.n_endpoints.toLocaleString()} endpoints completed ({data.n_failed} failed; see Methods). An endpoint is
          “predictable” when its best model reaches Pearson r ≥ {data.predictable_r}.
        </p>
        {data.screens.map((s) => (
          <div key={s.screen} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{s.screen}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <StatTile label="Endpoints" value={s.n_endpoints.toLocaleString()} />
              <StatTile label="Predictable" value={pct(s.share_predictable, 1)} detail={`${s.n_predictable.toLocaleString()} endpoints`} />
              <StatTile label="Median best r" value={fmt(s.median_best_r, 2)} />
              <StatTile label="Median # selected features" value={fmt(s.median_selected, 0)} />
            </div>
          </div>
        ))}
      </div>

      {data.weight_table.length > 0 && (
        <div className="section">
          <h3>Hybrid weights, all endpoints</h3>
          <p className="hint">How much the XGBoost + modality-ridge hybrid leans on each component, averaged over endpoints.</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 14, minWidth: 420 }}>
              <thead>
                <tr>
                  {['Component', 'Mean weight', '% zero', '% > 0.5'].map((h, i) => (
                    <th key={h} style={{ ...cell, textAlign: i ? 'right' : 'left', borderBottom: '1px solid var(--axis)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.weight_table.map((row) => (
                  <tr key={row.component}>
                    <td style={cell}>{row.component}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.mean_weight, 3)}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.pct_zero, 1)}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{fmt(row.pct_gt05, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="section">
        <h3>Run figures</h3>
        <p className="hint">Publication figures from the bundle’s visualizations/ folder. Click a figure to open it full size.</p>
        <div className="grid-2">
          {data.figures.map((f) => {
            const src = `/api/overview/figures/${f.name}`;
            return (
              <figure key={f.name} style={{ margin: 0 }}>
                <a href={src} target="_blank" rel="noreferrer">
                  <img className="figure-img" src={src} alt={f.title} loading="lazy" />
                </a>
                <figcaption style={{ marginTop: 6 }}>
                  <strong>{f.title}</strong>
                  <div className="hint">{f.caption}</div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const cell = { borderBottom: '1px solid var(--grid)', padding: '6px 10px' };

export default Overview;
