import React, { useState } from 'react';
import TableWithPagination from './TableWithPagination';

const App = () => {
  const [selectedRow, setSelectedRow] = useState(null);

  const handleRowSelect = (row) => {
    setSelectedRow(row);
  }

  const data = [
    { name: 'John Doe', age: 25, email: 'john@example.com' },
    { name: 'Jane Smith', age: 30, email: 'jane@example.com' },
    // Add more data rows as needed
  ];

  return (
    <div>
      <TableWithPagination data={data} onRowSelect={handleRowSelect} />
      {selectedRow && (
        <div>
          <h2>Selected Row</h2>
          <p>Name: {selectedRow.name}</p>
          <p>Age: {selectedRow.age}</p>
          <p>Email: {selectedRow.email}</p>
        </div>
      )
      }
    </div>
  );
};

export default App;
