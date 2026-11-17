import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DataTable from './DataTable';
import { getJSON } from './lib';

const FAILED_COLUMNS = [
  { key: 'variable_id', label: 'Endpoint' },
  { key: 'modality', label: 'Screen' },
  { key: 'status', label: 'Status' },
  { key: 'exit', label: 'Exit code', numeric: true },
];

const Methods = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    getJSON('/api/methods').then(setData).catch(() => setData(false));
  }, []);

  if (data === null) return <p className="hint">Loading methods…</p>;
  if (data === false) return <p className="notice">Couldn’t load the methods.</p>;

  return (
    <div>
      {data.known_gaps && (
        <div className="section notice markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.known_gaps}</ReactMarkdown>
        </div>
      )}

      {data.failed.length > 0 && (
        <div className="section">
          <h3>Failed endpoints ({data.failed.length})</h3>
          <p className="hint">These endpoints have no results and don’t appear in the endpoint table.</p>
          <DataTable
            columns={FAILED_COLUMNS}
            data={data.failed}
            rowKey={(row) => row.variable_id}
            filterKeys={['variable_id', 'modality']}
            filterLabel="Filter failed endpoints"
          />
        </div>
      )}

      {data.method && (
        <div className="section markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.method}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default Methods;
