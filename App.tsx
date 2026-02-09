
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap, 
  Connection, 
  Edge, 
  Node,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  ConnectionMode,
  MarkerType,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import { Plus, Database, FileCode, Trash2, X, AlertCircle, Key, Link, Share2, ShieldCheck, GripVertical, FileUp, Move } from 'lucide-react';

import TableNode from './components/TableNode';
import { TableData, Column, ColumnType, RelationType } from './types';
import { generateSQL, parseSQL } from './services/geminiService';

const nodeTypes = {
  table: TableNode,
};

const initialNodes: Node<TableData>[] = [
  {
    id: 't1',
    type: 'table',
    position: { x: 100, y: 100 },
    style: { width: 200 },
    data: {
      id: 't1',
      name: 'users',
      columns: [
        { id: 'c1', name: 'id', type: 'UUID', isPK: true, isFK: false, isUnique: false, isNullable: false },
        { id: 'c2', name: 'email', type: 'VARCHAR', isPK: false, isFK: false, isUnique: true, isNullable: false },
        { id: 'c3', name: 'created_at', type: 'TIMESTAMP', isPK: false, isFK: false, isUnique: false, isNullable: true },
      ]
    },
  },
  {
    id: 't2',
    type: 'table',
    position: { x: 450, y: 150 },
    style: { width: 200 },
    data: {
      id: 't2',
      name: 'posts',
      columns: [
        { id: 'p1', name: 'id', type: 'UUID', isPK: true, isFK: false, isUnique: false, isNullable: false },
        { id: 'p2', name: 'user_id', type: 'UUID', isPK: false, isFK: true, isUnique: false, isNullable: false },
        { id: 'p3', name: 'content', type: 'TEXT', isPK: false, isFK: false, isUnique: false, isNullable: true },
      ]
    },
  }
];

const initialEdges: Edge[] = [
  { 
    id: 'e1-2', 
    source: 't1', 
    target: 't2', 
    sourceHandle: 'c1', 
    targetHandle: 'p2',
    label: '1:N',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    style: { stroke: '#3b82f6', strokeWidth: 2 }
  }
];

const TableMakerApp: React.FC = () => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes] = useState<Node<TableData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sqlOutput, setSqlOutput] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSqlInput, setImportSqlInput] = useState('');
  
  // Modal position state for dragging
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });
  const isDraggingModal = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (sqlOutput || isImportModalOpen) {
      setModalOffset({ x: 0, y: 0 });
    }
  }, [sqlOutput, isImportModalOpen]);

  const handleModalMouseDown = (e: React.MouseEvent) => {
    isDraggingModal.current = true;
    dragStartPos.current = { x: e.clientX - modalOffset.x, y: e.clientY - modalOffset.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingModal.current) return;
      setModalOffset({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      });
    };
    const handleMouseUp = () => {
      isDraggingModal.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find(e => e.id === selectedEdgeId) || null, [edges, selectedEdgeId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const updateColumnFKStatus = useCallback((tableId: string, columnId: string, isFK: boolean) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === tableId) {
          const updatedCols = n.data.columns.map(c => c.id === columnId ? { ...c, isFK } : c);
          return { ...n, data: { ...n.data, columns: updatedCols } };
        }
        return n;
      })
    );
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({
        ...params,
        label: '1:N',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }, eds));

      if (params.target && params.targetHandle) {
        updateColumnFKStatus(params.target, params.targetHandle, true);
      }
    },
    [updateColumnFKStatus]
  );

  const onNodesDelete = useCallback(
    (nodesToDelete: Node[]) => {
      if (nodesToDelete.some(n => n.id === selectedNodeId)) {
        setSelectedNodeId(null);
        setIsSidebarOpen(false);
      }
    },
    [selectedNodeId]
  );

  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      if (edgesToDelete.some(e => e.id === selectedEdgeId)) {
        setSelectedEdgeId(null);
        setIsSidebarOpen(false);
      }

      edgesToDelete.forEach(edge => {
        if (edge.target && edge.targetHandle) {
          const remainingEdges = edges.filter(e => 
            !edgesToDelete.some(ete => ete.id === e.id) && 
            e.target === edge.target && 
            e.targetHandle === edge.targetHandle
          );

          if (remainingEdges.length === 0) {
            updateColumnFKStatus(edge.target, edge.targetHandle, false);
          }
        }
      });
    },
    [selectedEdgeId, edges, updateColumnFKStatus]
  );

  const onNodeClick = (_: any, node: Node<TableData>) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setIsSidebarOpen(true);
  };

  const onEdgeClick = (_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setIsSidebarOpen(true);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setIsSidebarOpen(false);
  };

  const addTable = () => {
    const newId = `t-${Date.now()}`;
    const newNode: Node<TableData> = {
      id: newId,
      type: 'table',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      style: { width: 200 },
      data: {
        id: newId,
        name: 'new_table',
        columns: [
          { id: `c-${Date.now()}`, name: 'id', type: 'INTEGER', isPK: true, isFK: false, isUnique: false, isNullable: false }
        ]
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newId);
    setSelectedEdgeId(null);
    setIsSidebarOpen(true);
  };

  const updateTableName = (name: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, name } } : n))
    );
  };

  const updateEdgeType = (type: RelationType) => {
    if (!selectedEdgeId) return;
    setEdges((eds) => 
      eds.map((e) => {
        if (e.id === selectedEdgeId) {
          return {
            ...e,
            label: type,
            markerEnd: type === '1:1' ? undefined : { type: MarkerType.ArrowClosed, color: '#3b82f6' },
            markerStart: type === 'N:M' ? { type: MarkerType.ArrowClosed, color: '#3b82f6' } : undefined,
          };
        }
        return e;
      })
    );
  };

  const deleteEdge = () => {
    if (!selectedEdgeId) return;
    const edgeToDelete = edges.find(e => e.id === selectedEdgeId);
    if (edgeToDelete) {
      onEdgesDelete([edgeToDelete]);
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    }
  };

  const addColumn = () => {
    if (!selectedNodeId) return;
    const newCol: Column = {
      id: `c-${Date.now()}`,
      name: 'new_column',
      type: 'VARCHAR',
      isPK: false,
      isFK: false,
      isUnique: false,
      isNullable: true,
    };
    setNodes((nds) =>
      nds.map((n) => 
        n.id === selectedNodeId ? { ...n, data: { ...n.data, columns: [...n.data.columns, newCol] } } : n
      )
    );
  };

  const updateColumn = (colId: string, updates: Partial<Column>) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNodeId) {
          const updatedCols = n.data.columns.map(c => c.id === colId ? { ...c, ...updates } : c);
          return { ...n, data: { ...n.data, columns: updatedCols } };
        }
        return n;
      })
    );
  };

  const removeColumn = (colId: string) => {
    if (!selectedNodeId) return;
    const edgesWithThisColumn = edges.filter(e => e.sourceHandle === colId || e.targetHandle === colId);
    if (edgesWithThisColumn.length > 0) {
      onEdgesDelete(edgesWithThisColumn);
    }
    
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNodeId) {
          const updatedCols = n.data.columns.filter(c => c.id !== colId);
          return { ...n, data: { ...n.data, columns: updatedCols } };
        }
        return n;
      })
    );
    setEdges(eds => eds.filter(e => e.sourceHandle !== colId && e.targetHandle !== colId));
  };

  const deleteTable = () => {
    if (!selectedNodeId) return;
    const edgesWithThisTable = edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId);
    if (edgesWithThisTable.length > 0) {
      onEdgesDelete(edgesWithThisTable);
    }

    setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    setIsSidebarOpen(false);
  };

  const handleGenerateSQL = () => {
    try {
      const sql = generateSQL(
        nodes.map(n => n.data), 
        edges.map(e => ({
          source: e.source,
          target: e.target,
          label: e.label,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle
        }))
      );
      setSqlOutput(sql);
    } catch (e) {
      console.error(e);
      alert("SQL generation failed.");
    }
  };

  const handleImportSQL = () => {
    if (!importSqlInput.trim()) return;
    try {
      const { tables, relations } = parseSQL(importSqlInput);
      
      if (tables.length === 0) {
        alert("No valid CREATE TABLE statements found. Please check your SQL.");
        return;
      }

      // Map to ReactFlow Nodes with grid positioning (Optimized for many tables)
      const colCount = Math.ceil(Math.sqrt(tables.length));
      const newNodes: Node<TableData>[] = tables.map((t, index) => ({
        id: t.id,
        type: 'table',
        position: { 
          x: 100 + (index % colCount) * 350, 
          y: 100 + Math.floor(index / colCount) * 450 
        },
        data: t,
        style: { width: 220 }
      }));

      // Map to ReactFlow Edges
      const newEdges: Edge[] = relations.map((r, index) => ({
        id: `e-imported-${index}`,
        source: r.source,
        target: r.target,
        sourceHandle: r.sourceHandle,
        targetHandle: r.targetHandle,
        label: r.label || '1:N',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }));

      setNodes(newNodes);
      setEdges(newEdges);
      setIsImportModalOpen(false);
      setImportSqlInput('');
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setIsSidebarOpen(false);
      
      // Auto-fit after a tiny delay to allow ReactFlow to render the large set of nodes
      setTimeout(() => fitView({ padding: 0.1 }), 100);
    } catch (e) {
      console.error(e);
      alert("Parsing failed. Ensure your SQL follows PostgreSQL CREATE TABLE / ALTER TABLE format.");
    }
  };

  const onColDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onColDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onColDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedColIndex === null || draggedColIndex === targetIndex || !selectedNodeId) return;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNodeId) {
          const newCols = [...n.data.columns];
          const [movedCol] = newCols.splice(draggedColIndex, 1);
          newCols.splice(targetIndex, 0, movedCol);
          return { ...n, data: { ...n.data, columns: newCols } };
        }
        return n;
      })
    );
    setDraggedColIndex(null);
  };

  const columnTypes: ColumnType[] = ['VARCHAR', 'INTEGER', 'BOOLEAN', 'DATE', 'TIMESTAMP', 'UUID', 'TEXT', 'JSON'];

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50">
      <header className="h-14 bg-slate-900 flex items-center justify-between px-6 shadow-md z-10">
        <div className="flex items-center gap-3">
          <Database className="text-blue-400 w-6 h-6" />
          <h1 className="text-white font-bold text-lg tracking-tight">TableMaker</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={addTable} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Table
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)} 
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            <FileUp className="w-4 h-4" /> Import SQL
          </button>
          <button 
            onClick={handleGenerateSQL} 
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-colors"
          >
            <FileCode className="w-4 h-4" /> Export SQL
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        <div className="flex-1 h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            connectionMode={ConnectionMode.Loose}
            deleteKeyCode={['Delete', 'Backspace']}
            fitView
          >
            <Background color="#cbd5e1" variant={'dots' as any} gap={20} />
            <Controls />
            <MiniMap style={{ height: 120 }} zoomable pannable />
          </ReactFlow>
        </div>

        {isSidebarOpen && (
          <div className="w-80 lg:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col z-20 transition-all overflow-hidden">
            {selectedNode ? (
              <>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    Table Properties
                  </h2>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-4 space-y-4 border-b border-slate-100 bg-white shadow-sm z-10 shrink-0">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Table Name</label>
                    <input 
                      type="text" 
                      value={selectedNode.data.name} 
                      onChange={(e) => updateTableName(e.target.value)} 
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Columns</label>
                    <button 
                      onClick={addColumn} 
                      className="text-xs text-blue-600 hover:text-blue-500 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Column
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                  {selectedNode.data.columns.map((col, index) => (
                    <div 
                      key={col.id} 
                      draggable
                      onDragStart={(e) => onColDragStart(e, index)}
                      onDragOver={onColDragOver}
                      onDrop={(e) => onColDrop(e, index)}
                      className={`p-3 bg-white rounded-lg border border-slate-200 relative group shadow-sm hover:border-blue-300 transition-all flex flex-col cursor-default ${draggedColIndex === index ? 'opacity-50 border-dashed border-blue-400 scale-[0.98]' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400 transition-colors">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <input 
                          type="text" 
                          value={col.name} 
                          onChange={(e) => updateColumn(col.id, { name: e.target.value })} 
                          className="flex-1 bg-white border border-transparent border-b-slate-100 hover:border-b-blue-200 px-1 py-0.5 text-xs outline-none focus:border-b-blue-500 transition-colors" 
                        />
                        <button 
                          onClick={() => removeColumn(col.id)} 
                          className="w-5 h-5 bg-red-50 text-red-500 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all z-10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pl-6">
                        <select 
                          value={col.type} 
                          onChange={(e) => updateColumn(col.id, { type: e.target.value as ColumnType })} 
                          className="text-[10px] border border-slate-100 rounded px-1 py-1 bg-slate-50 outline-none focus:border-blue-500 transition-colors"
                        >
                          {columnTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="flex gap-1 items-center justify-end">
                          <button onClick={() => updateColumn(col.id, { isPK: !col.isPK })} title="Primary Key" className={`p-1 rounded transition-colors ${col.isPK ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}><Key className="w-3 h-3" /></button>
                          <button onClick={() => updateColumn(col.id, { isFK: !col.isFK })} title="Foreign Key" className={`p-1 rounded transition-colors ${col.isFK ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}><Link className="w-3 h-3" /></button>
                          <button onClick={() => updateColumn(col.id, { isUnique: !col.isUnique })} title="Unique" className={`p-1 rounded transition-colors ${col.isUnique ? 'bg-purple-100 text-purple-600' : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}><ShieldCheck className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedNode.data.columns.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-sm italic">
                      No columns added yet.
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                  <button 
                    onClick={deleteTable} 
                    className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-semibold flex items-center justify-center gap-2 border border-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Table
                  </button>
                </div>
              </>
            ) : selectedEdge ? (
              <>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-indigo-500" />
                    Relation Properties
                  </h2>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cardinality Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['1:1', '1:N', 'N:M'] as RelationType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => updateEdgeType(type)}
                          className={`py-2 px-3 rounded-md text-sm font-bold border transition-all ${
                            selectedEdge.label === type 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <AlertCircle className="w-3 h-3 inline mr-1 mb-0.5" />
                      선택된 선을 클릭한 상태에서 <strong>Delete</strong> 또는 <strong>Backspace</strong> 키를 누르면 관계를 끊을 수 있습니다. 끊어지는 타겟 컬럼의 FK 속성은 자동으로 비활성화됩니다.
                    </p>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                  <button onClick={deleteEdge} className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-semibold flex items-center justify-center gap-2 border border-red-200 transition-colors"><Trash2 className="w-4 h-4" /> Delete Relation</button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Export SQL Modal */}
      {sqlOutput && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            style={{ transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)` }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden transition-shadow"
          >
            <div 
              onMouseDown={handleModalMouseDown}
              className="p-4 border-b flex items-center justify-between bg-slate-900 text-white cursor-move select-none"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold">Exported PostgreSQL SQL</h3>
              </div>
              <button 
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={() => setSqlOutput(null)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-900 p-6">
              <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap leading-relaxed">{sqlOutput}</pre>
            </div>
            <div className="p-4 bg-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => { navigator.clipboard.writeText(sqlOutput); alert("Copied!"); }} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm">Copy SQL</button>
              <button onClick={() => setSqlOutput(null)} className="px-6 py-2 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg font-semibold text-sm transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Import SQL Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            style={{ transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)` }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden transition-shadow"
          >
            <div 
              onMouseDown={handleModalMouseDown}
              className="p-4 border-b flex items-center justify-between bg-slate-800 text-white cursor-move select-none"
            >
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold">Import PostgreSQL SQL</h3>
              </div>
              <button 
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={() => setIsImportModalOpen(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 bg-amber-50 border-b border-amber-100 shrink-0">
              <p className="text-xs text-amber-700 leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>PostgreSQL CREATE TABLE</strong> 및 <strong>ALTER TABLE</strong> 구문을 지원합니다. 
                  기존의 모든 테이블과 관계가 초기화되고 입력된 SQL 기반으로 새로 구성됩니다.
                </span>
              </p>
            </div>
            <div className="flex-1 p-0 overflow-hidden relative">
              <textarea 
                value={importSqlInput}
                onChange={(e) => setImportSqlInput(e.target.value)}
                placeholder="-- Paste your SQL DDL here...&#10;CREATE TABLE users (...);&#10;ALTER TABLE posts ADD CONSTRAINT ...;"
                className="w-full h-full bg-slate-900 text-emerald-400 font-mono text-sm p-6 outline-none resize-none placeholder:text-slate-600"
              />
            </div>
            <div className="p-4 bg-slate-100 flex justify-end gap-3 shrink-0">
              <button 
                onClick={handleImportSQL} 
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-md disabled:opacity-50"
                disabled={!importSqlInput.trim()}
              >
                Import Schema
              </button>
              <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-2 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg font-semibold text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <ReactFlowProvider>
    <TableMakerApp />
  </ReactFlowProvider>
);

export default App;
