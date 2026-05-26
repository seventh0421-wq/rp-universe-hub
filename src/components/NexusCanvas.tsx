import React, { useState, useEffect, useRef } from 'react';
import { Character, CanvasNode, CanvasEdge } from '../types';
import { defaultCharacter, getPointerPos, getRadarPoint } from '../constants';
import localforage from 'localforage';
import html2canvas from 'html2canvas';

interface NexusCanvasProps {
  characters: Character[];
  npcs: Character[];
  showNpcs: boolean;
  setShowNpcs: (val: boolean) => void;
  deleteNpc: (e: React.MouseEvent, id: string) => void;
  onCancel: () => void;
}

export default function NexusCanvas({ 
  characters, 
  npcs, 
  showNpcs, 
  setShowNpcs, 
  onCancel 
}: NexusCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);

  const captureCanvas = async () => {
    if (!canvasRef.current) return;
    setIsCapturing(true);
    try {
      // Give time for UI feedback to render
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#020617', // Match the main slate-950 canvas background
        scale: 2, // Capture at 2x scale for higher quality crisp text and images
        logging: false,
        onclone: (clonedDoc) => {
          // Hide all control panel/navigation buttons in the downloaded image
          const sidebarUiElements = clonedDoc.querySelectorAll('.sidebar-ui');
          sidebarUiElements.forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
        }
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `ff14_nexus_relationships_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export canvas to image', err);
      alert('抱歉，關係圖圖片生成失敗。可能是因為載入外部圖片 CORS 限制，您可以再試一次。');
    } finally {
      setIsCapturing(false);
    }
  };
  
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [connecting, setConnecting] = useState<{ sourceId: string; startX: number; startY: number } | null>(null); 
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const [cpModal, setCpModal] = useState<{ isOpen: boolean; source: string | null; target: string | null; label: string; color: string }>({ 
    isOpen: false, 
    source: null, 
    target: null, 
    label: '相識', 
    color: '#06b6d4' 
  });
  
  const [editingEdge, setEditingEdge] = useState<CanvasEdge | null>(null); 
  const [editingNode, setEditingNode] = useState<CanvasNode | null>(null); 
  const [activeTab, setActiveTab] = useState<'pc' | 'friend' | 'npc'>('pc'); 

  useEffect(() => {
    const loadCanvasData = async () => {
      const savedNodes = await localforage.getItem<CanvasNode[]>('nexus_canvas_nodes');
      const savedEdges = await localforage.getItem<CanvasEdge[]>('nexus_canvas_edges');
      const savedOffset = await localforage.getItem<{ x: number; y: number }>('nexus_canvas_offset');
      if (savedNodes) setNodes(savedNodes);
      if (savedEdges) setEdges(savedEdges);
      if (savedOffset) setOffset(savedOffset);
    };
    loadCanvasData();
  }, []);

  useEffect(() => {
    const saveCanvasData = async () => {
      if (nodes.length > 0 || edges.length > 0 || offset.x !== 0 || offset.y !== 0) {
        await localforage.setItem('nexus_canvas_nodes', nodes);
        await localforage.setItem('nexus_canvas_edges', edges);
        await localforage.setItem('nexus_canvas_offset', offset);
      }
    };
    saveCanvasData();
  }, [nodes, edges, offset]);

  const addNodeToCanvas = (char: Character) => {
    if (nodes.find(n => n.charId === char.id)) return;
    const centerX = -offset.x + window.innerWidth / 2 - 100;
    const centerY = -offset.y + window.innerHeight / 2 - 50;
    const newNode: CanvasNode = { 
      id: `node_${Date.now()}`, 
      charId: char.id, 
      x: centerX + (Math.random() * 80 - 40), 
      y: centerY + (Math.random() * 80 - 40), 
      customNote: '' 
    };
    setNodes([...nodes, newNode]);
  };

  const removeNode = (e: React.MouseEvent | React.TouchEvent, nodeId: string) => {
    e.stopPropagation();
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.canvas-node') || target.closest('.canvas-edge') || target.closest('.sidebar-ui')) return; 
    setIsPanning(true);
    const pos = getPointerPos(e);
    setPanStart({ x: pos.x - offset.x, y: pos.y - offset.y });
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const pos = getPointerPos(e);
    
    if (isPanning) {
      if (e.cancelable) e.preventDefault(); 
      setOffset({ x: pos.x - panStart.x, y: pos.y - panStart.y });
    } else if (draggingNode) {
      if (e.cancelable) e.preventDefault();
      setNodes(nodes.map(n => n.id === draggingNode ? { ...n, x: pos.x - offset.x - dragOffset.x, y: pos.y - offset.y - dragOffset.y } : n));
    }
    
    if (connecting) {
      if (e.cancelable) e.preventDefault();
      setMousePos({ x: pos.x - offset.x, y: pos.y - offset.y });
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
    if (connecting) setConnecting(null); 
  };

  const startDraggingNode = (e: React.MouseEvent | React.TouchEvent, node: CanvasNode) => {
    e.stopPropagation();
    const pos = getPointerPos(e);
    setDraggingNode(node.id);
    setDragOffset({ x: pos.x - offset.x - node.x, y: pos.y - offset.y - node.y });
  };

  const startConnecting = (e: React.MouseEvent | React.TouchEvent, nodeId: string, nodeX: number, nodeY: number) => {
    e.stopPropagation();
    setConnecting({ sourceId: nodeId, startX: nodeX + 200, startY: nodeY + 30 });
    setMousePos({ x: nodeX + 200, y: nodeY + 30 });
  };

  const finishConnecting = (e: React.MouseEvent | React.TouchEvent, targetNodeId: string) => {
    e.stopPropagation();
    setDraggingNode(null); 
    if (connecting && connecting.sourceId !== targetNodeId) {
      setCpModal({ isOpen: true, source: connecting.sourceId, target: targetNodeId, label: '相識', color: '#06b6d4' });
    }
    setConnecting(null);
  };

  const handleTouchEndConnection = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsPanning(false);
    setDraggingNode(null);
    if (connecting) {
      if (e.changedTouches.length > 0) {
        const pos = getPointerPos({ touches: e.changedTouches } as any); 
        const canvasX = pos.x - offset.x;
        const canvasY = pos.y - offset.y;
        
        const targetNode = nodes.find(n => 
          canvasX >= n.x && canvasX <= n.x + 200 && 
          canvasY >= n.y && canvasY <= n.y + 60
        );

        if (targetNode && connecting.sourceId !== targetNode.id) {
          setCpModal({ isOpen: true, source: connecting.sourceId, target: targetNode.id, label: '相識', color: '#06b6d4' });
        }
      }
      setConnecting(null);
    }
  };

  const confirmEdge = () => {
    if (!cpModal.source || !cpModal.target) return;
    const newEdge: CanvasEdge = { 
      id: `edge_${Date.now()}`, 
      source: cpModal.source, 
      target: cpModal.target, 
      label: cpModal.label, 
      color: cpModal.color 
    };
    const exists = edges.find(edge => 
      (edge.source === newEdge.source && edge.target === newEdge.target) || 
      (edge.source === newEdge.target && edge.target === newEdge.source)
    );
    if (!exists) setEdges([...edges, newEdge]);
    setCpModal({ ...cpModal, isOpen: false, source: null, target: null });
  };

  const openEdgeEdit = (e: React.MouseEvent | React.TouchEvent, edge: CanvasEdge) => {
    e.stopPropagation();
    setEditingEdge({ ...edge });
  };

  const saveEdgeEdit = () => {
    if (!editingEdge) return;
    setEdges(edges.map(edge => edge.id === editingEdge.id ? editingEdge : edge));
    setEditingEdge(null);
  };

  const deleteEdge = () => {
    if (!editingEdge) return;
    setEdges(edges.filter(edge => edge.id !== editingEdge.id));
    setEditingEdge(null);
  };

  const openNodeEdit = (e: React.MouseEvent | React.TouchEvent, node: CanvasNode) => {
    e.stopPropagation();
    setEditingNode({ ...node });
  };

  const saveNodeEdit = () => {
    if (!editingNode) return;
    setNodes(nodes.map(n => n.id === editingNode.id ? editingNode : n));
    setEditingNode(null);
  };

  const renderEdges = () => {
    return edges.map(edge => {
      const srcNode = nodes.find(n => n.id === edge.source);
      const tgtNode = nodes.find(n => n.id === edge.target);
      if (!srcNode || !tgtNode) return null;
      
      const startX = srcNode.x + 200; 
      const startY = srcNode.y + 35;
      const endX = tgtNode.x;
      const endY = tgtNode.y + 35;
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const pathData = `M ${startX} ${startY} C ${startX + 80} ${startY}, ${endX - 80} ${endY}, ${endX} ${endY}`;

      return (
        <g key={edge.id} className="group">
          <path 
            d={pathData} 
            stroke="transparent" 
            strokeWidth={20} 
            fill="none" 
            className="cursor-pointer canvas-edge pointer-events-auto" 
            onClick={(e) => openEdgeEdit(e, edge)} 
            onTouchEnd={(e) => { e.stopPropagation(); openEdgeEdit(e, edge); }} 
          />
          <path 
            d={pathData} 
            stroke={edge.color} 
            strokeWidth={2} 
            fill="none" 
            className="drop-shadow-[0_0_5px_currentColor] pointer-events-none" 
            style={{ color: edge.color }} 
          />
          
          <g 
            transform={`translate(${midX}, ${midY})`} 
            onClick={(e) => openEdgeEdit(e, edge)} 
            onTouchEnd={(e) => { e.stopPropagation(); openEdgeEdit(e, edge); }} 
            className="cursor-pointer canvas-edge group/label pointer-events-auto"
          >
            <rect 
              x="-50" 
              y="-14" 
              width="100" 
              height="28" 
              rx="14" 
              fill="#0f172a" 
              fillOpacity="0.9" 
              stroke={edge.color} 
              strokeWidth={1} 
              className="transition-all group-hover/label:stroke-white group-hover/label:stroke-[1.5px]" 
            />
            <text x="0" y="4" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{edge.label}</text>
            <text x="40" y="-14" fill="#94a3b8" fontSize="10" className="opacity-0 group-hover/label:opacity-100 transition-opacity drop-shadow-md">✎</text>
          </g>
        </g>
      );
    });
  };

  const myChars = characters.filter(c => !c.isImported);
  const importedChars = characters.filter(c => c.isImported);

  return (
    <div 
      className="flex flex-col md:flex-row h-screen bg-[#020617] text-slate-200 overflow-hidden select-none" 
      onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handleTouchEndConnection} onTouchCancel={handlePointerUp}
    >
      <div className="w-full md:w-72 bg-slate-900/90 backdrop-blur-xl border-b md:border-b-0 md:border-r border-white/10 flex flex-col z-20 shadow-2xl sidebar-ui h-1/3 md:h-full">
        <div className="p-4 md:p-6 border-b border-white/10 shrink-0">
          <button onClick={onCancel} className="mb-2 md:mb-4 flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors w-fit cursor-pointer">
            <span>🔙</span> 返回總控台
          </button>
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 mb-3" style={{ fontFamily: "'Orbitron', 'Noto Serif TC', serif" }}>
            <span className="text-cyan-400">🕸️</span> 畫布角色庫
          </h2>
          
          <div className="flex bg-black/40 rounded-lg p-1">
            <button onClick={() => setActiveTab('pc')} className={`flex-1 text-xs py-1 md:py-1.5 rounded transition-colors font-bold cursor-pointer ${activeTab === 'pc' ? 'bg-white/10 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>光之戰士</button>
            <button onClick={() => setActiveTab('friend')} className={`flex-1 text-xs py-1 md:py-1.5 rounded transition-colors font-bold cursor-pointer ${activeTab === 'friend' ? 'bg-white/10 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>好友名單</button>
            <button onClick={() => setActiveTab('npc')} className={`flex-1 text-xs py-1 md:py-1.5 rounded transition-colors font-bold cursor-pointer ${activeTab === 'npc' ? 'bg-white/10 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}>官方 NPC</button>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2 md:space-y-3 relative">
          {activeTab === 'pc' && (
            <>
              {myChars.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">無原創角色</div>
              ) : (
                myChars.map(char => {
                  const isOnCanvas = nodes.find(n => n.charId === char.id);
                  return (
                    <div 
                      key={char.id} 
                      onClick={() => !isOnCanvas && addNodeToCanvas(char)} 
                      className={`flex items-center gap-3 p-2 md:p-3 rounded-xl border transition-all ${isOnCanvas ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed' : 'bg-black/40 border-white/10 hover:border-cyan-500/50 cursor-pointer hover:bg-white/5'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 border overflow-hidden shrink-0 flex items-center justify-center" style={{ borderColor: char.themeColor, backgroundColor: `${char.themeColor}20` }}>
                        {char.imageUrl ? (
                          <img 
                            src={char.imageUrl} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                            style={{ 
                              transform: `scale(${(char.imageZoom ?? 100) / 100})`, 
                              objectPosition: `${char.imagePosX ?? 50}% ${char.imagePosY ?? 20}%`,
                              transformOrigin: 'center center'
                            }} 
                            referrerPolicy="no-referrer" 
                          />
                        ) : <span className="text-xs">👤</span>}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-bold truncate text-slate-200">{char.name || '未命名'}</div>
                        <div className="text-xs text-slate-500 truncate hidden md:block">{char.tags || char.race || '種族不明'}</div>
                      </div>
                      {!isOnCanvas && <span className="text-cyan-500 font-bold pr-2">+</span>}
                    </div>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'friend' && (
            <>
              {importedChars.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">目前好友名單中無角色</div>
              ) : (
                importedChars.map(char => {
                  const isOnCanvas = nodes.find(n => n.charId === char.id);
                  return (
                    <div 
                      key={char.id} 
                      onClick={() => !isOnCanvas && addNodeToCanvas(char)} 
                      className={`flex items-center gap-3 p-2 md:p-3 rounded-xl border transition-all ${isOnCanvas ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed' : 'bg-black/40 border-white/10 hover:border-emerald-500/50 cursor-pointer hover:bg-white/5'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 border overflow-hidden shrink-0 flex items-center justify-center" style={{ borderColor: char.themeColor, backgroundColor: `${char.themeColor}20` }}>
                        {char.imageUrl ? (
                          <img 
                            src={char.imageUrl} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                            style={{ 
                              transform: `scale(${(char.imageZoom ?? 100) / 100})`, 
                              objectPosition: `${char.imagePosX ?? 50}% ${char.imagePosY ?? 20}%`,
                              transformOrigin: 'center center'
                            }} 
                            referrerPolicy="no-referrer" 
                          />
                        ) : <span className="text-xs">👤</span>}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-bold truncate text-slate-200 flex items-center gap-1">
                          {char.name || '未命名'} <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded border border-emerald-500/30">好友</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate hidden md:block">{char.tags || char.race || '種族不明'}</div>
                      </div>
                      {!isOnCanvas && <span className="text-emerald-500 font-bold pr-2">+</span>}
                    </div>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'npc' && (
            !showNpcs ? (
              <div className="bg-amber-900/20 border border-amber-500/50 rounded-xl p-4 text-center mt-4 animate-fade-in">
                <div className="text-2xl mb-2">⚠️</div>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">包含主線劇情暴雷<br/>建議通關後再閱覽</p>
                <button onClick={() => setShowNpcs(true)} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition-all shadow-[0_0_10px_rgba(245,158,11,0.3)] cursor-pointer">
                  展開名單
                </button>
              </div>
            ) : (
              <div className="animate-fade-in space-y-2 md:space-y-3">
                {npcs.map(char => {
                  const isOnCanvas = nodes.find(n => n.charId === char.id);
                  return (
                    <div 
                      key={char.id} 
                      onClick={() => !isOnCanvas && addNodeToCanvas(char)} 
                      className={`flex items-center gap-3 p-2 md:p-3 rounded-xl border transition-all ${isOnCanvas ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed' : 'bg-black/40 border-white/10 hover:border-amber-500/50 cursor-pointer hover:bg-white/5'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 border overflow-hidden shrink-0 flex items-center justify-center" style={{ borderColor: char.themeColor, backgroundColor: `${char.themeColor}20` }}>
                        {char.imageUrl ? (
                          <img 
                            src={char.imageUrl} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                            style={{ 
                              transform: `scale(${(char.imageZoom ?? 100) / 100})`, 
                              objectPosition: `${char.imagePosX ?? 50}% ${char.imagePosY ?? 20}%`,
                              transformOrigin: 'center center'
                            }} 
                            referrerPolicy="no-referrer" 
                          />
                        ) : <span className="text-xs">👤</span>}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-bold truncate text-amber-100">{char.name || '未命名'}</div>
                        <div className="text-xs text-slate-500 truncate hidden md:block">{char.tags || char.race || '種族不明'}</div>
                      </div>
                      {!isOnCanvas && <span className="text-amber-500 font-bold pr-2">+</span>}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      <div ref={canvasRef} className="flex-1 relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:24px_24px] touch-none" style={{ backgroundPosition: `${offset.x}px ${offset.y}px` }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <g transform={`translate(${offset.x}, ${offset.y})`}>
            {renderEdges()}
            {connecting && <path d={`M ${connecting.startX} ${connecting.startY} C ${connecting.startX + 50} ${connecting.startY}, ${mousePos.x - 50} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`} stroke="#4de0ff" strokeWidth="2" strokeDasharray="5,5" fill="none" className="opacity-80 animate-pulse" />}
          </g>
        </svg>

        <div className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transformOrigin: '0 0' }}>
          {nodes.map(node => {
            const charData = characters.find(c => c.id === node.charId) || npcs.find(c => c.id === node.charId) || defaultCharacter;
            return (
              <div 
                key={node.id} 
                className="canvas-node absolute pointer-events-auto group" 
                style={{ left: node.x, top: node.y, zIndex: draggingNode === node.id ? 50 : 1 }} 
                onMouseDown={(e) => startDraggingNode(e, node)} 
                onMouseUp={(e) => finishConnecting(e, node.id)}
                onTouchStart={(e) => startDraggingNode(e, node)}
              >
                <div className="bg-slate-900/90 backdrop-blur-md border rounded-xl p-3 flex items-center gap-3 w-[180px] md:w-[200px] shadow-xl hover:shadow-2xl transition-shadow relative" style={{ borderColor: `${charData.themeColor}80` }}>
                  <div className="w-10 h-10 rounded-full border-2 bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center" style={{ borderColor: charData.themeColor }}>
                    {charData.imageUrl ? (
                      <img 
                        src={charData.imageUrl} 
                        alt="Avatar" 
                        className="w-full h-full object-cover" 
                        style={{ 
                          transform: `scale(${(charData.imageZoom ?? 100) / 100})`, 
                          objectPosition: `${charData.imagePosX ?? 50}% ${charData.imagePosY ?? 20}%`,
                          transformOrigin: 'center center'
                        }} 
                        referrerPolicy="no-referrer" 
                      />
                    ) : <span className="text-slate-400">👤</span>}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-sm text-slate-100 truncate">{charData.name || '未命名'}</div>
                    <div className="text-xs text-slate-400 truncate">{charData.tags || '無標籤'}</div>
                  </div>
                  
                  {node.customNote && (
                    <div className="absolute -bottom-2 right-2 bg-slate-800 border border-slate-600 text-slate-300 text-[10px] px-2 py-0.5 rounded-full shadow-lg">
                      📝 私人設定
                    </div>
                  )}
                </div>
                
                <button 
                  className="absolute -top-2 -left-2 w-5 h-5 bg-red-500/80 hover:bg-red-500 border border-red-300/50 rounded-full text-[10px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 md:transition-opacity shadow-lg cursor-pointer" 
                  onClick={(e) => removeNode(e, node.id)} 
                  onTouchEnd={(e) => { e.stopPropagation(); removeNode(e, node.id); }}
                >✕</button>
                <button 
                  className="absolute -top-2 -right-2 w-6 h-6 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-full text-[12px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 md:transition-opacity shadow-lg z-20 cursor-pointer" 
                  onClick={(e) => openNodeEdit(e, node)} 
                  onTouchEnd={(e) => { e.stopPropagation(); openNodeEdit(e, node); }}
                >✎</button>
                
                <div 
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 border-2 border-cyan-400 rounded-full flex items-center justify-center cursor-crosshair hover:bg-cyan-500 transition-colors shadow-[0_0_10px_rgba(34,211,238,0.5)] z-20" 
                  onMouseDown={(e) => startConnecting(e, node.id, node.x, node.y)}
                  onTouchStart={(e) => startConnecting(e, node.id, node.x, node.y)}
                >
                  <div className="w-2 h-2 bg-white rounded-full pointer-events-none"></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute top-4 right-4 z-20 bg-slate-900/80 p-2 rounded-lg border border-white/10 backdrop-blur-md flex gap-2 shadow-lg pointer-events-auto sidebar-ui">
          <button onClick={captureCanvas} className="text-xs text-emerald-400 hover:text-emerald-300 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded transition-colors cursor-pointer flex items-center gap-1 font-bold">
            <span>📸</span> 儲存為圖片
          </button>
          <button onClick={() => setOffset({x: 0, y: 0})} className="text-xs text-slate-300 hover:text-white px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded transition-colors cursor-pointer">📍 回原點</button>
          <button onClick={() => { setNodes([]); setEdges([]); }} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded transition-colors cursor-pointer">🗑️ 清空畫布</button>
        </div>
      </div>

      {(cpModal.isOpen || editingEdge) && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto sidebar-ui">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="text-xl font-bold text-cyan-400 mb-4 border-b border-white/10 pb-2" style={{ fontFamily: "'Orbitron', 'Noto Serif TC', serif" }}>
              {editingEdge ? '✏️ 編輯羈絆連線' : '🔗 定義羈絆連線'}
            </h3>
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">關係標籤</label>
              <input 
                type="text" 
                value={editingEdge ? editingEdge.label : cpModal.label} 
                onChange={e => editingEdge ? setEditingEdge({...editingEdge, label: e.target.value}) : setCpModal({...cpModal, label: e.target.value})} 
                placeholder="例如：相方、宿敵" 
                className="w-full bg-black/40 border border-white/20 rounded p-2 text-white outline-none focus:border-cyan-500 text-sm" 
                autoFocus 
              />
            </div>
            <div className="mb-6 flex gap-4 items-center">
              <label className="text-xs text-slate-400">線條色彩</label>
              <input 
                type="color" 
                value={editingEdge ? editingEdge.color : cpModal.color} 
                onChange={e => editingEdge ? setEditingEdge({...editingEdge, color: e.target.value}) : setCpModal({...cpModal, color: e.target.value})} 
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" 
              />
            </div>
            <div className="flex justify-end gap-3">
              {editingEdge && <button onClick={deleteEdge} className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors mr-auto cursor-pointer">刪除連線</button>}
              <button onClick={() => editingEdge ? setEditingEdge(null) : setCpModal({...cpModal, isOpen: false, source: null, target: null})} className="px-4 py-2 text-sm text-slate-400 hover:text-white cursor-pointer">取消</button>
              <button onClick={editingEdge ? saveEdgeEdit : confirmEdge} className="px-6 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold shadow-[0_0_15px_rgba(34,211,238,0.5)] cursor-pointer">
                {editingEdge ? '更新' : '連線'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingNode && (() => {
        const charData = characters.find(c => c.id === editingNode.charId) || npcs.find(c => c.id === editingNode.charId) || defaultCharacter;
        return (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto sidebar-ui">
            <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 w-[500px] shadow-2xl">
              <div className="flex items-center gap-4 mb-4 border-b border-white/10 pb-4">
                <div className="w-12 h-12 rounded-full border-2 bg-slate-800 overflow-hidden flex items-center justify-center" style={{ borderColor: charData.themeColor }}>
                  {charData.imageUrl ? (
                    <img 
                      src={charData.imageUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover" 
                      style={{ 
                        transform: `scale(${(charData.imageZoom ?? 100) / 100})`, 
                        objectPosition: `${charData.imagePosX ?? 50}% ${charData.imagePosY ?? 20}%`,
                        transformOrigin: 'center center'
                      }} 
                      referrerPolicy="no-referrer" 
                    />
                  ) : <span className="text-slate-400">👤</span>}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-400">{charData.name}</h3>
                  <p className="text-xs text-slate-400">編輯畫布專屬私人設定與備註故事</p>
                </div>
              </div>
              <div className="mb-6">
                <textarea 
                  value={editingNode.customNote || ''} 
                  onChange={e => setEditingNode({...editingNode, customNote: e.target.value})} 
                  placeholder="例如：在這個平行宇宙中，他/她其實是光之戰士隱藏的導師，兩人在多年前的某場戰役中結下了不解之緣..." 
                  className="w-full bg-black/40 border border-white/20 rounded p-3 text-white outline-none focus:border-amber-500 resize-none h-40 custom-scrollbar text-sm leading-relaxed" 
                  autoFocus 
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditingNode(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white cursor-pointer">取消</button>
                <button onClick={saveNodeEdit} className="px-6 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer">儲存備註</button>
              </div>
            </div>
          </div>
        );
      })()}

      {isCapturing && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900/95 border border-cyan-500/30 rounded-2xl p-6 max-w-sm text-center shadow-2xl">
            <div className="text-4xl mb-3 animate-spin duration-1000 inline-block">🔮</div>
            <h3 className="text-lg font-bold text-cyan-400 mb-2">正在生成關係網圖片</h3>
            <p className="text-xs text-slate-400 leading-relaxed">請稍候，我們正在為您繪製並下載高品質關係網絡圖（寬高與您的畫布同步）...</p>
          </div>
        </div>
      )}
    </div>
  );
}
