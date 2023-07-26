import React, { useState, useEffect } from 'react';

const CompoundData = ({ row }) => {
  const [trainResultsURL, setTrainResultsURL] = useState(null);
  const [shapURL, setShapURL] = useState(null);

  useEffect(() => {
    if (row && row['Drug Name']) {
      // Fetch train_results image URL
      fetch(`/api/${row['Drug Name']}/train_results`)
        .then((response) => response.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setTrainResultsURL(url);
        })
        .catch((error) => {
          console.error('Error fetching train_results image:', error);
          setTrainResultsURL(null);
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
          setShapURL(null);
        });
    }
  }, [row]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '75%',
        margin: '0 auto',
      }}
    >
      {row && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <div style={{ margin: '10px', width: '50%' }}>
            <h2>{row['Drug Name']}</h2>
            {trainResultsURL ? (
              <img
                src={trainResultsURL}
                alt="Train Results"
                style={{
                  width: '85%',
                  height: 'auto',
                  maxWidth: '100%',
                  display: 'block',
                }}
              />
            ) : (
              <p>No train_results image available.</p>
            )}
          </div>
          <div style={{ margin: '10px', width: '50%' }}>
            {shapURL ? (
              <img
                src={shapURL}
                alt="SHAP"
                style={{
                  width: '85%',
                  height: 'auto',
                  maxWidth: '100%',
                  display: 'block',
                }}
              />
            ) : (
              <p>No SHAP image available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompoundData;
