import React, { useState, useEffect } from 'react';
import { DataSet, Network } from 'vis-network/standalone/esm/vis-network';

const NetworkGraph = ({ row }) => {
  const [score, setScore] = useState('score');
  const [graphData, setGraphData] = useState([]);

  const scores = [
    { code: 'score', name: 'Overall'},
    { code: 'nscore', name: 'Neighborhood' },
    { code: 'fscore', name: 'Fusion' },
    { code: 'pscore', name: 'Co-occurrence' },
    { code: 'ascore', name: 'Coexpression' },
    { code: 'escore', name: 'Experimental' },
    { code: 'dscore', name: 'Database' },
    { code: 'tscore', name: 'Textmining' },
  ];
  
  const getColor = (value) => {
    // return color based on value
    return `rgba(0, 0, 0, ${value})`;
  };

  // Fetch data from API
  useEffect(() => {
    if (row && row['Drug Name']) {
      fetch(`http://127.0.0.1:5000/${row['Drug Name']}/network`)
        .then((response) => response.json())
        .then((data) => setGraphData(data));
    } else {
      setGraphData([]);
    }
  }, [row]);

  useEffect(() => {
    if (graphData.length > 0) {
      const nodes = new DataSet();
      const edges = new DataSet();

      let nodeIdSet = new Set(); // keep track of nodes already added
      let edgeIdSet = new Set(); // keep track of edges already added

      graphData.forEach((item) => {
        if(!nodeIdSet.has(item.preferredName_A)) {
          nodes.add({ id: item.preferredName_A, label: item.preferredName_A });
          nodeIdSet.add(item.preferredName_A);
        }

        if(!nodeIdSet.has(item.preferredName_B)) {
          nodes.add({ id: item.preferredName_B, label: item.preferredName_B });
          nodeIdSet.add(item.preferredName_B);
        }

        let edgeId = item.preferredName_A < item.preferredName_B ? 
                      `${item.preferredName_A}-${item.preferredName_B}` : 
                      `${item.preferredName_B}-${item.preferredName_A}`;

        if(!edgeIdSet.has(edgeId)) {
          edges.add({
            from: item.preferredName_A,
            to: item.preferredName_B,
            label: String(item[score]),
            value: item[score],
            color: getColor(item[score])
          });
          edgeIdSet.add(edgeId);
        }
      });

      const container = document.getElementById('network');
      const data = {
        nodes: nodes,
        edges: edges,
      };
      const options = {
        manipulation: {
          enabled: false,
        },
        interaction: {
          zoomView: false,
        },
      };

      new Network(container, data, options);
    } else {
      // Clear the network by removing all nodes and edges
      const container = document.getElementById('network');
      container.innerHTML = '';
    }
  }, [score, graphData]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: "50px" }}>
      <div style={{ width: '75%' }}>
        {row && (
          <div style={{ display: 'flex', justifyContent: 'flex-start'}}>
          {scores.map((scoreItem) => (
            <div 
              key={scoreItem.code} 
              onClick={() => setScore(scoreItem.code)}
              style={{ 
                cursor: 'pointer', 
                backgroundColor: score === scoreItem.code ? 'lightblue' : 'white',
                borderRadius: '5px 5px 0 0', 
                margin: '0 5px', 
                padding: '10px', 
                fontWeight: "bold", 
              }}
            >
              {scoreItem.name}
            </div>
            ))}
          </div>
        )}
        <div id="network" style={{ 
          width: '100%', 
          height: '600px', 
          border: row ? '1px solid black' : 'none' 
        }}></div>
      </div>
    </div>
  );
};

export default NetworkGraph;
