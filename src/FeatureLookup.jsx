import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import DataTable from './DataTable';
import { getJSON, fmt } from './lib';

const COLUMNS = [
  { key: 'Name', label: 'Endpoint', format: (v, row) => (row.has_results ? <strong>{v}</strong> : v) },
  { key: 'Type', label: 'Type' },
  { key: 'Selection rank', label: 'Selection rank', numeric: true },
  { key: 'Exceedance', label: 'Exceedance', numeric: true, format: (v) => fmt(v, 2) },
  { key: 'RF rank', label: 'RF rank', numeric: true },
  { key: 'Best R', label: 'Best r', numeric: true, format: (v) => fmt(v) },
  { key: 'Target', label: 'Target' },
  { key: 'MOA', label: 'MOA' },
];

// "Which endpoints select this feature?" — reverse lookup over all selected (feature, endpoint) pairs
const FeatureLookup = ({ featureId, onFeatureChange, onEndpointSelect }) => {
  const [input, setInput] = useState(featureId || '');
  const [options, setOptions] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = input.trim();
    if (q.length < 2) {
      setOptions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      getJSON(`/api/features/search?q=${encodeURIComponent(q)}`)
        .then(setOptions)
        .catch(() => setOptions([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (!featureId) {
      setResult(null);
      return;
    }
    setError(null);
    getJSON(`/api/features/${encodeURIComponent(featureId)}`)
      .then(setResult)
      .catch(() => {
        setResult(null);
        setError(`${featureId} is not selected for any endpoint.`);
      });
  }, [featureId]);

  return (
    <div>
      <p className="hint">
        Search a gene or feature (e.g. <code>KRAS</code>, <code>MUTHS_BRAF</code>, <code>GE_ETV4</code>) to see every
        endpoint whose sparse selection kept it, across all 9,729 endpoints.
      </p>
      <Autocomplete
        freeSolo
        options={options}
        filterOptions={(x) => x}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.feature_id)}
        renderOption={(props, o) => (
          <li {...props} key={o.feature_id}>
            <span style={{ flex: 1 }}>{o.feature_id}</span>
            <span className="hint" style={{ margin: 0 }}>
              {o.modality} · {o.n_endpoints} endpoints
            </span>
          </li>
        )}
        inputValue={input}
        onInputChange={(e, value) => setInput(value)}
        onChange={(e, value) => {
          if (value) onFeatureChange(typeof value === 'string' ? value.trim().toUpperCase() : value.feature_id);
        }}
        renderInput={(params) => <TextField {...params} label="Feature or gene" size="small" />}
        style={{ maxWidth: 520 }}
      />

      {error && <p className="notice" style={{ marginTop: 16 }}>{error}</p>}

      {result && (
        <div className="section">
          <h2 style={{ marginBottom: 4 }}>{result.feature_id}</h2>
          <p className="hint">
            {result.modality}
            {result.gene ? ` · gene ${result.gene}` : ''} · selected for {result.endpoints.length} endpoints. Click a
            row to open that endpoint.
          </p>
          <DataTable
            columns={COLUMNS}
            data={result.endpoints}
            filterKeys={['Name', 'Type', 'Target', 'MOA']}
            filterLabel="Filter endpoints"
            onRowClick={(row) => onEndpointSelect(row.id)}
            initialSort={{ key: 'Exceedance', direction: 'desc' }}
          />
        </div>
      )}
    </div>
  );
};

export default FeatureLookup;
