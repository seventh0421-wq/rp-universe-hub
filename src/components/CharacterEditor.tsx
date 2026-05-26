import React, { useState, useEffect } from 'react';
import { Character, AppSettings } from '../types';
import { defaultCharacter, getRadarPoint } from '../constants';

interface CharacterEditorProps {
  initialData: Character | null;
  onSave: (data: Character) => void;
  onCancel: () => void;
}

export default function CharacterEditor({ initialData, onSave, onCancel }: CharacterEditorProps) {
  const [copyStatus, setCopyStatus] = useState('📋 複製文字版');
  const [activeTab, setActiveTab] = useState('basic');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [isFullImageOpen, setIsFullImageOpen] = useState(false);

  const [formData, setFormData] = useState<Character>(() => {
    const data = initialData || { ...defaultCharacter, id: `char_${Date.now()}` } as Character;
    return { 
      ...data, 
      radarStats: data.radarStats || [...defaultCharacter.radarStats],
      imageZoom: data.imageZoom ?? 100,
      imagePosX: data.imagePosX ?? 50,
      imagePosY: data.imagePosY ?? 20
    };
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    themeMode: 'dark',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: 14,
    titleColor: '',
    subtitleColor: '',
    contentColor: '',
  });

  const isDark = appSettings.themeMode === 'dark';

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatChange = (index: number, field: 'name' | 'value', value: string | number) => {
    const newStats = [...formData.radarStats];
    if (field === 'name') {
      newStats[index].name = value as string;
    } else {
      newStats[index].value = value as number;
    }
    setFormData(prev => ({ ...prev, radarStats: newStats }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showAlert('圖片檔案過大！建議上傳小於 10MB 的圖片以確保順暢體驗。');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyText = () => {
    const statsText = formData.radarStats.map(s => `${s.name}: ${s.value}`).join(' | ');
    const textOutput = `【艾奧傑亞冒險者銘牌】
◆ 基本資料
名稱：${formData.name || '未設定'}
種族：${formData.race || '未設定'}
性別：${formData.gender || '未設定'}
年齡：${formData.age || '未設定'}
身高/體重：${formData.height || '-'} / ${formData.weight || '-'}
髮色/瞳色：${formData.hairColor || '-'} / ${formData.eyeColor || '-'}
性取向：${formData.orientation || '-'}
配偶/締結者：${formData.spouse || '-'}
代表色：${formData.themeColor}
關鍵 TAG：${formData.tags || '無'}

◆ 背景故事
${formData.backstory || '尚未填寫...'}

◆ 六維能力面板
${statsText}

◆ 身體屬性
體溫：${formData.temperature || '-'}
力氣：${formData.strength || '-'}
慣用手：${formData.dominantHand || '-'}
視力狀況：${formData.eyesight || '-'}
健康狀況：${formData.healthStatus || '-'}
特徵補充：${formData.physicalNotes || '無'}

◆ 個性與特質
MBTI：${formData.mbti || '-'}
個性簡述：
${formData.personality || '尚未填寫...'}

◆ 其他情報
喜歡的事物：${formData.likes || '-'}
討厭的事物：${formData.dislikes || '-'}
擅長/不擅長：${formData.strengths || '-'}
日常習慣：${formData.habits || '-'}
口頭禪：${formData.catchphrase || '-'}`;

    const textArea = document.createElement("textarea");
    textArea.value = textOutput;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopyStatus('✅ 已複製！');
      setTimeout(() => setCopyStatus('📋 複製文字版'), 2000);
    } catch (err) { 
      showAlert('複製失敗，請手動複製。'); 
    }
    document.body.removeChild(textArea);
  };

  const renderInputField = ({ label, name, placeholder, type = "text" }: { label: string; name: keyof Character; placeholder: string; type?: string }) => (
    <div className="mb-5" key={name}>
      <label 
        className={`block mb-1.5 tracking-wider font-semibold drop-shadow-md transition-colors ${isDark ? 'text-slate-200' : 'text-slate-700'}`} 
        style={{ fontSize: `${Math.max(10, appSettings.fontSize - 2)}px`, color: appSettings.subtitleColor || (isDark ? '#e2e8f0' : '#334155') }}
      >
        {label}
      </label>
      <input 
        type={type} 
        name={name} 
        value={(formData[name] as string) || ''} 
        onChange={handleChange} 
        placeholder={placeholder} 
        className={`w-full border rounded p-2.5 focus:outline-none transition-colors backdrop-blur-sm ${isDark ? 'bg-slate-900/60 border-slate-600/50 placeholder:text-slate-500' : 'bg-white/60 border-slate-300/60 placeholder:text-slate-400'}`} 
        style={{ fontSize: `${appSettings.fontSize}px`, fontFamily: appSettings.fontFamily, color: appSettings.contentColor || (isDark ? '#f3f4f6' : '#111827') }} 
        onFocus={(e) => e.target.style.borderColor = formData.themeColor} 
        onBlur={(e) => e.target.style.borderColor = ''} 
      />
    </div>
  );

  const renderSelectField = ({ label, name, options }: { label: string; name: keyof Character; options: string[] }) => (
    <div className="mb-5" key={name}>
      <label 
        className={`block mb-1.5 tracking-wider font-semibold drop-shadow-md transition-colors ${isDark ? 'text-slate-200' : 'text-slate-700'}`} 
        style={{ fontSize: `${Math.max(10, appSettings.fontSize - 2)}px`, color: appSettings.subtitleColor || (isDark ? '#e2e8f0' : '#334155') }}
      >
        {label}
      </label>
      <select 
        name={name} 
        value={(formData[name] as string) || ''} 
        onChange={handleChange} 
        className={`w-full border rounded p-2.5 focus:outline-none transition-colors backdrop-blur-sm appearance-none ${isDark ? 'bg-slate-900/60 border-slate-600/50 text-slate-200' : 'bg-white/60 border-slate-300/60 text-slate-800'}`} 
        style={{ 
          fontSize: `${appSettings.fontSize}px`, 
          fontFamily: appSettings.fontFamily, 
          color: appSettings.contentColor || (isDark ? '#f3f4f6' : '#111827'),
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='${isDark ? '%2394a3b8' : '%2364748b'}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, 
          backgroundPosition: `right .5rem center`, 
          backgroundRepeat: `no-repeat`, 
          backgroundSize: `1.5em 1.5em`, 
          paddingRight: `2.5rem` 
        }} 
        onFocus={(e) => e.target.style.borderColor = formData.themeColor} 
        onBlur={(e) => e.target.style.borderColor = ''}
      >
        <option value="" disabled>請選擇種族...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  const renderTextAreaField = ({ label, name, placeholder, rows = 3 }: { label: string; name: keyof Character; placeholder: string; rows?: number }) => (
    <div className="mb-5" key={name}>
      <label 
        className={`block mb-1.5 tracking-wider font-semibold drop-shadow-md transition-colors ${isDark ? 'text-slate-200' : 'text-slate-700'}`} 
        style={{ fontSize: `${Math.max(10, appSettings.fontSize - 2)}px`, color: appSettings.subtitleColor || (isDark ? '#e2e8f0' : '#334155') }}
      >
        {label}
      </label>
      <textarea 
        name={name} 
        value={(formData[name] as string) || ''} 
        onChange={handleChange} 
        placeholder={placeholder} 
        rows={rows} 
        className={`w-full border rounded p-2.5 resize-none focus:outline-none transition-colors custom-scrollbar backdrop-blur-sm ${isDark ? 'bg-slate-900/60 border-slate-600/50 placeholder:text-slate-500' : 'bg-white/60 border-slate-300/60 placeholder:text-slate-400'}`} 
        style={{ fontSize: `${appSettings.fontSize}px`, fontFamily: appSettings.fontFamily, color: appSettings.contentColor || (isDark ? '#f3f4f6' : '#111827') }} 
        onFocus={(e) => e.target.style.borderColor = formData.themeColor} 
        onBlur={(e) => e.target.style.borderColor = ''} 
      />
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen font-sans transition-colors duration-1000 overflow-hidden" style={{ backgroundImage: 'linear-gradient(to right top, #d16ba5, #c777b9, #ba83ca, #aa8fd8, #9a9ae1, #8aa7ec, #79b3f4, #69bff8, #52cffe, #41dfff, #46eefa, #5ffbf1)' }}>
      <div className={`w-full lg:w-72 shrink-0 flex flex-col p-6 border-b lg:border-b-0 lg:border-r backdrop-blur-xl shadow-2xl z-20 overflow-y-auto custom-scrollbar ${isDark ? 'bg-slate-900/80 border-white/10 text-slate-200' : 'bg-white/80 border-black/10 text-slate-800'}`}>
        <button onClick={onCancel} className="mb-6 flex items-center gap-2 text-sm opacity-70 hover:opacity-100 transition-opacity w-fit cursor-pointer">
          <span>🔙</span> 返回宇宙總控台
        </button>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 drop-shadow-sm"><span className="text-2xl">🧰</span> 銘牌工具箱</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold mb-2 opacity-70">版面配色</label>
            <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/20' : 'border-slate-300'}`}>
              <button onClick={() => setAppSettings(prev => ({ ...prev, themeMode: 'dark' }))} className={`flex-1 py-2 text-sm font-bold transition-colors ${isDark ? 'bg-slate-700 text-white' : 'bg-transparent hover:bg-slate-200'}`}>深色</button>
              <button onClick={() => setAppSettings(prev => ({ ...prev, themeMode: 'light' }))} className={`flex-1 py-2 text-sm font-bold transition-colors ${!isDark ? 'bg-slate-200 text-slate-800' : 'bg-transparent hover:bg-slate-800'}`}>淺色</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-2 opacity-70">字體風格</label>
            <select value={appSettings.fontFamily} onChange={(e) => setAppSettings(prev => ({ ...prev, fontFamily: e.target.value }))} className={`w-full p-2.5 rounded border focus:outline-none text-sm ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}>
              <option value="ui-sans-serif, system-ui, sans-serif">預設無襯線體</option>
              <option value="ui-serif, Georgia, serif">預設襯線體</option>
              <option value="'Noto Sans TC', sans-serif">思源黑體</option>
              <option value="'Noto Serif TC', serif">思源明體</option>
              <option value="'jf-openhuninn', 'M PLUS Rounded 1c', sans-serif">粉圓字體</option>
              <option value="'Dela Gothic One', sans-serif">Dela Gothic One</option>
              <option value="'龍藏體', 'Liu Jian Mao Cao', cursive">龍藏體</option>
              <option value="'Caveat', 'Klee One', 'ChenYuluoyan', cursive">手寫風</option>
              <option value="'Orbitron', sans-serif">賽博科技 (Orbitron)</option>
              <option value="'Chakra Petch', sans-serif">機甲終端 (Chakra Petch)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-2 opacity-70 flex justify-between"><span>字體大小</span><span>{appSettings.fontSize}px</span></label>
            <input type="range" min="12" max="22" value={appSettings.fontSize} onChange={(e) => setAppSettings(prev => ({ ...prev, fontSize: Number(e.target.value) }))} className="w-full accent-cyan-500" />
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <label className="text-xs font-bold opacity-70 tracking-wider">自訂字體顏色</label>
              <button onClick={() => setAppSettings(prev => ({ ...prev, titleColor: '', subtitleColor: '', contentColor: '' }))} className="text-[10px] underline opacity-60 hover:opacity-100 transition-opacity">
                重置預設
              </button>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">大標題 (名稱)</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono opacity-50">{appSettings.titleColor || '預設'}</span>
                <input type="color" value={appSettings.titleColor || (isDark ? '#ffffff' : '#0f172a')} onChange={(e) => setAppSettings(prev => ({ ...prev, titleColor: e.target.value }))} className={`w-6 h-6 rounded cursor-pointer p-0 border ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">小標題 (欄位名)</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono opacity-50">{appSettings.subtitleColor || '預設'}</span>
                <input type="color" value={appSettings.subtitleColor || (isDark ? '#e2e8f0' : '#334155')} onChange={(e) => setAppSettings(prev => ({ ...prev, subtitleColor: e.target.value }))} className={`w-6 h-6 rounded cursor-pointer p-0 border ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm opacity-90">內容 (填寫字)</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono opacity-50">{appSettings.contentColor || '預設'}</span>
                <input type="color" value={appSettings.contentColor || (isDark ? '#f3f4f6' : '#111827')} onChange={(e) => setAppSettings(prev => ({ ...prev, contentColor: e.target.value }))} className={`w-6 h-6 rounded cursor-pointer p-0 border ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start custom-scrollbar relative z-10">
        <div className={`w-full max-w-4xl backdrop-blur-xl rounded-xl overflow-hidden border-t-4 transition-all duration-500 relative shadow-2xl ${isDark ? 'bg-slate-900/70 border-white/10' : 'bg-white/70 border-black/10'}`} style={{ borderTopColor: formData.themeColor }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 blur-[80px] opacity-30 pointer-events-none" style={{ backgroundColor: formData.themeColor }}></div>
          
          <div className={`p-6 md:p-8 flex flex-col md:flex-row items-start md:items-end gap-6 border-b relative z-10 ${isDark ? 'border-white/10 bg-gradient-to-b from-black/40 to-transparent' : 'border-black/10 bg-gradient-to-b from-white/60 to-transparent'}`}>
            <div className="flex flex-col items-center gap-2 shrink-0 w-full sm:w-auto">
              <div className="relative group shrink-0">
                <div 
                  onClick={() => formData.imageUrl && setIsFullImageOpen(true)}
                  className={`w-28 h-28 md:w-32 md:h-32 rounded-xl border-2 flex items-center justify-center overflow-hidden transition-all duration-300 backdrop-blur-md relative
                    ${isDark ? 'bg-slate-800/80 hover:border-cyan-400' : 'bg-slate-200/80 hover:border-cyan-500'} 
                    ${formData.imageUrl ? 'cursor-zoom-in' : 'cursor-pointer'}`}
                  style={{ 
                    borderColor: formData.themeColor, 
                    boxShadow: `0 0 25px ${formData.themeColor}40` 
                  }}
                  title={formData.imageUrl ? "點擊查看完整照片" : "上傳角色照片"}
                >
                  {formData.imageUrl ? (
                    <img 
                      src={formData.imageUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover transition-transform duration-200 animate-fade-in pointer-events-none" 
                      style={{ 
                        transform: `scale(${(formData.imageZoom ?? 100) / 100})`, 
                        objectPosition: `${formData.imagePosX ?? 50}% ${formData.imagePosY ?? 20}%`,
                        transformOrigin: 'center center'
                      }} 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      <span className={`text-4xl pointer-events-none ${isDark ? 'text-slate-400/70' : 'text-slate-500/70'}`}>📸</span>
                    </label>
                  )}
                </div>
                {formData.imageUrl && (
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormData(prev => ({ ...prev, imageUrl: '' })); }}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-650 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg cursor-pointer z-20"
                    title="移除影像"
                  >✕</button>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-1">
                <label className="text-[10px] md:text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded cursor-pointer transition-colors font-semibold flex items-center gap-1 shadow-sm">
                  <span>📸</span> {formData.imageUrl ? '更換' : '上傳'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
                
                {formData.imageUrl && (
                  <>
                    <button 
                      onClick={() => setIsFullImageOpen(true)}
                      className="text-[10px] md:text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded transition-colors font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <span>🔍</span> 查看
                    </button>
                    <button 
                      onClick={() => setShowAdjustments(!showAdjustments)}
                      className={`text-[10px] md:text-xs px-2 py-1 border rounded transition-colors font-semibold flex items-center gap-1 shadow-sm cursor-pointer
                        ${showAdjustments 
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}
                    >
                      <span>📐</span> 縮圖
                    </button>
                  </>
                )}
              </div>

              {formData.imageUrl && showAdjustments && (
                <div className={`mt-2 p-3 rounded-lg border text-xs space-y-2 w-full max-w-[280px] text-left animate-fade-in ${isDark ? 'bg-slate-950/90 border-white/5 text-slate-300' : 'bg-slate-50 border-black/5 text-slate-700'}`}>
                  <div className="font-bold border-b border-white/5 pb-1 mb-1 text-cyan-400 flex items-center justify-between">
                    <span>📐 縮圖視角微調</span>
                    <button onClick={() => {
                      setFormData(prev => ({ ...prev, imageZoom: 100, imagePosX: 50, imagePosY: 20 }));
                    }} className="text-[10px] text-slate-400 hover:text-cyan-400 underline cursor-pointer">重設</button>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-0.5 opacity-80">
                      <span>放大比例 (Zoom)</span>
                      <span className="font-mono text-cyan-400">{formData.imageZoom ?? 100}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="100" 
                      max="300" 
                      step="5"
                      value={formData.imageZoom ?? 100} 
                      onChange={(e) => setFormData(prev => ({ ...prev, imageZoom: parseInt(e.target.value) }))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-0.5 opacity-80">
                      <span>左右偏置 (X Offset)</span>
                      <span className="font-mono text-cyan-400">{formData.imagePosX ?? 50}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={formData.imagePosX ?? 50} 
                      onChange={(e) => setFormData(prev => ({ ...prev, imagePosX: parseInt(e.target.value) }))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-0.5 opacity-80">
                      <span>上下偏置 (Y Offset)</span>
                      <span className="font-mono text-cyan-400">{formData.imagePosY ?? 20}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={formData.imagePosY ?? 20} 
                      onChange={(e) => setFormData(prev => ({ ...prev, imagePosY: parseInt(e.target.value) }))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 w-full">
              <input type="text" name="name" value={formData.name || ''} onChange={handleChange} placeholder="輸入角色名稱..." className={`w-full bg-transparent font-bold focus:outline-none border-b border-transparent pb-1 transition-colors mb-3 ${isDark ? 'placeholder:text-slate-500 focus:border-white/20 text-white' : 'placeholder:text-slate-400 focus:border-black/20 text-slate-900'}`} style={{ fontSize: `${appSettings.fontSize * 2}px`, fontFamily: appSettings.fontFamily, color: appSettings.titleColor || undefined }} />
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0 ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/40 border-black/10'}`}>
                  <span className="text-xs text-white font-bold opacity-90">代表色</span>
                  <input type="color" name="themeColor" value={formData.themeColor} onChange={handleChange} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                </div>
                <div className="flex-1 w-full relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-60">🏷️</span>
                  <input type="text" name="tags" value={formData.tags || ''} onChange={handleChange} placeholder="關鍵 TAG (例如：戰鬥狂, 傲嬌)" className={`w-full border text-sm rounded-lg py-1.5 pl-9 pr-3 focus:outline-none ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/40 border-black/10'}`} style={{ color: formData.themeColor, fontFamily: appSettings.fontFamily }} />
                </div>
              </div>
            </div>
          </div>

          <div className={`flex border-b overflow-x-auto hide-scrollbar ${isDark ? 'bg-black/30 border-white/10' : 'bg-slate-900 border-slate-700'}`}>
            {[
              { id: 'basic', label: '一、基本資料' }, 
              { id: 'physical', label: '二、身體屬性' }, 
              { id: 'personality', label: '三、個性' }, 
              { id: 'stats', label: '四、能力面板' },
              { id: 'extra', label: '五、其他補充' }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`flex-1 py-3 px-4 font-bold tracking-widest relative whitespace-nowrap cursor-pointer text-white transition-all duration-300
                  ${activeTab === tab.id ? 'bg-white/15' : 'hover:bg-white/10 opacity-75 hover:opacity-100'}`} 
                style={{ 
                  fontSize: `${Math.max(12, appSettings.fontSize - 2)}px`, 
                  color: '#ffffff' 
                }}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5" style={{ backgroundColor: formData.themeColor, boxShadow: `0 -2px 10px ${formData.themeColor}` }} />}
              </button>
            ))}
          </div>

          <div className={`p-6 md:p-8 min-h-[350px] relative z-0 ${!isDark ? 'bg-white/30' : ''}`}>
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 animate-fade-in">
                {renderSelectField({label: "種族 *", name: "race", options: ['人族', '精靈族', '拉拉菲爾族', '貓魅族', '魯加族', '敖龍族', '維埃拉族', '硌獅族', '古代人', '其他']})}
                {renderInputField({label: "性別", name: "gender", placeholder: "例如：男 / 女 / 不明"})}
                {renderInputField({label: "年齡", name: "age", placeholder: "例如：18歲 / 24歲"})} 
                {renderInputField({label: "身高", name: "height", placeholder: "例如：175cm"})}
                {renderInputField({label: "體重", name: "weight", placeholder: "例如：60kg"})} 
                {renderInputField({label: "性取向", name: "orientation", placeholder: "例如：雙性戀"})}
                <div className="md:col-span-2">{renderInputField({label: "配偶 / 締結者", name: "spouse", placeholder: "配偶角色或冒險締結對象"})}</div>
                <div className={`md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 border-t pt-4 mt-2 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                  {renderInputField({label: "髮色", name: "hairColor", placeholder: "髮形與顏色細節"})} 
                  {renderInputField({label: "瞳色", name: "eyeColor", placeholder: "瞳孔顏色與特徵"})}
                </div>
                <div className="md:col-span-2 mt-2">{renderTextAreaField({label: "背景故事 / 角色經歷", name: "backstory", placeholder: "輸入細緻的身世、來歷與故事...", rows: 5})}</div>
              </div>
            )}
            
            {activeTab === 'physical' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 animate-fade-in">
                {renderInputField({label: "體溫", name: "temperature", placeholder: "例如：微溫、高溫"})} 
                {renderInputField({label: "力氣", name: "strength", placeholder: "例如：一般、驚人"})}
                {renderInputField({label: "慣用手", name: "dominantHand", placeholder: "例如：右撇子、左撇子"})} 
                {renderInputField({label: "視力狀況", name: "eyesight", placeholder: "例如：戴眼鏡、盲眼魔力感知"})}
                <div className={`md:col-span-2 border-t pt-4 mt-2 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                  {renderInputField({label: "健康狀況", name: "healthStatus", placeholder: "慢性疾病、健康或虛弱狀況"})}
                  {renderTextAreaField({label: "身體特徵補充", name: "physicalNotes", placeholder: "例如：右半側胸膛有巨大的燒傷疤痕，或者是頭部有羽耳特徵...", rows: 3})}
                </div>
              </div>
            )}
            
            {activeTab === 'personality' && (
              <div className="animate-fade-in">
                <div className="w-full sm:w-1/2 pr-0 sm:pr-4">{renderInputField({label: "MBTI (16型人格)", name: "mbti", placeholder: "例如：INFJ"})}</div>
                {renderTextAreaField({label: "個性簡述", name: "personality", placeholder: "描述對方的性格特質、待人接物態度、容易生氣或開心的事物...", rows: 8})}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="flex flex-col lg:flex-row gap-8 items-center justify-center animate-fade-in">
                <div className="w-full lg:w-1/2 space-y-4">
                  <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>您可以自由更改屬性名稱（例如：家事、財力、廚藝），並滑動拉桿設定能力值。</p>
                  {formData.radarStats.map((stat, index) => (
                    <div key={index} className="flex items-center gap-4 bg-black/10 p-2 rounded-lg border border-slate-500/20">
                      <input 
                        type="text" 
                        value={stat.name} 
                        onChange={(e) => handleStatChange(index, 'name', e.target.value)}
                        className={`w-20 bg-transparent font-bold text-center border-b border-dashed focus:outline-none transition-colors ${isDark ? 'text-slate-200 border-slate-600 focus:border-cyan-400' : 'text-slate-800 border-slate-400 focus:border-cyan-600'}`}
                      />
                      <input 
                        type="range" min="0" max="100" 
                        value={stat.value} 
                        onChange={(e) => handleStatChange(index, 'value', Number(e.target.value))}
                        className="flex-1 cursor-pointer"
                        style={{ accentColor: formData.themeColor }}
                      />
                      <span className="w-8 text-right font-mono text-sm font-bold" style={{ color: formData.themeColor }}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                <div className="w-full lg:w-1/2 flex justify-center items-center relative">
                  <svg width="320" height="320" viewBox="0 0 320 320" className="drop-shadow-2xl">
                    <g transform="translate(160, 160)">
                      {[20, 40, 60, 80, 100].map(level => {
                        const points = [0, 60, 120, 180, 240, 300].map(angle => {
                          const p = getRadarPoint(angle, level, 100, 0, 0);
                          return `${p.x},${p.y}`;
                        }).join(' ');
                        return (
                          <polygon 
                            key={level} points={points} 
                            fill={level % 40 === 0 ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'none'} 
                            stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} 
                            strokeWidth="1" 
                          />
                        );
                      })}
                      
                      {[0, 60, 120].map(angle => {
                        const p1 = getRadarPoint(angle, 100, 100, 0, 0);
                        const p2 = getRadarPoint(angle + 180, 100, 100, 0, 0);
                        return <line key={angle} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} strokeWidth="1" />;
                      })}

                      <polygon 
                        points={formData.radarStats.map((stat, i) => {
                          const p = getRadarPoint(i * 60, stat.value, 100, 0, 0);
                          return `${p.x},${p.y}`;
                        }).join(' ')}
                        fill={`${formData.themeColor}50`}
                        stroke={formData.themeColor}
                        strokeWidth="3"
                        strokeLinejoin="round"
                        className="transition-all duration-300"
                        style={{ filter: `drop-shadow(0 0 8px ${formData.themeColor})` }}
                      />

                      {formData.radarStats.map((stat, i) => {
                        const p = getRadarPoint(i * 60, stat.value, 100, 0, 0);
                        return <circle key={`dot-${i}`} cx={p.x} cy={p.y} r="4" fill="#fff" stroke={formData.themeColor} strokeWidth="2" className="transition-all duration-300" />;
                      })}

                      {formData.radarStats.map((stat, i) => {
                        const p = getRadarPoint(i * 60, 100, 130, 0, 0);
                        return (
                          <text 
                            key={`label-${i}`} 
                            x={p.x} y={p.y} 
                            fill={isDark ? '#e2e8f0' : '#1e293b'} 
                            fontSize={appSettings.fontSize} 
                            fontWeight="bold"
                            textAnchor="middle" 
                            dominantBaseline="middle"
                            fontFamily={appSettings.fontFamily}
                          >
                            {stat.name}
                          </text>
                        );
                      })}
                    </g>
                  </svg>
                </div>
              </div>
            )}

            {activeTab === 'extra' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 animate-fade-in">
                {renderTextAreaField({label: "喜歡的事物", name: "likes", placeholder: "喜愛的食物、道具、日常活動、或是氛圍...", rows: 2})} 
                {renderTextAreaField({label: "討厭的事物", name: "dislikes", placeholder: "懼怕或反感的東西...", rows: 2})}
                {renderTextAreaField({label: "擅長 / 不擅長", name: "strengths", placeholder: "擅長的技藝或完全不在行的事情...", rows: 3})} 
                {renderTextAreaField({label: "日常習慣", name: "habits", placeholder: "一些獨特的習慣或日常放空時的舉動...", rows: 3})}
                <div className={`md:col-span-2 border-t pt-4 mt-2 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                  {renderInputField({label: "口頭禪 / 語癖", name: "catchphrase", placeholder: "角色平時的名台詞或說話習慣字首字尾"})}
                </div>
              </div>
            )}
          </div>

          <div className={`backdrop-blur-md p-4 border-t flex justify-end gap-3 z-10 ${isDark ? 'bg-black/30 border-white/10' : 'bg-white/50 border-black/10'}`}>
            <button onClick={handleCopyText} className={`px-4 py-2 rounded font-bold border-2 text-sm cursor-pointer ${isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-black/20 text-slate-800 hover:bg-black/5'}`}>{copyStatus}</button>
            <button onClick={() => onSave(formData)} className="px-6 py-2 rounded font-bold shadow-lg text-slate-900 text-sm hover:scale-105 transition-transform cursor-pointer" style={{ backgroundColor: formData.themeColor, boxShadow: `0 0 20px ${formData.themeColor}80` }}>💾 儲存並返回</button>
          </div>
        </div>
      </div>

      {alertMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 w-80 text-center shadow-2xl">
            <p className="text-slate-200 text-sm mb-5 font-medium leading-relaxed">{alertMessage}</p>
            <button onClick={() => setAlertMessage(null)} className="px-6 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold transition-all text-xs cursor-pointer">確定</button>
          </div>
        </div>
      )}

      {isFullImageOpen && formData.imageUrl && (
        <div 
          onClick={() => setIsFullImageOpen(false)}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[250] flex flex-col items-center justify-center p-4 animate-fade-in"
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setIsFullImageOpen(false); }}
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
              src={formData.imageUrl} 
              alt="Full Size Avatar" 
              className="max-w-full max-h-[80vh] md:max-h-[85vh] object-contain animate-scale-up" 
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="mt-4 text-center px-4">
            <span className="text-slate-300 font-bold text-sm bg-black/60 px-4 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
              {formData.name || '未命名角色'} 的完整照片 (點擊空白處關閉)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
