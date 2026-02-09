
import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { TableData } from '../types';
import { Key, Link, ShieldCheck } from 'lucide-react';

type TableNodeProps = NodeProps<TableData> & {
  onDelete?: (id: string) => void;
  onSelectColumn?: (tableId: string, columnId: string) => void;
};

const TableNode = ({ data, selected }: TableNodeProps) => {
  return (
    <div className={`h-full w-full flex flex-col bg-white rounded-lg border-2 ${selected ? 'border-blue-500 shadow-xl' : 'border-slate-300 shadow-sm'} transition-shadow relative overflow-visible`}>
      {/* Node Resizer: Precise alignment with the node border */}
      <NodeResizer 
        color="#3b82f6" 
        isVisible={selected} 
        minWidth={140} 
        minHeight={60}
        handleStyle={{ 
          width: 8, 
          height: 8, 
          borderRadius: '1px', 
          backgroundColor: '#3b82f6',
          border: '1px solid white',
          margin: 0
        }}
        lineStyle={{ border: '1px dashed #3b82f6', opacity: 0.5 }}
      />

      {/* Header */}
      <div className={`px-3 py-1.5 flex items-center justify-between shrink-0 rounded-t-[5px] ${selected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'} border-b border-slate-200`}>
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className={`w-2 h-2 rounded-sm shrink-0 ${selected ? 'bg-white' : 'bg-blue-400'}`}></div>
          <span className="font-bold text-[10px] sm:text-xs truncate uppercase tracking-tight">{data.name}</span>
        </div>
      </div>

      {/* Columns Container */}
      <div className="flex-1 overflow-y-auto py-1 bg-white rounded-b-[5px] scroll-smooth">
        {data.columns.map((col) => (
          <div 
            key={col.id} 
            className="group relative flex items-center justify-between px-4 py-1 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            {/* Target Handle (Input) - Positioned on the inner edge */}
            <Handle
              type="target"
              position={Position.Left}
              id={col.id}
              className="!bg-slate-400 hover:!bg-blue-600 !w-2.5 !h-2.5 !border-white !left-[-1px] !z-20 !transition-all"
            />
            
            <div className="flex items-center gap-1.5 flex-1 overflow-hidden pointer-events-none">
              <div className="flex gap-0.5 shrink-0">
                {col.isPK && <Key className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
                {col.isFK && <Link className="w-2.5 h-2.5 text-blue-500" />}
                {col.isUnique && <ShieldCheck className="w-2.5 h-2.5 text-purple-500" title="Unique Constraint" />}
              </div>
              <span className={`text-[10px] truncate ${col.isPK ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                {col.name}
              </span>
            </div>
            
            <span className="text-[7px] uppercase font-mono text-slate-400 ml-1 shrink-0 pointer-events-none">
              {col.type}
            </span>

            {/* Source Handle (Output) - Positioned on the inner edge */}
            <Handle
              type="source"
              position={Position.Right}
              id={col.id}
              className="!bg-slate-400 hover:!bg-blue-600 !w-2.5 !h-2.5 !border-white !right-[-1px] !z-20 !transition-all"
            />
          </div>
        ))}
        
        {data.columns.length === 0 && (
          <div className="p-3 text-center text-[9px] text-slate-400 italic">
            No Columns
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(TableNode);
