import React from 'react';
import { List, RowComponentProps } from 'react-window';

export interface Column<T> {
  key: string;
  label: string;
  width: number;
  render?: (item: T) => React.ReactNode;
}

export interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight: number;
  height: number;
  width: number | string;
  renderRow: (item: T) => React.ReactNode; // Custom render function for each row item
}

interface TableRowProps<T> {
  items: T[];
  renderRow: (item: T) => React.ReactNode;
}

const VirtualTableV2 = <T extends object>({
  data,
  columns,
  rowHeight,
  height,
  width,
  renderRow,
}: VirtualTableProps<T>) => {
  const RenderRow = ({ index, style, items, renderRow: renderItem }: RowComponentProps<TableRowProps<T>>) => {
    const item = items[index];
    if (!item) return null;
    return (
      <div style={style}>
        {renderItem(item)}
      </div>
    );
  };

  return (
    <div style={{ border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden' }}>
      {/* Table Header */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #eee',
          backgroundColor: '#f9f9f9',
          fontWeight: 'bold',
        }}
      >
        {columns.map((column) => (
          <div key={column.key} style={{ width: column.width, padding: '8px 12px' }}>
            {column.label}
          </div>
        ))}
      </div>

      {/* Virtualized List */}
      <List
        rowCount={data.length}
        rowHeight={rowHeight}
        rowComponent={RenderRow}
        rowProps={{ items: data, renderRow }}
        style={{ height, width }}
      />
    </div>
  );
};

export default VirtualTableV2;
