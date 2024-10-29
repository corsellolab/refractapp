import React, { useState, useEffect } from 'react';

const CompoundData = ({ row, dataType }) => {
  const [trainResultsURL, setTrainResultsURL] = useState(null);
  const [shapURL, setShapURL] = useState(null);

  useEffect(() => {
    if (row && row['Drug Name']) {
      // Reset URLs when row changes
      setTrainResultsURL(null);
      setShapURL(null);

      // Fetch train_results image URL
      fetch(`/api/${row['Drug Name']}/train_results`)
        .then((response) => response.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setTrainResultsURL(url);
        })
        .catch((error) => {
          console.error('Error fetching train_results image:', error);
        });

      // Fetch shap image URL
      fetch(`/api/${row['Drug Name']}/shap`)
        .then((response) => response.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setShapURL(url);
        })
        .catch((error) => {
          console.error('Error fetching shap image:', error);
        });
    }
  }, [row]);

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      if (trainResultsURL) URL.revokeObjectURL(trainResultsURL);
      if (shapURL) URL.revokeObjectURL(shapURL);
    };
  }, [trainResultsURL, shapURL]);

  if (!row) return null;

  return (
    <div style={{
      marginTop: '20px',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <h2>{dataType === 'Drug' ? 'Drug Response' : 'Gene Dependency'}: {row['Drug Name']}</h2>
          <div style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
          }}>
            <div>
              <strong>Refract Score:</strong> {row['Refract Pearson R'].toFixed(3)}
            </div>
            <div>
              <strong>Baseline Score:</strong> {row['Baseline Pearson R'].toFixed(3)}
            </div>
            <div>
              <strong>Improvement:</strong> {row['Difference'].toFixed(3)}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          justifyContent: 'center'
        }}>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <h3>Prediction Results</h3>
            {trainResultsURL ? (
              <img
                src={trainResultsURL}
                alt="Prediction Results"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '4px',
                }}
              />
            ) : (
              <p>Loading prediction results...</p>
            )}
          </div>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <h3>Feature Importance</h3>
            {shapURL ? (
              <img
                src={shapURL}
                alt="SHAP Values"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '4px',
                }}
              />
            ) : (
              <p>Loading feature importance...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompoundData;
