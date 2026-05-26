import React, { useState, useEffect, useRef } from 'react';
import { Character, CanvasNode, CanvasEdge } from '../types';
import { defaultCharacter, getPointerPos, getRadarPoint } from '../constants';
import localforage from 'localforage';

export function convertOklchToRgbInText(text: string): string {
  const oklchRegex = /oklch\(\s*([0-9.]+%?)[,\s]+([0-9.]+)[,\s]+([0-9.]+)(?:\s*[\/,]\s*([0-9.]+%?))?\s*\)/g;
  
  return text.replace(oklchRegex, (match, lStr, cStr, hStr, aStr) => {
    try {
      let l = parseFloat(lStr);
      if (lStr.endsWith('%')) {
        l = l / 100;
      }
      const c = parseFloat(cStr);
      const h = parseFloat(hStr);
      
      let a = 1;
      if (aStr) {
        a = parseFloat(aStr);
        if (aStr.endsWith('%')) {
          a = a / 100;
        }
      }
      
      if (isNaN(l) || isNaN(c) || isNaN(h)) {
        return 'rgb(30, 41, 59)';
      }

      // OKLCH -> OKLAB
      const hRad = h * Math.PI / 180;
      const a_ = c * Math.cos(hRad);
      const b_ = c * Math.sin(hRad);
      
      // OKLAB -> LMS
      const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
      const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
      const s_ = l - 0.0894841775 * a_ - 1.2914855480 * b_;
      
      const l3 = l_ * l_ * l_;
      const m3 = m_ * m_ * m_;
      const s3 = s_ * s_ * s_;
      
      // LMS -> Linear sRGB (using standard transfer matrix)
      const rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
      const gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
      const bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;
      
      const f = (x: number) => {
        if (x <= 0) return 0;
        if (x >= 1) return 255;
        return Math.round(255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055));
      };
      
      const r = isNaN(f(rL)) ? 30 : f(rL);
      const g = isNaN(f(gL)) ? 41 : f(gL);
      const b = isNaN(f(bL)) ? 59 : f(bL);
      
      if (a === 1) {
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
    } catch (e) {
      console.warn('Oklch conversion failed for match:', match, e);
      return 'rgb(30, 41, 59)';
    }
  });
}

export function getRelationEmoji(label: string): string {
  if (!label) return '💬';
  const val = label.toLowerCase();
  
  // CP, Romance, Marriage
  if (
    val.includes('相方') || 
    val.includes('cp') || 
    val.includes('情侶') || 
    val.includes('戀人') || 
    val.includes('愛人') || 
    val.includes('夫妻') || 
    val.includes('結婚') || 
    val.includes('伴侶') || 
    val.includes('重婚') || 
    val.includes('誓約') ||
    val.includes('配偶') ||
    val.includes('老公') ||
    val.includes('老婆') ||
    val.includes('契合') ||
    val.includes('求婚') ||
    val.includes('定情')
  ) {
    return '💖';
  }
  
  // Rival, Enemy, Hostile
  if (
    val.includes('宿敵') || 
    val.includes('死敵') || 
    val.includes('對頭') || 
    val.includes('敵對') || 
    val.includes('敵人') || 
    val.includes('仇人') || 
    val.includes('恨') || 
    val.includes('競爭') ||
    val.includes('仇敵') ||
    val.includes('宿命') ||
    val.includes('死對頭') ||
    val.includes('討厭')
  ) {
    return '⚔️';
  }
  
  // Master-Servant, Boss, Superior
  if (
    val.includes('主僕') || 
    val.includes('隨從') || 
    val.includes('僱員') || 
    val.includes('僕人') || 
    val.includes('主人') || 
    val.includes('下屬') ||
    val.includes('老闆') ||
    val.includes('上司') ||
    val.includes('部下') ||
    val.includes('僕從')
  ) {
    return '👑';
  }
  
  // Mentor, Student, Teacher
  if (
    val.includes('導師') || 
    val.includes('師徒') || 
    val.includes('徒弟') || 
    val.includes('學生') || 
    val.includes('師父') || 
    val.includes('老師') || 
    val.includes('弟子') ||
    val.includes('學習') ||
    val.includes('授課') ||
    val.includes('教導')
  ) {
    return '📖';
  }
  
  // Comrade, Partner, Battle Buddy
  if (
    val.includes('戰友') || 
    val.includes('夥伴') || 
    val.includes('隊友') || 
    val.includes('搭檔') || 
    val.includes('共犯') || 
    val.includes('冒險') ||
    val.includes('同行') ||
    val.includes('盟友') ||
    val.includes('冒險夥伴')
  ) {
    return '🛡️';
  }
  
  // Family, Relatives
  if (
    val.includes('家人') || 
    val.includes('兄弟') || 
    val.includes('姊妹') || 
    val.includes('父子') || 
    val.includes('母女') || 
    val.includes('血親') || 
    val.includes('親戚') || 
    val.includes('收養') ||
    val.includes('養子') ||
    val.includes('養女') ||
    val.includes('妹妹') ||
    val.includes('弟弟') ||
    val.includes('姊姊') ||
    val.includes('哥哥') ||
    val.includes('父母') ||
    val.includes('雙親')
  ) {
    return '🏠';
  }
  
  // Crush, Secret Admirer, Admiration
  if (
    val.includes('暗戀') || 
    val.includes('單戀') || 
    val.includes('憧憬') || 
    val.includes('崇拜') || 
    val.includes('仰慕') || 
    val.includes('暗中') ||
    val.includes('好感') ||
    val.includes('迷戀') ||
    val.includes('思慕')
  ) {
    return '💗';
  }
  
  // Friends, Close Friends
  if (
    val.includes('親友') || 
    val.includes('朋友') || 
    val.includes('友人') || 
    val.includes('死黨') || 
    val.includes('閨蜜') || 
    val.includes('社交') ||
    val.includes('摯友') ||
    val.includes('密友') ||
    val.includes('玩伴')
  ) {
    return '🤝';
  }
  
  // Acquaintance, Ordinary, Passing
  if (
    val.includes('相識') || 
    val.includes('普通') || 
    val.includes('點頭') || 
    val.includes('路人') || 
    val.includes('認識') ||
    val.includes('見過') ||
    val.includes('路過')
  ) {
    return '💬';
  }
  
  return '✨'; // default sparkling/mysterious connection
}

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
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const updateDimensions = () => {
      if (canvasRef.current) {
        setDimensions({
          width: canvasRef.current.clientWidth || window.innerWidth,
          height: canvasRef.current.clientHeight || window.innerHeight
        });
      }
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(canvasRef.current);
    updateDimensions();

    window.addEventListener('resize', updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [connecting, setConnecting] = useState<{ sourceId: string; startX: number; startY: number } | null>(null); 
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const [cpModal, setCpModal] = useState<{ 
    isOpen: boolean; 
    source: string | null; 
    target: string | null; 
    label: string; 
    color: string;
    relationType: 'forward' | 'backward' | 'bidirectional';
    targetLabel: string;
    targetColor: string;
  }>({ 
    isOpen: false, 
    source: null, 
    target: null, 
    label: '相識', 
    color: '#06b6d4',
    relationType: 'forward',
    targetLabel: '',
    targetColor: '#10b981'
  });
  
  const [editingEdge, setEditingEdge] = useState<CanvasEdge | null>(null); 
  const [editingNode, setEditingNode] = useState<CanvasNode | null>(null); 
  const [activeTab, setActiveTab] = useState<'pc' | 'friend' | 'npc'>('pc'); 
  const [showArrangeMenu, setShowArrangeMenu] = useState(false);

  const arrangeLayout = (type: 'circular' | 'grid' | 'force') => {
    if (nodes.length === 0) return;
    
    // Calculate current average positions on canvas to keep viewport centered where it was
    let avgX = nodes.reduce((sum, n) => sum + n.x, 0) / nodes.length;
    let avgY = nodes.reduce((sum, n) => sum + n.y, 0) / nodes.length;

    // Reset coordinates if unreasonable (e.g., NaN or Infinity)
    if (isNaN(avgX) || !isFinite(avgX)) avgX = window.innerWidth / 2 - 100;
    if (isNaN(avgY) || !isFinite(avgY)) avgY = window.innerHeight / 2 - 35;

    let arrangedNodes = [...nodes];

    if (type === 'circular') {
      // Circle radius increases dynamically based on node count to prevent overlaps
      const radius = Math.max(220, nodes.length * 45);
      arrangedNodes = nodes.map((node, index) => {
        const angle = (index / nodes.length) * 2 * Math.PI;
        return {
          ...node,
          x: Math.round(avgX + radius * Math.cos(angle)),
          y: Math.round(avgY + radius * Math.sin(angle))
        };
      });
    } else if (type === 'grid') {
      // Matrix-style rows and columns layout
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const colWidth = 260;
      const rowHeight = 135;
      const startX = avgX - ((cols - 1) * colWidth) / 2;
      const startY = avgY - (Math.ceil(nodes.length / cols) * rowHeight) / 2;

      arrangedNodes = nodes.map((node, index) => {
        const r = Math.floor(index / cols);
        const c = index % cols;
        return {
          ...node,
          x: Math.round(startX + c * colWidth),
          y: Math.round(startY + r * rowHeight)
        };
      });
    } else if (type === 'force') {
      // Force-directed simulation in-memory for instant response
      let tempNodes = nodes.map(n => ({ id: n.id, x: n.x, y: n.y, vx: 0, vy: 0 }));
      
      for (let iter = 0; iter < 150; iter++) {
        // Repulsion force to push nodes away from each other
        for (let i = 0; i < tempNodes.length; i++) {
          for (let j = i + 1; j < tempNodes.length; j++) {
            const n1 = tempNodes[i];
            const n2 = tempNodes[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Nodes are 200px wide and 70px high, so repelling needs to be strong
            const minDist = 260; 
            if (dist < minDist) {
              const force = ((minDist - dist) / dist) * 0.6;
              const fx = dx * force;
              const fy = dy * force;
              n1.vx += fx;
              n1.vy += fy;
              n2.vx -= fx;
              n2.vy -= fy;
            }
          }
        }

        // Attraction force pulls connected nodes closer
        edges.forEach(edge => {
          const n1 = tempNodes.find(n => n.id === edge.source);
          const n2 = tempNodes.find(n => n.id === edge.target);
          if (n1 && n2) {
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const desiredDist = 280;
            if (dist > desiredDist) {
              const force = ((dist - desiredDist) / dist) * 0.12;
              const fx = dx * force;
              const fy = dy * force;
              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        });

        // Center gravity pulls everything toward center
        tempNodes.forEach(n => {
          const dx = n.x - avgX;
          const dy = n.y - avgY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          n.vx -= (dx / dist) * 0.25;
          n.vy -= (dy / dist) * 0.25;
        });

        // Apply velocity with air resistance dampening
        tempNodes.forEach(n => {
          n.x += Math.max(-60, Math.min(60, n.vx));
          n.y += Math.max(-35, Math.min(35, n.vy));
          n.vx *= 0.45;
          n.vy *= 0.45;
        });
      }

      arrangedNodes = nodes.map(n => {
        const tn = tempNodes.find(t => t.id === n.id);
        return tn ? { ...n, x: Math.round(tn.x), y: Math.round(tn.y) } : n;
      });
    }

    setNodes(arrangedNodes);
    setShowArrangeMenu(false);
  };

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
      setCpModal({ 
        isOpen: true, 
        source: connecting.sourceId, 
        target: targetNodeId, 
        label: '相識', 
        color: '#06b6d4',
        relationType: 'forward',
        targetLabel: '',
        targetColor: '#10b981'
      });
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
          setCpModal({ 
            isOpen: true, 
            source: connecting.sourceId, 
            target: targetNode.id, 
            label: '相識', 
            color: '#06b6d4',
            relationType: 'forward',
            targetLabel: '',
            targetColor: '#10b981'
          });
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
      color: cpModal.color,
      relationType: cpModal.relationType,
      targetLabel: cpModal.relationType === 'bidirectional' ? cpModal.targetLabel : undefined,
      targetColor: cpModal.relationType === 'bidirectional' ? cpModal.targetColor : undefined
    };
    const exists = edges.find(edge => 
      (edge.source === newEdge.source && edge.target === newEdge.target) || 
      (edge.source === newEdge.target && edge.target === newEdge.source)
    );
    if (!exists) setEdges([...edges, newEdge]);
    setCpModal({ 
      isOpen: false, 
      source: null, 
      target: null, 
      label: '相識', 
      color: '#06b6d4',
      relationType: 'forward',
      targetLabel: '',
      targetColor: '#10b981'
    });
  };

  const openEdgeEdit = (e: React.MouseEvent | React.TouchEvent, edge: CanvasEdge) => {
    e.stopPropagation();
    setEditingEdge({ 
      ...edge,
      relationType: edge.relationType || 'forward',
      targetLabel: edge.targetLabel || '',
      targetColor: edge.targetColor || '#10b981'
    });
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

      const isBiDir = edge.relationType === 'bidirectional';

      // Helper to render a directed path (fromNode ➔ toNode)
      const renderSinglePath = (
        id: string,
        fromNode: CanvasNode,
        toNode: CanvasNode,
        label: string,
        color: string,
        isBowed: boolean,
        bowDirection: number
      ) => {
        // Calculate centers
        const centerFrom = { x: fromNode.x + 100, y: fromNode.y + 35 };
        const centerTo = { x: toNode.x + 100, y: toNode.y + 35 };

        // Determine left or right ports based on relative center positions
        const startX = centerFrom.x < centerTo.x ? fromNode.x + 200 : fromNode.x;
        const startY = fromNode.y + 35;
        const endX = centerFrom.x < centerTo.x ? toNode.x : toNode.x + 200;
        const endY = toNode.y + 35;

        const dx = endX - startX;
        const dy = endY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Shrink distance of 10px so arrow markers are fully visible beside node cards
        const shrink = 10;
        const actualStartX = startX + (dx / dist) * shrink;
        const actualStartY = startY + (dy / dist) * shrink;
        const actualEndX = endX - (dx / dist) * shrink;
        const actualEndY = endY - (dy / dist) * shrink;

        const actualDx = actualEndX - actualStartX;
        const actualDy = actualEndY - actualStartY;
        const actualDist = Math.sqrt(actualDx * actualDx + actualDy * actualDy) || 1;

        // Normal vector
        const nx = -actualDy / actualDist;
        const ny = actualDx / actualDist;

        // Symmetric bow offset
        const bow = isBowed ? 35 : 0;
        const offsetDist = bow * bowDirection;

        // Control points
        const isFromLeft = centerFrom.x < centerTo.x;
        const cpExt = isFromLeft ? 80 : -80;

        const cp1x = actualStartX + cpExt + nx * offsetDist;
        const cp1y = actualStartY + ny * offsetDist;
        const cp2x = actualEndX - cpExt + nx * offsetDist;
        const cp2y = actualEndY + ny * offsetDist;

        const pathData = `M ${actualStartX} ${actualStartY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${actualEndX} ${actualEndY}`;

        const getBezierPoint = (t: number, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
          const mt = 1 - t;
          const mt2 = mt * mt;
          const mt3 = mt2 * mt;
          const t2 = t * t;
          const t3 = t2 * t;
          return {
            x: mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3,
            y: mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3
          };
        };

        const pt = getBezierPoint(0.5, actualStartX, actualStartY, cp1x, cp1y, cp2x, cp2y, actualEndX, actualEndY);

        const cleanLabelStr = `${getRelationEmoji(label)} ${label}`;

        // Width logic
        let width = 25;
        for (let i = 0; i < cleanLabelStr.length; i++) {
          const charCode = cleanLabelStr.charCodeAt(i);
          if (charCode > 255) {
            width += 9.5;
          } else {
            width += 6.5;
          }
        }
        const labelWidth = Math.max(90, width);
        const halfWidth = labelWidth / 2;

        // Tangent unit vector at end of curve (at P3/actualEnd, referencing direction from control point cp2 to the end coordinate)
        const tangentDx = actualEndX - cp2x;
        const tangentDy = actualEndY - cp2y;
        const tangentLen = Math.sqrt(tangentDx * tangentDx + tangentDy * tangentDy) || 1;
        const ux = tangentDx / tangentLen;
        const uy = tangentDy / tangentLen;

        const arrowHeight = 10;
        const arrowWidth = 8;
        const tipX = actualEndX;
        const tipY = actualEndY;
        const backLeftX = tipX - ux * arrowHeight - uy * (arrowWidth / 2);
        const backLeftY = tipY - uy * arrowHeight + ux * (arrowWidth / 2);
        const backRightX = tipX - ux * arrowHeight + uy * (arrowWidth / 2);
        const backRightY = tipY - uy * arrowHeight - ux * (arrowWidth / 2);
        
        const arrowheadPath = `M ${tipX} ${tipY} L ${backLeftX} ${backLeftY} L ${backRightX} ${backRightY} Z`;

        return (
          <g key={id} className="group">
            {/* Click layer/interaction track */}
            <path 
              d={pathData} 
              stroke="transparent" 
              strokeWidth={20} 
              fill="none" 
              className="cursor-pointer canvas-edge pointer-events-auto" 
              onClick={(e) => openEdgeEdit(e, edge)} 
              onTouchEnd={(e) => { e.stopPropagation(); openEdgeEdit(e, edge); }} 
            />
            {/* Glow Path behind connection line (using vector glow instead of blurry CSS filter for crispness in html-to-image) */}
            <path 
              d={pathData} 
              stroke={color} 
              strokeWidth={5} 
              strokeOpacity={0.25}
              fill="none" 
              className="pointer-events-none transition-all group-hover:stroke-[7px]" 
            />
            {/* Crisp Connection Line */}
            <path 
              d={pathData} 
              stroke={color} 
              strokeWidth={2} 
              fill="none" 
              className="pointer-events-none transition-all group-hover:stroke-[3px]" 
            />
            
            {/* Inline Vector Arrowhead (no references, zero blurring, 100% vector clarity in exports) */}
            <path 
              d={arrowheadPath} 
              fill={color} 
              className="pointer-events-none opacity-90 transition-transform group-hover:scale-110"
              style={{ transformOrigin: `${tipX}px ${tipY}px` }}
            />
            
            {/* Label in the middle */}
            <g 
              transform={`translate(${pt.x}, ${pt.y})`} 
              onClick={(e) => openEdgeEdit(e, edge)} 
              onTouchEnd={(e) => { e.stopPropagation(); openEdgeEdit(e, edge); }} 
              className="cursor-pointer canvas-edge group/lbl pointer-events-auto"
            >
              <rect 
                x={-halfWidth} 
                y="-13" 
                width={labelWidth} 
                height="26" 
                rx="13" 
                fill="#0f172a" 
                fillOpacity="0.95" 
                stroke={color} 
                strokeWidth={1.2} 
                className="transition-all group-hover/lbl:stroke-white group-hover/lbl:stroke-[1.5px] shadow-lg" 
              />
              <text x="0" y="3" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{cleanLabelStr}</text>
              <text x={halfWidth - 10} y="-11" fill="#94a3b8" fontSize="8" className="opacity-0 group-hover/lbl:opacity-100 transition-opacity drop-shadow-md">✎</text>
            </g>
          </g>
        );
      };

      if (isBiDir) {
        return (
          <g key={edge.id}>
            {/* Forward Line: A to B, bowed (direction 1) */}
            {renderSinglePath(`${edge.id}-fwd`, srcNode, tgtNode, edge.label, edge.color, true, 1)}
            {/* Backward Line: B to A, bowed (direction 1, same direction is opposite coordinate system shift) */}
            {renderSinglePath(`${edge.id}-bwd`, tgtNode, srcNode, edge.targetLabel || '未定義', edge.targetColor || edge.color, true, 1)}
          </g>
        );
      } else {
        // Unidirectional
        const isForward = !edge.relationType || edge.relationType === 'forward';
        const fromNode = isForward ? srcNode : tgtNode;
        const toNode = isForward ? tgtNode : srcNode;
        return renderSinglePath(edge.id, fromNode, toNode, edge.label, edge.color, false, 0);
      }
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
        <svg 
          width={dimensions.width} 
          height={dimensions.height} 
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
          className="absolute inset-0 pointer-events-none z-0"
        >
          <defs>
            <marker id="arrow-forward" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1.5 L 10 5 L 0 8.5 Z" fill="currentColor" />
            </marker>
            <marker id="arrow-backward" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 Z" fill="currentColor" />
            </marker>
          </defs>
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
                        crossOrigin="anonymous"
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
                  className="absolute -top-2 -left-2 w-5 h-5 bg-red-500/80 hover:bg-red-500 border border-red-300/50 rounded-full text-[10px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 md:transition-opacity shadow-lg cursor-pointer animate-fade-in" 
                  onClick={(e) => removeNode(e, node.id)} 
                  onTouchEnd={(e) => { e.stopPropagation(); removeNode(e, node.id); }}
                >✕</button>
                <button 
                  className="absolute -top-2 -right-2 w-6 h-6 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-full text-[12px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 md:transition-opacity shadow-lg z-20 cursor-pointer animate-fade-in" 
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

        <div className="absolute top-4 right-4 z-20 bg-slate-900/80 p-2 rounded-lg border border-white/10 backdrop-blur-md flex gap-2 shadow-lg pointer-events-auto sidebar-ui items-center animate-fade-in">
          <div className="relative group/hint">
            <button className="text-xs text-amber-400 hover:text-amber-300 px-3 py-1.5 bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/20 rounded transition-colors cursor-help flex items-center gap-1 font-bold">
              <span>💡</span> 擷圖保存提示
            </button>
            <div className="absolute right-0 mt-2 w-64 bg-slate-950/95 border border-amber-500/30 rounded-lg shadow-2xl p-3 z-30 flex flex-col gap-1.5 backdrop-blur-xl opacity-0 pointer-events-none group-hover/hint:opacity-100 group-hover/hint:pointer-events-auto transition-opacity duration-200">
              <div className="text-[11px] text-amber-400 font-bold border-b border-white/10 pb-1 select-none">📸 使用原生擷圖可獲得最完美畫質</div>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                為避免圖片失真，建議您放大畫面直接使用系統自帶快捷鍵擷圖，即可獲得 100% 乾淨無瑕的向量箭頭與文字：
              </p>
              <div className="text-[10px] text-slate-400 space-y-1 mt-1 font-mono">
                <div>💻 <span className="text-cyan-300 font-bold">Windows:</span> Shift + Win + S</div>
                <div>🍎 <span className="text-emerald-300 font-bold">macOS:</span> Command + Shift + 4</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowArrangeMenu(!showArrangeMenu)} 
              className="text-xs text-cyan-400 hover:text-cyan-300 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded transition-colors cursor-pointer flex items-center gap-1 font-bold"
            >
              <span>🪄</span> 整理佈局
            </button>
            
            {showArrangeMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-950/95 border border-white/15 rounded-lg shadow-2xl p-1 z-30 flex flex-col gap-1 backdrop-blur-xl animate-fade-in animate-duration-200">
                <div className="px-2 py-1 text-[10px] text-slate-500 font-bold border-b border-white/5 uppercase select-none">選擇排序方式</div>
                <button 
                  onClick={() => arrangeLayout('force')}
                  className="w-full text-left text-xs px-3 py-2 rounded text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors cursor-pointer flex items-center gap-2"
                  title="依據角色的連線關係，自動拉近並排斥重疊節點"
                >
                  <span>⚡</span> 關係力導向排列
                </button>
                <button 
                  onClick={() => arrangeLayout('circular')}
                  className="w-full text-left text-xs px-3 py-2 rounded text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 transition-colors cursor-pointer flex items-center gap-2"
                  title="將角色均勻環繞成圓圈，適合觀察核心或同心圓關係"
                >
                  <span>🌀</span> 圓圈環狀排列
                </button>
                <button 
                  onClick={() => arrangeLayout('grid')}
                  className="w-full text-left text-xs px-3 py-2 rounded text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition-colors cursor-pointer flex items-center gap-2"
                  title="將角色整齊放置在網格矩陣中，方便清晰預覽"
                >
                  <span>🎴</span> 整齊網格排列
                </button>
              </div>
            )}
          </div>

          <button onClick={() => setOffset({x: 0, y: 0})} className="text-xs text-slate-300 hover:text-white px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded transition-colors cursor-pointer">📍 回原點</button>
          <button onClick={() => { setNodes([]); setEdges([]); }} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded transition-colors cursor-pointer">🗑️ 清空畫布</button>
        </div>
      </div>

      {(cpModal.isOpen || editingEdge) && (() => {
        const modalSourceId = editingEdge ? editingEdge.source : cpModal.source;
        const modalTargetId = editingEdge ? editingEdge.target : cpModal.target;
        const modalSourceNode = nodes.find(n => n.id === modalSourceId);
        const modalTargetNode = nodes.find(n => n.id === modalTargetId);
        const modalCharA = modalSourceNode ? (characters.find(c => c.id === modalSourceNode.charId) || npcs.find(c => c.id === modalSourceNode.charId)) : null;
        const modalCharB = modalTargetNode ? (characters.find(c => c.id === modalTargetNode.charId) || npcs.find(c => c.id === modalTargetNode.charId)) : null;
        const modalNameA = modalCharA?.name || '角色 A';
        const modalNameB = modalCharB?.name || '角色 B';
        const relType = editingEdge ? (editingEdge.relationType || 'forward') : cpModal.relationType;

        return (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto sidebar-ui">
            <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 w-[420px] max-w-full shadow-2xl animate-fade-in">
              <h3 className="text-xl font-bold text-cyan-400 mb-4 border-b border-white/10 pb-2 flex items-center gap-2" style={{ fontFamily: "'Orbitron', 'Noto Serif TC', serif" }}>
                <span>{editingEdge ? '✏️' : '🔗'}</span>
                <span>{editingEdge ? '編輯羈絆關係' : '定義羈絆關係'}</span>
              </h3>

              {/* Direction selector */}
              <div className="mb-5">
                <label className="block text-xs text-slate-400 mb-1.5 font-bold">連線箭頭與關係方向</label>
                <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded border border-white/10">
                  <button 
                    type="button"
                    onClick={() => {
                      if (editingEdge) {
                        setEditingEdge({ ...editingEdge, relationType: 'forward' });
                      } else {
                        setCpModal({ ...cpModal, relationType: 'forward' });
                      }
                    }}
                    className={`text-[10px] md:text-xs py-2 rounded transition-all font-bold cursor-pointer ${relType === 'forward' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-extrabold shadow-sm' : 'text-slate-400 border border-transparent hover:text-white'}`}
                  >
                    單向 (A ➔ B)
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (editingEdge) {
                        setEditingEdge({ ...editingEdge, relationType: 'backward' });
                      } else {
                        setCpModal({ ...cpModal, relationType: 'backward' });
                      }
                    }}
                    className={`text-[10px] md:text-xs py-2 rounded transition-all font-bold cursor-pointer ${relType === 'backward' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-extrabold shadow-sm' : 'text-slate-400 border border-transparent hover:text-white'}`}
                  >
                    單向 (B ➔ A)
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (editingEdge) {
                        setEditingEdge({ ...editingEdge, relationType: 'bidirectional' });
                      } else {
                        setCpModal({ ...cpModal, relationType: 'bidirectional' });
                      }
                    }}
                    className={`text-[10px] md:text-xs py-2 rounded transition-all font-bold cursor-pointer ${relType === 'bidirectional' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-extrabold shadow-sm' : 'text-slate-400 border border-transparent hover:text-white'}`}
                  >
                    雙向各自不同
                  </button>
                </div>
              </div>

              {relType === 'bidirectional' ? (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: editingEdge ? editingEdge.color : cpModal.color }}></span>
                      <span><span className="text-cyan-400 font-bold">{modalNameA}</span> 對 <span className="text-slate-300 font-bold">{modalNameB}</span> 的感覺：</span>
                    </label>
                    <input 
                      type="text" 
                      value={editingEdge ? editingEdge.label : cpModal.label} 
                      onChange={e => editingEdge ? setEditingEdge({...editingEdge, label: e.target.value}) : setCpModal({...cpModal, label: e.target.value})} 
                      placeholder="例如：仰慕、最好的朋友" 
                      className="w-full bg-black/40 border border-white/20 rounded-lg p-2.5 text-white outline-none focus:border-cyan-500 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: editingEdge ? (editingEdge.targetColor || '#10b981') : cpModal.targetColor }}></span>
                      <span><span className="text-emerald-400 font-bold">{modalNameB}</span> 對 <span className="text-slate-300 font-bold">{modalNameA}</span> 的感覺：</span>
                    </label>
                    <input 
                      type="text" 
                      value={editingEdge ? (editingEdge.targetLabel ?? '') : cpModal.targetLabel} 
                      onChange={e => editingEdge ? setEditingEdge({...editingEdge, targetLabel: e.target.value}) : setCpModal({...cpModal, targetLabel: e.target.value})} 
                      placeholder="例如：死對頭、宿敵、暗戀" 
                      className="w-full bg-black/40 border border-white/20 rounded-lg p-2.5 text-white outline-none focus:border-cyan-500 text-sm" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-black/30 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-[11px] text-slate-400 font-bold">A➔B 線條顏色</span>
                      <input 
                        type="color" 
                        value={editingEdge ? editingEdge.color : cpModal.color} 
                        onChange={e => editingEdge ? setEditingEdge({...editingEdge, color: e.target.value}) : setCpModal({...cpModal, color: e.target.value})} 
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" 
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-[11px] text-slate-400 font-bold">B➔A 線條顏色</span>
                      <input 
                        type="color" 
                        value={editingEdge ? (editingEdge.targetColor || '#10b981') : cpModal.targetColor} 
                        onChange={e => editingEdge ? setEditingEdge({...editingEdge, targetColor: e.target.value}) : setCpModal({...cpModal, targetColor: e.target.value})} 
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-bold">
                      {relType === 'forward' ? (
                        <span>💡 <span className="text-cyan-400">{modalNameA}</span> 對 <span className="text-slate-200">{modalNameB}</span> 的關係：</span>
                      ) : (
                        <span>💡 <span className="text-emerald-400">{modalNameB}</span> 對 <span className="text-slate-200">{modalNameA}</span> 的關係：</span>
                      )}
                    </label>
                    <input 
                      type="text" 
                      value={editingEdge ? editingEdge.label : cpModal.label} 
                      onChange={e => editingEdge ? setEditingEdge({...editingEdge, label: e.target.value}) : setCpModal({...cpModal, label: e.target.value})} 
                      placeholder="例如：親友、死黨、宿敵" 
                      className="w-full bg-black/40 border border-white/20 rounded-lg p-2.5 text-white outline-none focus:border-cyan-500 text-sm" 
                      autoFocus 
                    />
                  </div>
                  <div className="flex gap-4 items-center bg-black/30 p-3 rounded-xl border border-white/5 justify-between">
                    <span className="text-xs text-slate-400 font-bold">關係線條色彩</span>
                    <input 
                      type="color" 
                      value={editingEdge ? editingEdge.color : cpModal.color} 
                      onChange={e => editingEdge ? setEditingEdge({...editingEdge, color: e.target.value}) : setCpModal({...cpModal, color: e.target.value})} 
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" 
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                {editingEdge && (
                  <button 
                    onClick={deleteEdge} 
                    className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors mr-auto cursor-pointer font-bold"
                  >
                    刪除連線
                  </button>
                )}
                <button 
                  onClick={() => editingEdge ? setEditingEdge(null) : setCpModal({...cpModal, isOpen: false, source: null, target: null})} 
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white cursor-pointer"
                >
                  取消
                </button>
                <button 
                  onClick={editingEdge ? saveEdgeEdit : confirmEdge} 
                  className="px-6 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold shadow-[0_0_15px_rgba(34,211,238,0.5)] cursor-pointer"
                >
                  {editingEdge ? '更新儲存' : '建立連線'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
    </div>
  );
}
