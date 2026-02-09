
export type ColumnType = 'VARCHAR' | 'INTEGER' | 'BOOLEAN' | 'DATE' | 'TIMESTAMP' | 'UUID' | 'TEXT' | 'JSON';

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  isPK: boolean;
  isFK: boolean;
  isUnique: boolean;
  isNullable: boolean;
}

export interface TableData {
  id: string;
  name: string;
  columns: Column[];
}

export type RelationType = '1:1' | '1:N' | 'N:M';
