import React, { useState, useEffect } from 'react';
import { Tabs, Tab, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import EndpointBrowser from './EndpointBrowser';
import FeatureLookup from './FeatureLookup';
import refractLogo from './assets/refract_logo.png';
import { getJSON, MODEL_LABELS, modelLabel } from './lib';

const TABS = ['Endpoints', 'Feature lookup'];

const scrollToDetail = () =>
  setTimeout(() => {
    const el = document.getElementById('endpoint-detail');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);

const Dashboard = () => {
  const [tab, setTab] = useState(0);
  const [endpoints, setEndpoints] = useState(null);
  const [models, setModels] = useState(Object.keys(MODEL_LABELS));
  const [model, setModel] = useState('xgboost');
  const [selectedId, setSelectedId] = useState(null);
  const [featureId, setFeatureId] = useState(null);

  useEffect(() => {
    getJSON('/api/models')
      .then((result) => {
        setModels(result.models);
        setModel(result.default);
      })
      .catch((error) => console.error('Error fetching models:', error));

    getJSON('/api/endpoints')
      .then(setEndpoints)
      .catch((error) => {
        console.error('Error fetching endpoints:', error);
        setEndpoints([]);
      });
  }, []);

  const openEndpoint = (id) => {
    setSelectedId(id);
    setTab(0);
    scrollToDetail();
  };

  const openFeature = (id) => {
    setFeatureId(id);
    setTab(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page">
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '16px 0 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={refractLogo} alt="Refract logo" style={{ width: 44, height: 'auto' }} />
          <h1 style={{ margin: 0, fontSize: 26 }}>Refract Results Viewer</h1>
        </div>
        <FormControl size="small" style={{ minWidth: 240 }}>
          <InputLabel id="model-label">Model</InputLabel>
          <Select labelId="model-label" label="Model" value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <MenuItem key={m} value={m}>
                {modelLabel(m)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </header>

      <Tabs value={tab} onChange={(e, value) => setTab(value)} variant="scrollable" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <Tab key={t} label={t} />
        ))}
      </Tabs>

      {tab === 0 &&
        (endpoints === null ? (
          <p className="hint">Loading endpoints…</p>
        ) : (
          <EndpointBrowser
            endpoints={endpoints}
            model={model}
            onModelChange={setModel}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              scrollToDetail();
            }}
            onFeatureSelect={openFeature}
          />
        ))}
      {tab === 1 && <FeatureLookup featureId={featureId} onFeatureChange={setFeatureId} onEndpointSelect={openEndpoint} />}
    </div>
  );
};

export default Dashboard;
