import React, { useMemo, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox } from '@mui/material';
import DataTable from './DataTable';
import EndpointDetail from './EndpointDetail';
import { fmt, modelLabel, PREDICTABLE_R } from './lib';

const TYPES = ['All', 'Gene dependency', 'PRISM primary', 'PRISM secondary'];

const EndpointBrowser = ({ endpoints, model, onModelChange, selectedId, onSelect, onFeatureSelect }) => {
  const [type, setType] = useState('All');
  const [predictableOnly, setPredictableOnly] = useState(false);
  const [downloadedOnly, setDownloadedOnly] = useState(false);

  const rows = useMemo(
    () =>
      endpoints
        .filter((e) => type === 'All' || e.Type === type)
        .filter((e) => !predictableOnly || (e['Best R'] !== null && e['Best R'] >= PREDICTABLE_R))
        .filter((e) => !downloadedOnly || e.has_results)
        .map((e) => {
          const r = e.pearson[model];
          const rf = e.pearson.rf;
          // Selected model minus RF; missing if either r is missing
          const diff = r == null || rf == null ? null : Number((r - rf).toFixed(3));
          return { ...e, 'Pearson R': r, 'RF R': rf, 'R Diff': diff };
        }),
    [endpoints, type, predictableOnly, downloadedOnly, model]
  );

  const columns = [
    { key: 'Name', label: 'Name', format: (v, row) => (row.has_results ? <strong>{v}</strong> : v) },
    { key: 'Type', label: 'Type' },
    { key: 'RF R', label: 'r (Random Forest)', numeric: true, format: (v) => fmt(v) },
    { key: 'Pearson R', label: `r (${modelLabel(model)})`, numeric: true, format: (v) => fmt(v) },
    {
      key: 'R Diff',
      label: `Δr (${modelLabel(model)} − RF)`,
      numeric: true,
      format: (v) => (v == null ? fmt(v) : `${v > 0 ? '+' : ''}${fmt(v)}`),
    },
    { key: 'Best R', label: 'Best r', numeric: true, format: (v) => fmt(v) },
    { key: 'Best Model', label: 'Best model', format: (v) => modelLabel(v) },
    { key: '# Selected', label: '# Selected', numeric: true },
    { key: 'Cell Lines', label: 'Cell lines', numeric: true },
    { key: 'Target', label: 'Target' },
    { key: 'MOA', label: 'MOA' },
    { key: 'Class', label: 'Class' },
  ];

  const nDownloaded = endpoints.filter((e) => e.has_results).length;

  const toolbar = (
    <>
      <FormControl size="small" style={{ minWidth: 180 }}>
        <InputLabel id="type-label">Screen</InputLabel>
        <Select labelId="type-label" label="Screen" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControlLabel
        control={<Checkbox checked={predictableOnly} onChange={(e) => setPredictableOnly(e.target.checked)} />}
        label={`Predictable (best r ≥ ${PREDICTABLE_R})`}
      />
      <FormControlLabel
        control={<Checkbox checked={downloadedOnly} onChange={(e) => setDownloadedOnly(e.target.checked)} />}
        label={`Results downloaded (${nDownloaded})`}
      />
    </>
  );

  return (
    <div>
      <p className="hint">
        {endpoints.length.toLocaleString()} endpoints. <strong>Bold</strong> names have their full results folder
        downloaded (plots, top features, predictions); the rest show run-level data only.
      </p>
      <DataTable
        columns={columns}
        data={rows}
        filterKeys={['Name', 'Target', 'MOA', 'Class', 'id']}
        filterLabel="Search name, target, MOA or class"
        toolbar={toolbar}
        onRowClick={(row) => onSelect(row.id)}
        selectedId={selectedId}
        initialSort={{ key: 'Best R', direction: 'desc' }}
      />
      <div id="endpoint-detail" style={{ scrollMarginTop: 16 }}>
        <EndpointDetail
          endpointId={selectedId}
          model={model}
          onModelChange={onModelChange}
          onFeatureSelect={onFeatureSelect}
        />
      </div>
    </div>
  );
};

export default EndpointBrowser;
