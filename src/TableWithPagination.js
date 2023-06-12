import React, { useState } from 'react';
import { TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination } from '@mui/material';
import { styled } from '@mui/system';

const TableContainerStyled = styled(TableContainer)`
  width: 75%;
  margin: 0 auto;
  margin-top: 20px;
`;

const TableHeaderCellStyled = styled(TableCell)`
  font-weight: bold;
  cursor: pointer;
`;

const FilterContainer = styled('div')`
  display: flex;
  margin: 0 auto;
  width: 75%;
  margin-bottom: 10px;
`;

const FilterTextField = styled(TextField)`
  flex: 1;
`;

const SelectedRow = styled(TableRow)`
  background-color: #e0e0e0;
`;

function TableWithPagination({ data, onRowSelect }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filterText, setFilterText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: '' });
  const [selectedRow, setSelectedRow] = useState(null);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterTextChange = (value) => {
    setFilterText(value);
  };

  const handleRowClick = (row) => {
    setSelectedRow(row);
    onRowSelect(row);
  };

  const filteredData = data.filter((row) =>
    row['Drug Name'].toString().toLowerCase().includes(filterText.toString().toLowerCase())
  );

  const sortedData = [...filteredData];
  if (sortConfig.key) {
    sortedData.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  const offset = page * rowsPerPage;
  const slicedData = sortedData.slice(offset, offset + rowsPerPage);

  const columnOrder = ['Drug Name', 'Pearson R', 'Connectivity']; // Define the desired column order

  return (
    <div>
      <FilterContainer>
        <FilterTextField
          label="Filter by drug name"
          value={filterText}
          onChange={(e) => handleFilterTextChange(e.target.value)}
          variant="outlined"
          size="small"
        />
      </FilterContainer>
      <TableContainerStyled component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {columnOrder.map((key) => (
                <TableHeaderCellStyled key={key} onClick={() => handleSort(key)}>
                  {key}
                  {sortConfig.key === key && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                </TableHeaderCellStyled>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {slicedData.map((row, index) => (
              <SelectedRow
                key={index}
                onClick={() => handleRowClick(row)}
                selected={selectedRow === row}
              >
                {columnOrder.map((columnKey, index) => (
                  <TableCell key={index}>{row[columnKey]}</TableCell>
                ))}
              </SelectedRow>
            ))}
          </TableBody>
        </Table>
      </TableContainerStyled>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </div>
  );
}

export default TableWithPagination;
