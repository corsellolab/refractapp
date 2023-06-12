import React, { useState, useEffect } from 'react';
import TableWithPagination from './TableWithPagination';
import CompoundData from './CompoundData';

const App = () => {
  const [selectedRow, setSelectedRow] = useState(null);
  const [data, setData] = useState([]);

  // Fetch data from API
  useEffect(() => {
    fetch('http://127.0.0.1:5000/compounds')
      .then((response) => response.json())
      .then((data) => setData(data));
  }, []);

  const handleRowSelect = (row) => {
    setSelectedRow(row);
  };

  return (
    <div>
      {data.length > 0 ? (
        <TableWithPagination data={data} onRowSelect={handleRowSelect} />
      ) : (
        <p>Loading data...</p>
      )}
      <CompoundData row={selectedRow} />
    </div>
  );
};

export default App;
