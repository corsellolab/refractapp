import React, { useState, useEffect } from 'react';
import TableWithPagination from './TableWithPagination';
import CompoundData from './CompoundData';
import NetworkGraph from './NetworkGraph';
import refractLogo from './assets/refract_logo.png';

const ImageWithText = ({refractLogo}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '75%',
        margin: '0 auto',
      }}
    >
      <img
        src={refractLogo}
        alt="Refract Logo"
        style={{ marginRight: '10px', width: "5%" }}
      />
      <span style={{ textAlign: 'left' }}><h1>Refract Results Viewer</h1></span>
    </div>
  );
};

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
      <ImageWithText refractLogo={refractLogo} />

      {data.length > 0 ? (
        <TableWithPagination data={data} onRowSelect={handleRowSelect} />
      ) : (
        <p>Loading data...</p>
      )}
      <CompoundData row={selectedRow} />
      <NetworkGraph row={selectedRow} />
    </div>
     
  );
};

export default App;
