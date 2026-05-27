import React, { useState, useEffect } from 'react';
import { Character, CPEntity } from './types';
import { defaultCharacter, defaultNPCs, questions } from './constants';
import CharacterEditor from './components/CharacterEditor';
import NexusCanvas from './components/NexusCanvas';
import localforage from 'localforage';

export default function App() {
  const [view, setView] = useState<string>('dashboard'); 
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [editingType, setEditingType] = useState<string>('pc'); 

  const [characters, setCharacters] = useState<Character[]>([]);
  const [npcs, setNpcs] = useState<Character[]>([]);
  const [cpSettings, setCpSettings] = useState<CPEntity[]>([]);
  
  const [isCpModalOpen, setIsCpModalOpen] = useState(false);
  const [editingCp, setEditingCp] = useState<CPEntity | null>(null); 
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); 
  const [showNpcs, setShowNpcs] = useState(false); 
  const [rosterTab, setRosterTab] = useState<'pc' | 'friend' | 'npc'>('pc'); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Custom premium Toast and Confirm Modal states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; name: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm });
  };

  useEffect(() => {
    const initData = async () => {
      const savedChars = await localforage.getItem<Character[]>('nexus_universe_chars');
      const savedNpcs = await localforage.getItem<Character[]>('nexus_universe_npcs');
      const savedCPs = await localforage.getItem<CPEntity[]>('nexus_universe_cps');
      const tutorialSeen = await localforage.getItem<string>('nexus_tutorial_seen');
      
      if (savedChars) setCharacters(savedChars);
      if (savedCPs) setCpSettings(savedCPs);
      
      if (savedNpcs) {
        // Automatically sync predefined NPC templates with the latest code definition (forces blank state for defaults)
        const defaultNpcIds = defaultNPCs.map(n => n.id);
        const mergedNpcs = [
          ...defaultNPCs,
          ...savedNpcs.filter(n => !defaultNpcIds.includes(n.id))
        ];
        setNpcs(mergedNpcs);
      } else {
        setNpcs(defaultNPCs); 
      }

      if (!tutorialSeen) {
        setIsTutorialOpen(true);
      }
      setIsDataLoaded(true);
    };
    initData();
  }, []);

  useEffect(() => {
    if (isDataLoaded) {
      const saveData = async () => {
        await localforage.setItem('nexus_universe_chars', characters);
        await localforage.setItem('nexus_universe_npcs', npcs);
        await localforage.setItem('nexus_universe_cps', cpSettings);
      };
      saveData();
    }
  }, [characters, npcs, cpSettings, isDataLoaded]);

  const openEditor = (char: Character | null = null, type = 'pc') => {
    setEditingChar(char);
    setEditingType(type);
    setView('editor');
  };

  const saveCharacter = (data: Character) => {
    if (editingType === 'npc') {
      const exists = npcs.some(c => c.id === data.id);
      if (exists && editingChar) {
        setNpcs(npcs.map(c => c.id === data.id ? data : c));
      } else {
        const newId = data.id && data.id.startsWith('npc_') ? data.id : `npc_${Date.now()}`;
        setNpcs([...npcs, { ...data, id: newId, isNPC: true }]);
      }
    } else {
      const exists = characters.some(c => c.id === data.id);
      if (exists && editingChar) {
        setCharacters(characters.map(c => c.id === data.id ? data : c));
      } else {
        const isFriend = editingType === 'friend';
        const newId = data.id && data.id.startsWith('char_') ? data.id : `char_${Date.now()}`;
        setCharacters([...characters, { ...data, id: newId, isNPC: false, isImported: isFriend }]);
      }
    }
    setView('dashboard');
  };

  const deleteCharacter = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    showConfirm('確定要刪除這個角色檔案嗎？此動作無法復原。', () => {
      setCharacters(characters.filter(c => c.id !== id));
      setCpSettings(cpSettings.filter(cp => cp.charAId !== id && cp.charBId !== id));
    });
  };

  const deleteNpc = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    showConfirm('確定要從官方 NPC 名單中刪除該角色嗎？', () => {
      setNpcs(npcs.filter(c => c.id !== id));
      setCpSettings(cpSettings.filter(cp => cp.charAId !== id && cp.charBId !== id));
    });
  };

  const ImportCharacterModal = () => {
    const [importText, setImportText] = useState('');

    const handleImport = () => {
      if (!importText.includes('【艾歐澤亞冒險者銘牌】') && !importText.includes('【艾奧傑亞冒險者銘牌】')) {
        showToast('格式不符！請確保貼上的是由本系統「複製文字版」匯出的純文字內容。');
        return;
      }

      try {
        const char: Character = { 
          ...defaultCharacter, 
          id: `char_${Date.now()}`, 
          isImported: true,
          radarStats: [...defaultCharacter.radarStats]
        } as Character; 
        
        const extractField = (label: string, defaultVal = '') => {
          const regex = new RegExp(`${label}：(.*)`);
          const match = importText.match(regex);
          const val = match ? match[1].trim() : defaultVal;
          return (val === '-' || val === '未設定' || val === '無') ? '' : val;
        };

        const extractMultiline = (startMarker: string) => {
          const regex = new RegExp(`${startMarker}\\n([\\s\\S]*?)(?=\\n\\n◆|$)`);
          const match = importText.match(regex);
          if (match) {
            const val = match[1].trim();
            return val === '尚未填寫...' ? '' : val;
          }
          return '';
        };

        char.name = extractField('名稱');
        char.race = extractField('種族');
        char.gender = extractField('性別');
        char.age = extractField('年齡');
        char.orientation = extractField('性取向');
        char.spouse = extractField('配偶/締結者');
        char.tags = extractField('關鍵 TAG');
        char.temperature = extractField('體溫');
        char.strength = extractField('力氣');
        char.dominantHand = extractField('慣用手', '右撇子');
        char.eyesight = extractField('視力狀況');
        char.healthStatus = extractField('健康狀況');
        char.physicalNotes = extractField('特徵補充');
        char.mbti = extractField('MBTI');
        char.likes = extractField('喜歡的事物');
        char.dislikes = extractField('討厭的事物');
        char.strengths = extractField('擅長/不擅長');
        char.habits = extractField('日常習慣');
        char.catchphrase = extractField('口頭禪');

        const themeColorMatch = importText.match(/代表色：(#[\w\d]+)/);
        if (themeColorMatch) char.themeColor = themeColorMatch[1];

        const hwMatch = importText.match(/身高\/體重：(.*) \/ (.*)/);
        if (hwMatch) {
          char.height = hwMatch[1].trim() === '-' ? '' : hwMatch[1].trim();
          char.weight = hwMatch[2].trim() === '-' ? '' : hwMatch[2].trim();
        }

        const heMatch = importText.match(/髮色\/瞳色：(.*) \/ (.*)/);
        if (heMatch) {
          char.hairColor = heMatch[1].trim() === '-' ? '' : heMatch[1].trim();
          char.eyeColor = heMatch[2].trim() === '-' ? '' : heMatch[2].trim();
        }

        char.backstory = extractMultiline('◆ 背景故事');
        
        const perMatch = importText.match(/個性簡述：\n([\s\S]*?)(?=\n\n◆|$)/);
        if (perMatch) {
          const per = perMatch[1].trim();
          char.personality = per === '尚未填寫...' ? '' : per;
        }

        const rsMatch = importText.match(/◆ 六維能力面板\n(.*)/);
        if (rsMatch) {
          const parts = rsMatch[1].split('|');
          if (parts.length === 6) {
             char.radarStats = parts.map(p => {
               const [name, val] = p.split(':');
               return { name: name ? name.trim() : '', value: parseInt(val ? val.trim() : '60', 10) || 60 };
             });
          }
        }

        setEditingType('friend');
        saveCharacter(char);
        setRosterTab('friend');
        setIsImportModalOpen(false);
        showToast(`✅ 成功匯入好友角色檔案：${char.name || '未命名角色'}！`);

      } catch (err) {
        console.error(err);
        showToast('匯入解析失敗，文字格式可能遭到損壞。');
      }
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
          <h2 className="text-xl font-bold text-cyan-400 mb-2 border-b border-white/10 pb-4 flex items-center gap-2" style={{ fontFamily: "'Orbitron', 'Noto Serif TC', serif" }}>
            <span>📥</span> 匯入純文字設定
          </h2>
          <p className="text-sm text-slate-400 mb-4">請將您或朋友從「📋 複製文字版」匯出的【艾奧傑亞冒險者銘牌】完整文字貼在下方，系統將自動為您解析並生成角色資料卡。</p>
          
          <textarea 
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="貼上文字內容..."
            className="flex-1 w-full bg-black/40 border border-white/20 rounded p-4 text-slate-300 outline-none focus:border-cyan-500 resize-none custom-scrollbar text-sm font-mono leading-relaxed"
          />
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
            <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">取消</button>
            <button onClick={handleImport} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all cursor-pointer">解析並匯入</button>
          </div>
        </div>
      </div>
    );
  };

  const CPEditorModal = () => {
    const [cpData, setCpData] = useState<Omit<CPEntity, 'id'>>(
      editingCp ? {
        charAId: editingCp.charAId,
        charBId: editingCp.charBId,
        relation: editingCp.relation,
        type: editingCp.type,
        color: editingCp.color
      } : { 
        charAId: '', 
        charBId: '', 
        relation: '', 
        type: '相方 (CP)', 
        color: '#ec4899' 
      }
    );
    
    const allChars = [...characters, ...npcs];

    const handleCpSave = () => {
      if (!cpData.charAId || !cpData.charBId) {
        showToast('必須選擇兩名角色！');
        return;
      }
      if (cpData.charAId === cpData.charBId) {
        showToast('不能與自己締結關係！');
        return;
      }
      
      const charA = allChars.find(c => c.id === cpData.charAId)?.name || '未知角色';
      const charB = allChars.find(c => c.id === cpData.charBId)?.name || '未知角色';
      
      if (editingCp) {
        setCpSettings(cpSettings.map(c => c.id === editingCp.id ? { ...cpData, id: editingCp.id, charAName: charA, charBName: charB } : c));
      } else {
        setCpSettings([...cpSettings, { ...cpData, id: Date.now().toString(), charAName: charA, charBName: charB }]);
      }
      setIsCpModalOpen(false);
      setEditingCp(null);
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-pink-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-pink-400 mb-6 border-b border-white/10 pb-2" style={{ fontFamily: "'Orbitron', 'Noto Serif TC', serif" }}>
            {editingCp ? '✏️ 編輯羈絆檔案' : '💞 締結新關係'}
          </h2>
          <div className="space-y-4 mb-8">
            <div className="flex gap-4">
              <select className="flex-1 bg-black/40 border border-white/10 rounded p-2 text-white outline-none text-sm cursor-pointer" value={cpData.charAId} onChange={e => setCpData({...cpData, charAId: e.target.value})}>
                <option value="">選擇角色 A...</option>
                {allChars.map(c => <option key={c.id} value={c.id}>{c.name || '未命名'} {c.isNPC ? '(NPC)' : ''}</option>)}
              </select>
              <select className="flex-1 bg-black/40 border border-white/10 rounded p-2 text-white outline-none text-sm cursor-pointer" value={cpData.charBId} onChange={e => setCpData({...cpData, charBId: e.target.value})}>
                <option value="">選擇角色 B...</option>
                {allChars.map(c => <option key={c.id} value={c.id}>{c.name || '未命名'} {c.isNPC ? '(NPC)' : ''}</option>)}
              </select>
            </div>
            <input type="text" placeholder="關係描述 (例如：救贖與被救贖)" className="w-full bg-black/40 border border-white/10 rounded p-2 text-white outline-none" value={cpData.relation} onChange={e => setCpData({...cpData, relation: e.target.value})} />
            <div className="flex gap-4">
              <input type="text" placeholder="關係標籤 (例如：宿敵)" className="flex-1 bg-black/40 border border-white/10 rounded p-2 text-white outline-none" value={cpData.type} onChange={e => setCpData({...cpData, type: e.target.value})} />
              <input type="color" className="w-10 h-10 rounded cursor-pointer p-0 bg-transparent border border-white/10" value={cpData.color} onChange={e => setCpData({...cpData, color: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setIsCpModalOpen(false); setEditingCp(null); }} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">取消</button>
            <button onClick={handleCpSave} className="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold shadow-[0_0_15px_rgba(236,72,153,0.5)] cursor-pointer">
              {editingCp ? '更新羈絆' : '確立羈絆'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const [currentQuestion, setCurrentQuestion] = useState("點擊下方按鈕，抽取一個靈魂拷問來測試你的角色吧！");
  const [isAnimating, setIsAnimating] = useState(false);

  const drawQuestion = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentQuestion(questions[Math.floor(Math.random() * questions.length)]);
      setIsAnimating(false);
    }, 400);
  };

  const closeTutorial = () => {
    setIsTutorialOpen(false);
    localforage.setItem('nexus_tutorial_seen', 'true');
  };

  const TutorialModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-cyan-900/30 to-transparent">
          <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-3" style={{ fontFamily: "'Orbitron', 'Noto Serif TC', serif" }}>
            <span>✨</span> 歡迎來到 RP 宇宙
          </h2>
          <p className="text-slate-400 mt-2 text-sm">初次見面，光之戰士！這是一份給您的系統導覽指南。</p>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 text-slate-300 text-sm leading-relaxed">
          <div className="flex gap-4">
            <div className="text-3xl">📖</div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">第一步：建立冒險者名冊</h3>
              <p>在左側的「冒險者名冊」中點擊 <strong className="text-cyan-400">+ 創建新角色</strong>。您可以為角色設定詳細的背景故事、六維能力雷達圖，甚至上傳角色大頭貼。完成後還能一鍵複製純文字格式分享給朋友！</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-3xl">🕸️</div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">第二步：編織關係網</h3>
              <p>點擊右下角的 <strong className="text-cyan-400">開啟全景畫布</strong> 進入視覺化關係網。將左側的角色拖曳到畫布中，按住角色右側的「發光圓點」並拉向另一個角色，即可締結羈絆（例如：相方、宿敵）。</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-3xl">💞</div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">第三步：管理專屬 CP 設定</h3>
              <p>所有的雙人羈絆連線都會同步收錄到首頁的「專屬 CP / 雙人檔案」區塊。您可以在此總覽所有關係，或手動「締結新關係」。</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-3xl">📝</div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">第四步：隨寫私人備註</h3>
              <p>在「全景畫布」模式中，游標移到角色卡片上點擊右上角的 <strong className="text-slate-100 bg-slate-700 px-2 py-0.5 rounded">✎</strong>，就能為該角色撰寫只限這個畫布的私人備註或隱藏設定！</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-3xl">🗄️</div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">全新：無限本地儲存</h3>
              <p>系統已升級至 IndexedDB 儲存引擎。您上傳的高畫質圖片與所有設定，都會<strong className="text-amber-400">自動且永久地</strong>儲存在您的瀏覽器中，無懼容量限制！</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-white/10 bg-black/30 flex justify-end">
          <button onClick={closeTutorial} className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all active:scale-95 cursor-pointer">
            了解，開始創造世界！
          </button>
        </div>
      </div>
    </div>
  );

  const filterBySearch = (char: Character) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (char.name && char.name.toLowerCase().includes(lowerQuery)) ||
      (char.race && char.race.toLowerCase().includes(lowerQuery)) ||
      (char.tags && char.tags.toLowerCase().includes(lowerQuery))
    );
  };

  const filteredMyChars = characters.filter(c => !c.isImported && filterBySearch(c));
  const filteredImportedChars = characters.filter(c => c.isImported && filterBySearch(c));
  const filteredNpcs = npcs.filter(filterBySearch);

  if (!isDataLoaded) {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-cyan-400 font-bold tracking-widest animate-pulse" style={{ fontFamily: "'Orbitron', sans-serif" }}>INITIALIZING NEXUS...</div>;
  }

  if (view === 'editor') {
    return <CharacterEditor initialData={editingChar} onSave={saveCharacter} onCancel={() => setView('dashboard')} />;
  }
  if (view === 'nexus') {
    return (
      <NexusCanvas 
        characters={characters} 
        npcs={npcs} 
        showNpcs={showNpcs} 
        setShowNpcs={setShowNpcs} 
        deleteNpc={deleteNpc} 
        onCancel={() => setView('dashboard')} 
      />
    );
  }

  return (
    <div className="min-h-screen font-sans text-slate-200 overflow-y-auto custom-scrollbar relative selection:bg-cyan-500/30" style={{ backgroundColor: '#020617', backgroundImage: 'radial-gradient(circle at 50% 0%, #1e1b4b 0%, #020617 70%)' }}>
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-10 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold mb-2 flex items-center gap-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" style={{ fontFamily: "'Orbitron', 'Noto Serif TC', serif" }}>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-blue-400">RP 宇宙</span>
              <span className="text-xl md:text-2xl text-slate-500 font-normal tracking-widest hidden sm:inline-block">Universe Hub</span>
            </h1>
            <p className="text-slate-400 tracking-wider text-sm md:text-base">收錄你的原創角色、CP 設定與世界觀筆記的總控中心。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-6 md:mt-0 w-full md:w-auto">
            <button onClick={() => setIsTutorialOpen(true)} className="flex-1 md:flex-none px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg backdrop-blur-md transition-all flex items-center justify-center gap-2 text-amber-300 shadow-sm text-sm md:text-base cursor-pointer">
              <span>💡</span> 使用教學
            </button>
            <button className="flex-1 md:flex-none px-4 md:px-6 py-2.5 bg-white/5 border border-white/10 rounded-lg backdrop-blur-md transition-all flex items-center justify-center gap-2 text-cyan-300 shadow-sm cursor-default text-sm md:text-base whitespace-nowrap">
              <span>🗄️</span> 資料已存入 IndexedDB
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6 md:gap-8">
            
            <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none"></div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 relative z-10">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3 shrink-0" style={{ fontFamily: "'Orbitron', 'Noto Serif TC', serif" }}>
                  <span className="text-cyan-400">📖</span> 冒險者名冊 
                  <span className="text-[10px] md:text-xs bg-white/10 px-2 py-1 rounded text-slate-400 font-normal font-sans tracking-widest">{characters.length + npcs.length} 名</span>
                </h2>
                
                <div className="w-full sm:w-64 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                  <input 
                    type="text" 
                    placeholder="搜尋名稱、種族或 TAG..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 relative z-10 border-b border-white/10 pb-4">
                <div className="flex bg-black/40 rounded-lg p-1 w-full sm:w-auto">
                  <button onClick={() => setRosterTab('pc')} className={`flex-1 sm:flex-none px-4 text-sm py-1.5 rounded transition-colors font-bold cursor-pointer ${rosterTab === 'pc' ? 'bg-white/10 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>光之戰士</button>
                  <button onClick={() => setRosterTab('friend')} className={`flex-1 sm:flex-none px-4 text-sm py-1.5 rounded transition-colors font-bold cursor-pointer ${rosterTab === 'friend' ? 'bg-white/10 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>好友名單</button>
                  <button onClick={() => setRosterTab('npc')} className={`flex-1 sm:flex-none px-4 text-sm py-1.5 rounded transition-colors font-bold cursor-pointer ${rosterTab === 'npc' ? 'bg-white/10 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}>官方 NPC</button>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                  {rosterTab === 'pc' && (
                    <>
                      <button onClick={() => setIsImportModalOpen(true)} className="flex-1 sm:flex-none text-sm px-4 py-2 bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-600 font-bold whitespace-nowrap cursor-pointer">📥 匯入文字</button>
                      <button onClick={() => openEditor(null, 'pc')} className="flex-1 sm:flex-none text-sm px-4 py-2 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 rounded-lg transition-colors border border-cyan-500/30 font-bold whitespace-nowrap cursor-pointer">+ 創建新角色</button>
                    </>
                  )}
                  {rosterTab === 'friend' && (
                    <>
                      <button onClick={() => setIsImportModalOpen(true)} className="flex-1 sm:flex-none text-sm px-4 py-2 bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-600 font-bold whitespace-nowrap cursor-pointer">📥 匯入好友</button>
                      <button onClick={() => openEditor(null, 'friend')} className="flex-1 sm:flex-none text-sm px-4 py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 rounded-lg transition-colors border border-emerald-500/30 font-bold whitespace-nowrap cursor-pointer">+ 創建好友角色</button>
                    </>
                  )}
                  {rosterTab === 'npc' && (
                    <button onClick={() => openEditor(null, 'npc')} className="flex-1 sm:flex-none text-sm px-4 py-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 rounded-lg transition-colors border border-amber-500/30 font-bold whitespace-nowrap cursor-pointer">+ 新增 NPC</button>
                  )}
                </div>
              </div>

              {rosterTab === 'pc' && (
                filteredMyChars.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-white/20 rounded-xl text-slate-500 bg-black/20 animate-fade-in text-sm md:text-base">目前還沒有角色，點擊上方按鈕開始創造吧！</div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                    {filteredMyChars.length > 0 && (
                      <div>
                        <h3 className="text-sm text-cyan-500 mb-3 border-b border-cyan-500/20 pb-1 font-bold flex items-center gap-2">
                          <span>👤</span> 我的原創角色
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                          {filteredMyChars.map(char => (
                            <div key={char.id} onClick={() => openEditor(char, 'pc')} className="bg-gradient-to-br from-black/40 to-black/20 border border-white/10 hover:border-cyan-500/30 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] group/card relative">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div 
                                  onClick={(e) => {
                                    if (char.imageUrl) {
                                      e.stopPropagation();
                                      setLightboxImage({ src: char.imageUrl, name: char.name || '未命名角色' });
                                    }
                                  }}
                                  className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] shrink-0 overflow-hidden ${char.imageUrl ? 'cursor-zoom-in hover:scale-105 transition-transform' : ''}`} 
                                  style={{ borderColor: char.themeColor, backgroundColor: `${char.themeColor}20` }}
                                  title={char.imageUrl ? "點擊查看完整照片" : ""}
                                >
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
                                  ) : <span className="text-slate-300">👤</span>}
                                </div>
                                <div className="overflow-hidden flex-1">
                                  <h3 className="font-bold text-slate-100 text-sm md:text-base truncate">{char.name || '未命名角色'}</h3>
                                  <p className="text-[10px] md:text-xs text-slate-400 truncate">{char.race || '種族不明'} | {char.gender || '性別不明'}</p>
                                  <div className="mt-1.5 md:mt-2 text-[10px] text-cyan-300 truncate opacity-70 group-hover/card:opacity-100 transition-opacity">🏷️ {char.tags || '無標籤'}</div>
                                </div>
                              </div>
                              <button onClick={(e) => deleteCharacter(e, char.id)} className="absolute top-2 right-2 w-6 h-6 bg-red-500/20 hover:bg-red-500 text-red-200 rounded text-xs opacity-0 group-hover/card:opacity-100 transition-all flex items-center justify-center cursor-pointer" title="刪除角色">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {rosterTab === 'friend' && (
                filteredImportedChars.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-white/20 rounded-xl text-slate-500 bg-black/20 animate-fade-in text-sm md:text-base flex flex-col items-center justify-center gap-3">
                    <p>目前好友名單中還沒有角色。</p>
                    <div className="flex gap-2">
                      <button onClick={() => setIsImportModalOpen(true)} className="text-xs px-4 py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 rounded-lg transition-colors border border-emerald-500/30 font-bold cursor-pointer">📥 匯入好友檔案</button>
                      <button onClick={() => openEditor(null, 'friend')} className="text-xs px-4 py-2 bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-600 font-bold cursor-pointer">+ 新增好友角色</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                    {filteredImportedChars.length > 0 && (
                      <div>
                        <h3 className="text-sm text-emerald-500 mb-3 border-b border-emerald-500/20 pb-1 font-bold flex items-center gap-2">
                          <span>👥</span> 好友名單 (他人的角色)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                          {filteredImportedChars.map(char => (
                            <div key={char.id} onClick={() => openEditor(char, 'friend')} className="bg-gradient-to-br from-black/40 to-black/20 border border-white/10 hover:border-emerald-500/30 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] group/card relative">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div 
                                  onClick={(e) => {
                                    if (char.imageUrl) {
                                      e.stopPropagation();
                                      setLightboxImage({ src: char.imageUrl, name: char.name || '未命名角色' });
                                    }
                                  }}
                                  className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] shrink-0 overflow-hidden ${char.imageUrl ? 'cursor-zoom-in hover:scale-105 transition-transform' : ''}`} 
                                  style={{ borderColor: char.themeColor, backgroundColor: `${char.themeColor}20` }}
                                  title={char.imageUrl ? "點擊查看完整照片" : ""}
                                >
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
                                  ) : <span className="text-slate-300">👤</span>}
                                </div>
                                <div className="overflow-hidden flex-1">
                                  <h3 className="font-bold text-slate-100 text-sm md:text-base truncate flex items-center gap-1">
                                    {char.name || '未命名角色'} <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded border border-emerald-500/30">好友</span>
                                  </h3>
                                  <p className="text-[10px] md:text-xs text-slate-400 truncate">{char.race || '種族不明'} | {char.gender || '性別不明'}</p>
                                  <div className="mt-1.5 md:mt-2 text-[10px] text-cyan-300 truncate opacity-70 group-hover/card:opacity-100 transition-opacity">🏷️ {char.tags || '無標籤'}</div>
                                </div>
                              </div>
                              <button onClick={(e) => deleteCharacter(e, char.id)} className="absolute top-2 right-2 w-6 h-6 bg-red-500/20 hover:bg-red-500 text-red-200 rounded text-xs opacity-0 group-hover/card:opacity-100 transition-all flex items-center justify-center cursor-pointer" title="刪除角色">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {rosterTab === 'npc' && (
                !showNpcs ? (
                  <div className="bg-amber-900/20 border border-amber-500/50 rounded-xl p-8 text-center shadow-lg mt-2 animate-fade-in">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h3 className="text-amber-500 font-bold text-lg md:text-xl mb-2">防雷警告</h3>
                    <p className="text-xs md:text-sm text-slate-400 mb-6 leading-relaxed max-w-md mx-auto">
                      官方 NPC 名單可能包含後續版本的主線劇情與角色關聯暴雷，<br/>建議您通關最新主線後再行閱覽。
                    </p>
                    <button onClick={() => setShowNpcs(true)} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all cursor-pointer text-xs md:text-sm">
                      我已了解，展開名單
                    </button>
                  </div>
                ) : filteredNpcs.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">找不到符合條件的 NPC。</div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-end gap-2 mb-4">
                      <button onClick={() => openEditor(null, 'npc')} className="w-full sm:w-auto text-xs px-4 py-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 rounded-lg transition-colors border border-amber-500/30 font-bold cursor-pointer">+ 新增 NPC</button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                      {filteredNpcs.map(char => (
                        <div key={char.id} onClick={() => openEditor(char, 'npc')} className="bg-gradient-to-br from-black/40 to-black/20 border border-white/10 hover:border-amber-500/30 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] group/card relative">
                          <div className="flex items-center gap-3 md:gap-4">
                            <div 
                              onClick={(e) => {
                                if (char.imageUrl) {
                                  e.stopPropagation();
                                  setLightboxImage({ src: char.imageUrl, name: char.name || '未命名角色' });
                                }
                              }}
                              className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] shrink-0 overflow-hidden ${char.imageUrl ? 'cursor-zoom-in hover:scale-105 transition-transform' : ''}`} 
                              style={{ borderColor: char.themeColor, backgroundColor: `${char.themeColor}20` }}
                              title={char.imageUrl ? "點擊查看完整照片" : ""}
                            >
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
                              ) : <span className="text-slate-300">👤</span>}
                            </div>
                            <div className="overflow-hidden flex-1">
                              <h3 className="font-bold text-slate-100 text-sm md:text-base truncate flex items-center gap-1">
                                {char.name || '未命名'} <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1 rounded border border-amber-500/30">NPC</span>
                              </h3>
                              <p className="text-[10px] md:text-xs text-slate-400 truncate">{char.race || '種族不明'}</p>
                              <div className="mt-1.5 md:mt-2 text-[10px] text-amber-300/80 truncate opacity-70 group-hover/card:opacity-100 transition-opacity">🏷️ {char.tags || '無標籤'}</div>
                            </div>
                          </div>
                          <button onClick={(e) => deleteNpc(e, char.id)} className="absolute top-2 right-2 w-6 h-6 bg-red-500/20 hover:bg-red-500 text-red-200 rounded text-xs opacity-0 group-hover/card:opacity-100 transition-all flex items-center justify-center cursor-pointer" title="刪除 NPC">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </section>

            <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-[50px] pointer-events-none"></div>
              <div className="flex justify-between items-center mb-6 relative z-10 gap-2">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3 shrink-0" style={{ fontFamily: "'Orbitron', 'Noto Serif TC', serif" }}>
                  <span className="text-pink-400">💞</span> 專屬 CP / 雙人檔案
                </h2>
                <button onClick={() => { setEditingCp(null); setIsCpModalOpen(true); }} className="text-xs md:text-sm px-4 py-2 bg-pink-500/20 text-pink-300 hover:bg-pink-500/40 rounded-lg transition-colors border border-pink-500/30 font-bold cursor-pointer">+ 締結新關係</button>
              </div>

              {cpSettings.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/20 rounded-xl text-slate-500 bg-black/20 text-xs md:text-sm">建立兩名以上的角色後，即可在此締結羈絆關係。</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 animate-fade-in">
                  {cpSettings.map(cp => (
                    <div key={cp.id} className="bg-gradient-to-br from-black/40 to-black/10 border border-white/10 hover:border-white/30 rounded-xl p-4 md:p-5 relative group/cp transition-all">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] md:text-xs px-2 py-1 rounded border font-bold tracking-wider" style={{ borderColor: `${cp.color}50`, color: cp.color, backgroundColor: `${cp.color}10` }}>{cp.type}</span>
                        <div className="flex gap-2 opacity-0 group-hover/cp:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingCp(cp); setIsCpModalOpen(true); }} className="text-[11px] text-slate-500 hover:text-cyan-400 cursor-pointer">編輯</button>
                          <button onClick={() => setCpSettings(cpSettings.filter(c => c.id !== cp.id))} className="text-[11px] text-slate-500 hover:text-red-400 cursor-pointer">解約</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-sm md:text-base font-bold text-slate-200">
                        <span className="truncate flex-1">{cp.charAName}</span>
                        <span className="text-slate-600 text-xs shrink-0">✖</span>
                        <span className="truncate flex-1 text-right">{cp.charBName}</span>
                      </div>
                      <p className="text-[11px] md:text-xs text-slate-400 mt-2 italic">「{cp.relation}」</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-6 md:gap-8">
            <section className="bg-gradient-to-b from-purple-900/40 to-black/40 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4 md:p-6 shadow-xl text-center flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-[-30px] right-[-30px] md:top-[-50px] md:right-[-50px] text-6xl md:text-8xl opacity-5 pointer-events-none">❓</div>
              <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center justify-center gap-2 text-purple-300" style={{ fontFamily: "'Orbitron', 'Noto Serif TC', serif" }}>
                <span>🔮</span> 角色靈魂拷問
              </h2>
              <div className="flex-1 flex items-center justify-center p-3 md:p-4 bg-black/40 rounded-xl border border-white/5 mb-4 md:mb-6 min-h-[100px] md:min-h-[120px]">
                <p className={`text-slate-200 text-sm md:text-base leading-relaxed transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{currentQuestion}</p>
              </div>
              <button onClick={drawQuestion} disabled={isAnimating} className="w-full py-2.5 md:py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs md:text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] active:scale-95 cursor-pointer">
                {isAnimating ? '抽取中...' : '🎲 抽取一題'}
              </button>
            </section>

            <section onClick={() => setView('nexus')} className="bg-slate-900/60 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4 md:p-6 shadow-xl group cursor-pointer hover:bg-slate-800/80 transition-all">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h2 className="text-lg md:text-xl font-bold text-cyan-400 flex items-center gap-2" style={{ fontFamily: "'Orbitron', 'Noto Serif TC', serif" }}>
                  <span>🕸️</span> 艾奧傑亞關係網
                </h2>
                <span className="text-slate-500 group-hover:text-cyan-400 transition-colors">➔</span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">進入視覺化的 Node 畫布，手動拖曳連線，編織出你專屬的角色群像關係圖。</p>
              <div className="h-20 md:h-24 bg-black/40 rounded-lg border border-white/5 relative overflow-hidden flex items-center justify-center">
                <div className="absolute w-2 h-2 bg-cyan-400 rounded-full top-4 left-6 shadow-[0_0_10px_#22d3ee]"></div>
                <div className="absolute w-2 h-2 bg-pink-400 rounded-full bottom-6 right-8 shadow-[0_0_10px_#f472b6]"></div>
                <div className="absolute w-2 h-2 bg-amber-400 rounded-full top-8 right-12 shadow-[0_0_10px_#fbbf24]"></div>
                <svg className="absolute inset-0 w-full h-full opacity-30 animate-pulse" pointerEvents="none">
                  <line x1="15%" y1="20%" x2="70%" y2="70%" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4" />
                  <line x1="70%" y1="70%" x2="80%" y2="30%" stroke="#f472b6" strokeWidth="1" />
                </svg>
                <span className="text-xs font-bold text-slate-300 bg-slate-900/80 px-3 py-1 rounded border border-slate-700 z-10 backdrop-blur-sm group-hover:bg-cyan-900/80 group-hover:border-cyan-500/50 transition-colors cursor-pointer">開啟全景畫布</span>
              </div>
            </section>
          </div>
        </div>

        <footer className="mt-10 md:mt-16 pt-6 md:pt-8 border-t border-white/10 text-center flex flex-col items-center gap-3 relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className="text-cyan-400 font-bold tracking-widest text-[11px] md:text-xs flex items-center gap-2 bg-cyan-900/20 px-4 py-2 rounded-full border border-cyan-500/30">
              <span>✨</span> 作者：閻羅@奧汀 <span>✨</span>
            </div>
            <a 
              href="https://rp-toolbox.vercel.app/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 font-bold tracking-widest text-[11px] md:text-xs flex items-center gap-2 bg-amber-950/40 hover:bg-amber-900/40 px-4 py-2 rounded-full border border-amber-500/30 transition-all hover:scale-105 duration-200 cursor-pointer"
            >
              <span>🧰</span> RP工具箱
            </a>
          </div>
          <p className="text-slate-500 text-[10px] md:text-xs max-w-3xl leading-relaxed px-4">
            【免責聲明】<br/>
            本頁面為《FINAL FANTASY XIV》玩家自製之非官方 RP (Role-Playing) 衍生輔助工具，與 SQUARE ENIX CO., LTD. 無任何官方關聯。<br/>
            工具內所提及之遊戲相關名詞、種族設定、官方 NPC 名稱等知識產權均屬原公司 SQUARE ENIX 所有。請創作者遵守遊戲規章，請勿將本工具用於任何商業盈利行為。
          </p>
        </footer>

      </div>
      {isCpModalOpen && <CPEditorModal />}
      {isTutorialOpen && <TutorialModal />}
      {isImportModalOpen && <ImportCharacterModal />}

      {/* Custom Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-950 border border-cyan-500/30 text-white px-5 py-3 rounded-xl shadow-2xl z-[150] max-w-sm flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <span className="text-cyan-400">✨</span>
          <span className="text-xs md:text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-auto text-slate-400 hover:text-white cursor-pointer text-xs">✕</button>
        </div>
      )}

      {/* Custom Confirm Dialogs */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 w-full max-w-xs md:max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">⚠️ 確認提問</h3>
            <p className="text-slate-300 text-xs md:text-sm mb-6 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3 font-bold text-xs md:text-sm">
              <button 
                onClick={() => setConfirmDialog(null)} 
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }} 
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors cursor-pointer shadow-md"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Immersive Photo Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[250] flex flex-col items-center justify-center p-4 animate-fade-in cursor-zoom-out"
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white text-lg font-bold w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg border border-white/20 z-[260]"
            title="關閉"
          >
            ✕
          </button>
          
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="max-w-full max-h-[85vh] overflow-hidden rounded-xl shadow-2xl relative border border-white/10 flex items-center justify-center bg-black/50"
          >
            <img 
              src={lightboxImage.src} 
              alt="Viewing Full Size Illustration" 
              className="max-w-full max-h-[80vh] md:max-h-[85vh] object-contain animate-scale-up" 
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="mt-4 text-center px-4">
            <span className="text-slate-300 font-bold text-sm bg-black/60 px-4 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
              {lightboxImage.name} 的完整照片 (點擊空白處關閉)
            </span>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Chakra+Petch:wght@400;700&family=Orbitron:wght@400;700;900&family=M+PLUS+Rounded+1c:wght@400;700&family=Noto+Sans+TC:wght@400;700&family=Noto+Serif+TC:wght@400;700&family=Dela+Gothic+One&family=Liu+Jian+Mao+Cao&display=swap'); .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.3); border-radius: 4px; } .hide-scrollbar::-webkit-scrollbar { display: none; }`}} />
    </div>
  );
}
