import React, { useState, useEffect } from 'react';
import TableWithPagination from './TableWithPagination';
import CompoundData from './CompoundData';
import refractLogo from './assets/refract_logo.png';
import { TextField, styled } from '@mui/material';

const FilterContainer = styled('div')({
    marginBottom: '20px',
    width: '100%'
});

const FilterTextField = styled(TextField)({
    width: '100%',
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: '#ccc',
        },
        '&:hover fieldset': {
            borderColor: '#999',
        },
        '&.Mui-focused fieldset': {
            borderColor: '#666',
        },
    },
});

const PageContainer = styled('div')({
    maxWidth: '75%',
    margin: '0 auto',
    padding: '20px',
});

const ImageWithText = ({ refractLogo, children }) => {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                marginBottom: '20px',
                flexWrap: 'wrap',
            }}
        >
            <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                flexWrap: 'wrap',
            }}>
                <img
                    src={refractLogo}
                    alt="Refract Logo"
                    style={{ 
                        marginRight: '10px', 
                        width: "40px",
                        height: "40px"
                    }}
                />
                <h1 style={{ 
                    fontSize: 'clamp(1.5rem, 4vw, 2rem)'
                }}>
                    Refract Results Viewer
                </h1>
            </div>
            {children}
        </div>
    );
};

const Dashboard = () => {
    const [selectedRow, setSelectedRow] = useState(null);
    const [data, setData] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState('Drug');
    const [refreshKey, setRefreshKey] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetch('/api/compounds')
            .then((response) => response.json())
            .then((data) => setData(data));
    }, [refreshKey]);

    useEffect(() => {
        fetch('/api/setDataset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ algorithm: selectedDataset }),
        }).then(() => {
            setRefreshKey(prevKey => prevKey + 1);
            setSearchTerm('');
            setSelectedRow(null);
        });
    }, [selectedDataset]);

    const handleRowSelect = (row) => {
        setSelectedRow(row);
    };

    const handleFilterTextChange = (value) => {
        setSearchTerm(value);
    };

    const filteredData = data.filter(item => 
        item['Drug Name'].toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <PageContainer key={refreshKey}>
            <ImageWithText refractLogo={refractLogo}>
                <select
                    value={selectedDataset}
                    onChange={(e) => setSelectedDataset(e.target.value)}
                    style={{ 
                        height: '35px',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '16px'
                    }}
                >
                    <option value="Drug">Drug Response</option>
                    <option value="Gene">Gene Dependency</option>
                </select>
            </ImageWithText>

            <div>
                <FilterContainer>
                    <FilterTextField
                        label={`Filter by ${selectedDataset === 'Drug' ? 'drug' : 'gene'} name`}
                        value={searchTerm}
                        onChange={(e) => handleFilterTextChange(e.target.value)}
                        variant="outlined"
                        size="small"
                    />
                </FilterContainer>
                
                {data.length > 0 ? (
                    <TableWithPagination 
                        data={filteredData} 
                        onRowSelect={handleRowSelect}
                        dataType={selectedDataset}
                    />
                ) : (
                    <p>Loading data...</p>
                )}
                <CompoundData row={selectedRow} dataType={selectedDataset} />
            </div>
        </PageContainer>
    );
};

export default Dashboard;
