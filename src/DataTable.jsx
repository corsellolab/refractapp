import React, { useMemo, useState, useEffect } from 'react';
import {
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  TablePagination,
} from '@mui/material';

// Generic sortable / filterable / paginated table.
//   columns: [{ key, label, numeric?, format?(value, row), width? }]
//   filterKeys: row keys the text box searches
//   toolbar: extra filter controls shown next to the search box
//   onRowClick / selectedId: optional row selection (rows need an `id`, or pass rowKey)
function DataTable({
  columns,
  data,
  filterKeys = [],
  filterLabel = 'Filter',
  toolbar = null,
  onRowClick,
  selectedId,
  rowKey = (row) => row.id,
  initialSort = { key: null, direction: 'asc' },
  rowsPerPageOptions = [10, 25, 50],
  dense = true,
  emptyMessage = 'No rows match.',
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);
  const [filterText, setFilterText] = useState('');
  const [sort, setSort] = useState(initialSort);

  // New data (e.g. a different endpoint or filter) starts on the first page
  useEffect(() => setPage(0), [data]);

  const handleSort = (key) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const rows = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    const filtered = query
      ? data.filter((row) =>
          filterKeys.some((key) => String(row[key] == null ? '' : row[key]).toLowerCase().includes(query))
        )
      : data;
    if (!sort.key) return filtered;

    const column = columns.find((c) => c.key === sort.key);
    const value = (row) => (column && column.sortValue ? column.sortValue(row) : row[sort.key]);
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      // Missing values always sort last
      const aMissing = av === null || av === undefined || av === '';
      const bMissing = bv === null || bv === undefined || bv === '';
      if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  }, [data, filterText, filterKeys, sort, columns]);

  const pageRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 10 }}>
        {filterKeys.length > 0 && (
          <TextField
            label={filterLabel}
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value);
              setPage(0);
            }}
            variant="outlined"
            size="small"
            style={{ flex: '1 1 260px' }}
          />
        )}
        {toolbar}
      </div>
      <TableContainer component={Paper} variant="outlined">
        <Table size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.numeric ? 'right' : 'left'}
                  style={{ fontWeight: 600, width: column.width, whiteSpace: 'nowrap' }}
                  sortDirection={sort.key === column.key ? sort.direction : false}
                >
                  <TableSortLabel
                    active={sort.key === column.key}
                    direction={sort.key === column.key ? sort.direction : 'asc'}
                    onClick={() => handleSort(column.key)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((row) => {
              const key = rowKey(row);
              return (
                <TableRow
                  key={key}
                  hover={Boolean(onRowClick)}
                  selected={selectedId !== undefined && selectedId === key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} align={column.numeric ? 'right' : 'left'}>
                      {column.format ? column.format(row[column.key], row) : row[column.key] == null ? '—' : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} style={{ color: 'var(--text-secondary)' }}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={Math.min(page, Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1))}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </div>
  );
}

export default DataTable;
