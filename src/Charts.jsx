import React, { useMemo, useRef, useState } from 'react';
import { fmt } from './lib';

// "Nice" axis ticks covering [min, max]
function niceTicks(min, max, count = 5) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

const tickLabel = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : Number(v.toPrecision(3)).toString());

// Convert a mouse event to SVG viewBox coordinates
function svgPoint(svg, event) {
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  return {
    x: ((event.clientX - rect.left) / rect.width) * vb.width,
    y: ((event.clientY - rect.top) / rect.height) * vb.height,
    px: event.clientX - rect.left,
    py: event.clientY - rect.top,
    width: rect.width,
  };
}

/* ---------------- Predicted vs observed scatter ---------------- */

export function PredictionScatter({ points, title, subtitle, unit }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const W = 520;
  const H = 380;
  const m = { left: 58, right: 16, top: 12, bottom: 46 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;

  const scales = useMemo(() => {
    const values = points.flatMap((p) => [p.observed, p.predicted]);
    const ticks = niceTicks(Math.min(...values), Math.max(...values));
    const lo = ticks[0];
    const hi = ticks[ticks.length - 1];
    const x = (v) => m.left + ((v - lo) / (hi - lo)) * iw;
    const y = (v) => m.top + ih - ((v - lo) / (hi - lo)) * ih;
    return { ticks, lo, hi, x, y };
  }, [points, iw, ih, m.left, m.top]);

  if (!points.length) return null;
  const { ticks, lo, hi, x, y } = scales;

  const onMove = (event) => {
    const p = svgPoint(svgRef.current, event);
    let best = null;
    let bestD = 18 * 18; // hit radius (viewBox units), larger than the mark
    for (const pt of points) {
      const dx = x(pt.observed) - p.x;
      const dy = y(pt.predicted) - p.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = pt;
      }
    }
    setHover(best ? { pt: best, px: p.px, py: p.py, width: p.width } : null);
  };

  return (
    <div className="chart">
      <div className="chart-title">{title}</div>
      {subtitle && <div className="chart-subtitle">{subtitle}</div>}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}: scatter of ${points.length} cell lines`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={m.top} y2={m.top + ih} stroke="var(--grid)" />
            <line x1={m.left} x2={m.left + iw} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={x(t)} y={m.top + ih + 16} textAnchor="middle" fontSize="11" fill="var(--text-secondary)">
              {tickLabel(t)}
            </text>
            <text x={m.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-secondary)">
              {tickLabel(t)}
            </text>
          </g>
        ))}
        {/* y = x: perfect prediction */}
        <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} stroke="var(--axis)" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={x(hi) - 4} y={y(hi) + 14} textAnchor="end" fontSize="11" fill="var(--text-muted)">
          y = x
        </text>
        {points.map((pt) => (
          <circle
            key={pt.sample_id}
            cx={x(pt.observed)}
            cy={y(pt.predicted)}
            r="4"
            fill="var(--series-1)"
            fillOpacity="0.45"
            stroke="var(--surface-1)"
            strokeWidth="1"
          />
        ))}
        {hover && (
          <circle
            cx={x(hover.pt.observed)}
            cy={y(hover.pt.predicted)}
            r="6"
            fill="var(--series-1)"
            stroke="var(--surface-1)"
            strokeWidth="2"
          />
        )}
        <text x={m.left + iw / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="var(--text-secondary)">
          Observed{unit ? ` (${unit})` : ''}
        </text>
        <text
          transform={`translate(14 ${m.top + ih / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize="12"
          fill="var(--text-secondary)"
        >
          Predicted (out-of-fold)
        </text>
      </svg>
      {hover && (
        <div
          className="tooltip"
          style={{
            // Flip to the left of the cursor on the right half so it never overflows
            left: hover.px > hover.width / 2 ? hover.px - 150 : hover.px + 28,
            top: hover.py + 24,
          }}
        >
          <strong>{hover.pt.sample_id}</strong>
          <div>
            <span className="muted">Observed</span> {fmt(hover.pt.observed)}
          </div>
          <div>
            <span className="muted">Predicted</span> {fmt(hover.pt.predicted)}
          </div>
          <div>
            <span className="muted">Test fold</span> {hover.pt.fold}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Horizontal bars (one series) ---------------- */

// Bar with a 4px rounded data end; square at the baseline
function barPath(x0, x1, y, h) {
  const r = Math.min(4, Math.max(0, x1 - x0), h / 2);
  if (x1 - x0 <= 0) return '';
  return `M${x0},${y} H${x1 - r} Q${x1},${y} ${x1},${y + r} V${y + h - r} Q${x1},${y + h} ${x1 - r},${y + h} H${x0} Z`;
}

export function HorizontalBars({ rows, title, subtitle, valueFormat = (v) => fmt(v, 2), missingLabel = 'not used' }) {
  const [hover, setHover] = useState(null);
  const W = 520;
  const rowH = 26;
  const barH = 16;
  const m = { left: 150, right: 48, top: 4, bottom: 26 };
  const iw = W - m.left - m.right;
  const H = m.top + rows.length * rowH + m.bottom;

  const max = Math.max(0.0001, ...rows.map((r) => r.value || 0));
  const ticks = niceTicks(0, max, 4).filter((t) => t >= 0);
  const hi = ticks[ticks.length - 1];
  const x = (v) => m.left + (v / hi) * iw;

  return (
    <div className="chart">
      <div className="chart-title">{title}</div>
      {subtitle && <div className="chart-subtitle">{subtitle}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={m.top} y2={H - m.bottom} stroke="var(--grid)" />
            <text x={x(t)} y={H - m.bottom + 16} textAnchor="middle" fontSize="11" fill="var(--text-secondary)">
              {tickLabel(t)}
            </text>
          </g>
        ))}
        {rows.map((row, i) => {
          const y = m.top + i * rowH + (rowH - barH) / 2;
          const missing = row.value === null || row.value === undefined;
          const active = hover === i;
          return (
            <g key={row.label} onMouseEnter={() => setHover(i)}>
              {/* full-row hit target */}
              <rect x={0} y={m.top + i * rowH} width={W} height={rowH} fill={active ? 'var(--highlight)' : 'transparent'} />
              <text x={m.left - 8} y={y + barH / 2 + 4} textAnchor="end" fontSize="12" fill="var(--text-primary)">
                {row.label}
              </text>
              {!missing && <path d={barPath(m.left, x(row.value), y, barH)} fill="var(--series-1)" />}
              <text
                x={missing ? m.left + 4 : x(row.value) + 6}
                y={y + barH / 2 + 4}
                fontSize="11"
                fill={missing ? 'var(--text-muted)' : 'var(--text-secondary)'}
              >
                {missing ? missingLabel : valueFormat(row.value)}
              </text>
            </g>
          );
        })}
        <line x1={m.left} x2={m.left} y1={m.top} y2={H - m.bottom} stroke="var(--axis)" />
      </svg>
    </div>
  );
}
