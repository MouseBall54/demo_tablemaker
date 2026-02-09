
import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  MarkerType
} from 'reactflow';
import { Plus, Database, Wand2, FileCode, Trash2, X, Save, AlertCircle, Key, Link, Share2, ShieldCheck } from 'lucide-react';

import TableNode from './components/TableNode';
import { TableData, Column, ColumnType, RelationType } from './types';
import { generateSchemaSuggestion, generateSQL } from './services/geminiService';

const nodeTypes = {
  table: TableNode,
};

const initialNodes: Node<TableData>[] = [
  {
    id: 't1',
    type: 'table',
    position: { x: 100, y: 100 },
    style: { width: 200 }, // 기본 너비 설정
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
    style: { width: 200 }, // 기본 너비 설정
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

const App: React.FC = () => {
  const [nodes, setNodes] = useState<Node<TableData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sqlOutput, setSqlOutput] = useState<string | null>(null);

  // 현재 선택된 노드/엣지 데이터를 상태에서 직접 찾습니다 (객체 참조 유지 방지)
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

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      label: '1:N',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      style: { stroke: '#3b82f6', strokeWidth: 2 }
    }, eds)),
    []
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
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    setIsSidebarOpen(false);
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
    setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    setIsSidebarOpen(false);
  };

  const handleAISuggest = async () => {
    if (!aiPrompt) return;
    setIsLoading(true);
    try {
      const suggestion = await generateSchemaSuggestion(aiPrompt);
      const newNodes: Node<TableData>[] = suggestion.tables.map((t, idx) => ({
        id: t.id,
        type: 'table',
        position: { x: 100 + (idx * 300) % 900, y: 100 + Math.floor(idx / 3) * 250 },
        style: { width: 200 },
        data: t
      }));
      const newEdges: Edge[] = suggestion.relations.map((r, idx) => ({
        id: `e-ai-${idx}`,
        source: r.sourceTableId,
        target: r.targetTableId,
        sourceHandle: r.sourceColumnId,
        targetHandle: r.targetColumnId,
        label: r.type,
        markerEnd: r.type === '1:1' ? undefined : { type: MarkerType.ArrowClosed, color: '#3b82f6' },
        markerStart: r.type === 'N:M' ? { type: MarkerType.ArrowClosed, color: '#3b82f6' } : undefined,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      }));
      setNodes(newNodes);
      setEdges(newEdges);
      setAiPrompt('');
    } catch (error) {
      console.error(error);
      alert("AI suggestion failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSQL = async () => {
    setIsLoading(true);
    try {
      const sql = await generateSQL(nodes.map(n => n.data), edges.map(e => ({
        source: e.source,
        target: e.target,
        label: e.label
      })));
      setSqlOutput(sql);
    } catch (e) {
      alert("SQL generation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const columnTypes: ColumnType[] = ['VARCHAR', 'INTEGER', 'BOOLEAN', 'DATE', 'TIMESTAMP', 'UUID', 'TEXT', 'JSON'];

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50">
      <header className="h-14 bg-slate-900 flex items-center justify-between px-6 shadow-md z-10">
        <div className="flex items-center gap-3">
          <Database className="text-blue-400 w-6 h-6" />
          <h1 className="text-white font-bold text-lg tracking-tight">SchemaViz AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-800 rounded-md p-1 items-center">
            <input 
              type="text" 
              placeholder="E.g., E-commerce schema..." 
              className="bg-transparent border-none outline-none text-slate-200 px-3 py-1 text-sm w-48 lg:w-64"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAISuggest()}
            />
            <button 
              onClick={handleAISuggest}
              disabled={isLoading || !aiPrompt}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded px-3 py-1 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              {isLoading ? '...' : <><Wand2 className="w-3 h-3" /> AI Design</>}
            </button>
          </div>
          <button onClick={addTable} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Table
          </button>
          <button onClick={handleGenerateSQL} className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-colors">
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
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            connectionMode={ConnectionMode.Loose}
            fitView
          >
            <Background color="#cbd5e1" variant={'dots' as any} gap={20} />
            <Controls />
            <MiniMap style={{ height: 120 }} zoomable pannable />
          </ReactFlow>
        </div>

        {isSidebarOpen && (
          <div className="w-80 lg:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col z-20 transition-all">
            {selectedNode ? (
              <>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    Table Properties
                  </h2>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Table Name</label>
                    <input type="text" value={selectedNode.data.name} onChange={(e) => updateTableName(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Columns</label>
                      <button onClick={addColumn} className="text-xs text-blue-600 hover:text-blue-500 font-semibold flex items-center gap-1"><Plus className="w-3 h-3" /> Add Column</button>
                    </div>
                    <div className="space-y-3">
                      {selectedNode.data.columns.map((col) => (
                        <div key={col.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 relative group">
                          <button onClick={() => removeColumn(col.id)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                          <input type="text" value={col.name} onChange={(e) => updateColumn(col.id, { name: e.target.value })} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs mb-2 outline-none focus:border-blue-500" />
                          <div className="grid grid-cols-2 gap-2">
                            <select value={col.type} onChange={(e) => updateColumn(col.id, { type: e.target.value as ColumnType })} className="text-[10px] border border-slate-300 rounded px-1 py-1 bg-white outline-none">
                              {columnTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <div className="flex gap-1 items-center justify-end">
                              <button onClick={() => updateColumn(col.id, { isPK: !col.isPK })} title="Primary Key" className={`p-1 rounded ${col.isPK ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}><Key className="w-3 h-3" /></button>
                              <button onClick={() => updateColumn(col.id, { isFK: !col.isFK })} title="Foreign Key" className={`p-1 rounded ${col.isFK ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}><Link className="w-3 h-3" /></button>
                              <button onClick={() => updateColumn(col.id, { isUnique: !col.isUnique })} title="Unique" className={`p-1 rounded ${col.isUnique ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-400'}`}><ShieldCheck className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <button onClick={deleteTable} className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-semibold flex items-center justify-center gap-2 border border-red-200"><Trash2 className="w-4 h-4" /> Delete Table</button>
                </div>
              </>
            ) : selectedEdge ? (
              <>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-indigo-500" />
                    Relation Properties
                  </h2>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 p-4 space-y-6">
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
                      <strong>{selectedEdge.label}</strong> 관계는 소스 테이블과 타겟 테이블 간의 데이터 연결 방식을 정의합니다.
                    </p>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <button onClick={deleteEdge} className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-semibold flex items-center justify-center gap-2 border border-red-200"><Trash2 className="w-4 h-4" /> Delete Relation</button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {sqlOutput && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold flex items-center gap-2"><FileCode className="w-5 h-5" /> Exported PostgreSQL SQL</h3>
              <button onClick={() => setSqlOutput(null)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-900">
              <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap leading-relaxed">{sqlOutput}</pre>
            </div>
            <div className="p-4 bg-slate-100 flex justify-end gap-3">
              <button onClick={() => { navigator.clipboard.writeText(sqlOutput); alert("Copied!"); }} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm">Copy SQL</button>
              <button onClick={() => setSqlOutput(null)} className="px-6 py-2 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg font-semibold text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <div className="relative">
             <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
             <Wand2 className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="mt-4 font-bold text-slate-700 animate-pulse">Gemini is thinking...</p>
        </div>
      )}
    </div>
  );
};

export default App;
