import React, { useState, useEffect } from 'react';
import TableWithPagination from './TableWithPagination';
import CompoundData from './CompoundData';
import NetworkGraph from './NetworkGraph';
import refractLogo from './assets/refract_logo.png';

const ImageWithText = ({ refractLogo, children }) => {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '75%',
                margin: '0 auto',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                    src={refractLogo}
                    alt="Refract Logo"
                    style={{ marginRight: '10px', width: "5%" }}
                />
                <span style={{ textAlign: 'left' }}><h1>Refract Results Viewer</h1></span>
            </div>
            {children}
        </div>
    );
};

const Dashboard = () => {
    const [selectedRow, setSelectedRow] = useState(null);
    const [data, setData] = useState([]);
    const [selectedAlgorithm, setSelectedAlgorithm] = useState('XGBoost'); // Default selection
    const [refreshKey, setRefreshKey] = useState(0); // Add a state for refresh key

    useEffect(() => {
        fetch('/api/compounds')
            .then((response) => response.json())
            .then((data) => setData(data));
    }, [refreshKey]); // Depend on refreshKey to refetch data

    useEffect(() => {
        // Call API whenever selectedAlgorithm changes
        fetch('/api/setDataset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ algorithm: selectedAlgorithm }),
        }).then(() => {
            setRefreshKey(prevKey => prevKey + 1); // Increment refreshKey to force reload
        });
    }, [selectedAlgorithm]);

    const handleRowSelect = (row) => {
        setSelectedRow(row);
    };

    return (
        <div key={refreshKey}> {/* Use refreshKey as key to force remount */}
            <ImageWithText refractLogo={refractLogo}>
                <select
                    value={selectedAlgorithm}
                    onChange={(e) => setSelectedAlgorithm(e.target.value)}
                    style={{ height: '30px', marginRight: '20px' }}
                >
                    <option value="XGBoost">XGBoost</option>
                    <option value="Random Forest">Random Forest</option>
                </select>
            </ImageWithText>

            {data.length > 0 ? (
                <TableWithPagination data={data} onRowSelect={handleRowSelect}/>
            ) : (
                <p>Loading data...</p>
            )}
            <CompoundData row={selectedRow}/>
            <NetworkGraph row={selectedRow}/>
        </div>
    );
};

export default Dashboard;
