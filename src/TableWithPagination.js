import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  TableSortLabel,
} from '@mui/material';

const TableWithPagination = ({ data, onRowSelect, dataType }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('Difference');
  const [order, setOrder] = useState('desc');
  const [selectedRowName, setSelectedRowName] = useState(null);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleRowClick = (row) => {
    setSelectedRowName(row['Drug Name']);
    onRowSelect(row);
  };

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      if (order === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return bValue < aValue ? -1 : 1;
      }
    });
  }, [data, order, orderBy]);

  return (
    <Paper style={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer style={{ maxHeight: 440 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'Drug Name'}
                  direction={orderBy === 'Drug Name' ? order : 'asc'}
                  onClick={() => handleSort('Drug Name')}
                >
                  <strong>{dataType === 'Drug' ? 'Drug Name' : 'Gene Name'}</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'Refract Pearson R'}
                  direction={orderBy === 'Refract Pearson R' ? order : 'asc'}
                  onClick={() => handleSort('Refract Pearson R')}
                >
                  <strong>Refract Score</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'Baseline Pearson R'}
                  direction={orderBy === 'Baseline Pearson R' ? order : 'asc'}
                  onClick={() => handleSort('Baseline Pearson R')}
                >
                  <strong>Baseline Score</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'Difference'}
                  direction={orderBy === 'Difference' ? order : 'asc'}
                  onClick={() => handleSort('Difference')}
                >
                  <strong>Improvement</strong>
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => (
                <TableRow
                  hover
                  key={index}
                  onClick={() => handleRowClick(row)}
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: row['Drug Name'] === selectedRowName ? '#e3f2fd' : 'inherit'
                  }}
                  selected={row['Drug Name'] === selectedRowName}
                >
                  <TableCell>{row['Drug Name']}</TableCell>
                  <TableCell align="right">{row['Refract Pearson R'].toFixed(3)}</TableCell>
                  <TableCell align="right">{row['Baseline Pearson R'].toFixed(3)}</TableCell>
                  <TableCell align="right">{row['Difference'].toFixed(3)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default TableWithPagination;
