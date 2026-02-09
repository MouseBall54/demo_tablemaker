
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

export interface RelationData {
  sourceTableId: string;
  targetTableId: string;
  sourceColumnId: string;
  targetColumnId: string;
  type: RelationType;
}

export interface AISuggestion {
  tables: TableData[];
  relations: RelationData[];
}
