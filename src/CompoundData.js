import React, { useState, useEffect } from 'react';

const CompoundData = ({ row }) => {
    const [trainResultsURL, setTrainResultsURL] = useState(null);
    const [shapURL, setShapURL] = useState(null);
  
    useEffect(() => {
      if (row && row['Drug Name']) {
        // Fetch train_results image URL
        fetch(`http://127.0.0.1:5000/${row['Drug Name']}/train_results`)
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
        fetch(`http://127.0.0.1:5000/${row['Drug Name']}/shap`)
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
      <div>
        {row && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ margin: '10px' }}>
            <h2>{row['Drug Name']}</h2>
              {trainResultsURL ? (
                <img src={trainResultsURL} alt="Train Results" />
              ) : (
                <p>No train_results image available.</p>
              )}
            </div>
            <div style={{ margin: '10px' }}>
              {shapURL ? (
                <img src={shapURL} alt="SHAP" />
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
