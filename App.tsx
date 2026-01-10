
import React, { useState, useEffect, useRef } from 'react';
import { EventType, Player, Team, Match, TournamentState, AppView, EventCategory, TournamentMetadata } from './types.js';
import PlayerInput from './components/PlayerInput.js';
import Bracket from './components/Bracket.js';
import DrawView from './components/DrawView.js';
import CategoryModal from './components/CategoryModal.js';
import TournamentDashboard from './components/TournamentDashboard.js';
import { createTeams, buildInitialBracket, fillBracketWithTeams, assignCourtsAndTime, recalculateBracket } from './services/tournamentLogic.js';
import { syncToGoogleSheet, getGASCode } from './services/googleSheetService.js';
import { exportTournamentToCSV } from './services/exportService.js';

const INDEX_KEY = 'badminton_tournaments_index_v1';
const DATA_PREFIX = 'badminton_data_';

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [showScriptHelper, setShowScriptHelper] = useState(false);
  
  const [courtCountInput, setCourtCountInput] = useState('4');
  const [courtNamesInput, setCourtNamesInput] = useState('Sân 1, Sân 2, Sân 3, Sân 4');
  
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [tournaments, setTournaments] = useState<TournamentMetadata[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createNewTournamentState = (): TournamentState => {
    const id = `t-${Date.now()}`;
    const catId = `cat-${Date.now()}`;
    return {
      id,
      tournamentName: 'GIẢI CẦU LÔNG MỚI',
      venue: 'Sân vận động Trung tâm',
      date: new Date().toISOString().split('T')[0],
      organizer: 'Ban tổ chức giải',
      googleSheetId: '',
      linkedSpreadsheetUrl: '',
      categories: [{
        id: catId,
        name: 'NỘI DUNG MẶC ĐỊNH',
        eventType: EventType.DOUBLES,
        players: [],
        teams: [],
        matches: [],
        isDrawDone: false,
        hasThirdPlaceMatch: true
      }],
      activeCategoryId: catId,
      view: 'SETUP',
      clubProtection: true,
      lastUpdated: Date.now(),
      courtCount: 4,
      matchDuration: 30,
      startTime: '08:00'
    };
  };

  const [state, setState] = useState<TournamentState>(() => {
    const lastActiveId = localStorage.getItem('last_active_tournament');
    if (lastActiveId) {
      const saved = localStorage.getItem(`${DATA_PREFIX}${lastActiveId}`);
      if (saved) return JSON.parse(saved);
    }
    return createNewTournamentState();
  });

  const handleCourtCountChange = (countStr: string) => {
    setCourtCountInput(countStr);
    const count = parseInt(countStr);
    if (!isNaN(count) && count > 0) {
      const suggestedNames = Array.from({ length: count }, (_, i) => `Sân ${i + 1}`).join(', ');
      setCourtNamesInput(suggestedNames);
    }
  };

  useEffect(() => {
    refreshTournamentIndex();
  }, []);

  const refreshTournamentIndex = () => {
    const indexStr = localStorage.getItem(INDEX_KEY);
    if (indexStr) {
      const index: TournamentMetadata[] = JSON.parse(indexStr);
      setTournaments(index.sort((a, b) => b.lastUpdated - a.lastUpdated));
    }
  };

  useEffect(() => {
    if (!state.id) return;
    localStorage.setItem(`${DATA_PREFIX}${state.id}`, JSON.stringify(state));
    localStorage.setItem('last_active_tournament', state.id);

    const indexStr = localStorage.getItem(INDEX_KEY);
    let index: TournamentMetadata[] = indexStr ? JSON.parse(indexStr) : [];
    const meta: TournamentMetadata = {
      id: state.id,
      name: state.tournamentName,
      date: state.date || '',
      venue: state.venue || '',
      playerCount: state.categories.reduce((acc, cat) => acc + cat.players.length, 0),
      lastUpdated: Date.now(),
      isCloudLinked: !!state.googleSheetId
    };
    const existingIdx = index.findIndex(i => i.id === state.id);
    if (existingIdx >= 0) index[existingIdx] = meta;
    else index.push(meta);
    
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    setTournaments(index.sort((a, b) => b.lastUpdated - a.lastUpdated));
  }, [state]);

  const handleManualSync = async (overridingState?: TournamentState) => {
    const currentState = overridingState || state;
    if (!currentState.googleSheetId || !currentState.googleSheetId.startsWith('http')) return;
    
    setSyncStatus('SAVING');
    const result = await syncToGoogleSheet(currentState.googleSheetId, currentState);
    if (result.success) {
      setSyncStatus('SUCCESS');
      setLastSavedTime(new Date().toLocaleTimeString('vi-VN'));
      setTimeout(() => setSyncStatus('IDLE'), 3000);
    } else {
      setSyncStatus('ERROR');
      setTimeout(() => setSyncStatus('IDLE'), 5000);
    }
  };

  const activeCategory = state.categories.find(c => c.id === state.activeCategoryId) || state.categories[0];

  const updateCategory = (categoryId: string, updates: Partial<EventCategory>) => {
    setState(prev => {
      const newState = {
        ...prev,
        categories: prev.categories.map(c => c.id === categoryId ? { ...c, ...updates } : c)
      };
      if (updates.isDrawDone || updates.matches) {
        setTimeout(() => handleManualSync(newState), 500);
      }
      return newState;
    });
  };

  const syncTeamsAndBracket = (newPlayers: Player[]) => {
    const teams = createTeams(newPlayers, activeCategory.eventType);
    updateCategory(activeCategory.id, { players: newPlayers, teams });
  };

  const updateMatchScore = (matchId: string, scoreA: number, scoreB: number) => {
    const updatedMatches = activeCategory.matches.map(m => 
      m.id === matchId ? { ...m, scoreA, scoreB } : m
    );
    const recalculated = recalculateBracket(updatedMatches);
    updateCategory(activeCategory.id, { matches: recalculated });
  };

  const updateMatchInfo = (matchId: string, court: string, time: string) => {
    const updatedMatches = activeCategory.matches.map(m => 
      m.id === matchId ? { ...m, court, scheduledTime: time } : m
    );
    updateCategory(activeCategory.id, { matches: updatedMatches });
  };

  const onAddCategory = (name: string, type: EventType, hasThirdPlace: boolean) => {
    const newCat: EventCategory = {
      id: `cat-${Date.now()}`,
      name: name.toUpperCase(),
      eventType: type,
      players: [],
      teams: [],
      matches: [],
      isDrawDone: false,
      hasThirdPlaceMatch: hasThirdPlace
    };
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, newCat],
      activeCategoryId: newCat.id
    }));
  };

  const handleAutoSchedule = () => {
    const scheduledMatches = assignCourtsAndTime(
      activeCategory.matches,
      courtNamesInput, 
      state.startTime || '08:00',
      state.matchDuration || 30
    );
    updateCategory(activeCategory.id, { matches: scheduledMatches });
    
    const count = parseInt(courtCountInput) || 1;
    setState(p => ({ ...p, courtCount: count }));
    
    setShowScheduleSettings(false);
  };

  const handleFinishDraw = (shuffledTeams: Team[]) => {
    const initialMatches = buildInitialBracket(shuffledTeams.length, activeCategory.hasThirdPlaceMatch);
    const filledMatches = fillBracketWithTeams(shuffledTeams, initialMatches);
    const scheduledMatches = assignCourtsAndTime(filledMatches, courtNamesInput, state.startTime || '08:00', state.matchDuration || 30);
    
    updateCategory(activeCategory.id, { matches: scheduledMatches, isDrawDone: true, teams: shuffledTeams });
    setState(prev => ({ ...prev, view: 'BRACKET' }));
  };

  const handleExportFile = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    const cleanTournamentName = state.tournamentName.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
    const exportFileDefaultName = `${cleanTournamentName}_${timeStr}_${dateStr}.pro`;
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportCSV = () => {
    exportTournamentToCSV(state);
  };

  const handleExportImage = () => {
    const element = document.getElementById('bracket-canvas');
    if (!element) return;
    setIsExportingImage(true);
    // @ts-ignore
    window.html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#f8fafc',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight
    }).then((canvas: HTMLCanvasElement) => {
      const link = document.createElement('a');
      link.download = `${state.tournamentName}_${activeCategory.name}_So_Do.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setIsExportingImage(false);
    }).catch((err: any) => {
      console.error("Export image error:", err);
      setIsExportingImage(false);
      alert("Lỗi khi xuất ảnh sơ đồ!");
    });
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (!files || files.length === 0) return;
    fileReader.readAsText(files[0], "UTF-8");
    fileReader.onload = e => {
      try {
        const target = e.target;
        if (!target || !target.result) return;
        const importedState = JSON.parse(target.result as string);
        if (importedState.id && importedState.categories && Array.isArray(importedState.categories)) {
          localStorage.setItem(`${DATA_PREFIX}${importedState.id}`, JSON.stringify(importedState));
          const indexStr = localStorage.getItem(INDEX_KEY);
          let index: TournamentMetadata[] = indexStr ? JSON.parse(indexStr) : [];
          const meta: TournamentMetadata = {
            id: importedState.id,
            name: importedState.tournamentName,
            date: importedState.date || '',
            venue: importedState.venue || '',
            playerCount: importedState.categories.reduce((acc: number, cat: any) => acc + (cat.players?.length || 0), 0),
            lastUpdated: Date.now(),
            isCloudLinked: !!importedState.googleSheetId
          };
          const existingIdx = index.findIndex(i => i.id === importedState.id);
          if (existingIdx >= 0) index[existingIdx] = meta;
          else index.push(meta);
          localStorage.setItem(INDEX_KEY, JSON.stringify(index));
          setState(importedState);
          alert("Khôi phục dữ liệu giải đấu thành công!");
        } else {
          alert("File không đúng định dạng Badminton Pro (.PRO)!");
        }
      } catch (err) {
        alert("Lỗi khi đọc file!");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  };

  const handleDeleteTournament = (id: string) => {
    const targetTournament = tournaments.find(t => t.id === id);
    const tournamentName = targetTournament ? targetTournament.name : "giải đấu này";
    const isConfirmed = window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa giải đấu "${tournamentName}"?\n\nDữ liệu sẽ bị xóa vĩnh viễn khỏi trình duyệt và không thể khôi phục.`);
    if (!isConfirmed) return;
    localStorage.removeItem(`${DATA_PREFIX}${id}`);
    const indexStr = localStorage.getItem(INDEX_KEY);
    if (indexStr) {
      const index: TournamentMetadata[] = JSON.parse(indexStr);
      const newIndex = index.filter(t => t.id !== id);
      localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));
      setTournaments(newIndex.sort((a, b) => b.lastUpdated - a.lastUpdated));
    }
    if (state.id === id) {
      const newState = createNewTournamentState();
      setState(newState);
    }
  };

  const copyGASScript = () => {
    navigator.clipboard.writeText(getGASCode());
    alert("Đã sao chép mã Script V7.0! Hãy dán vào Apps Script và Triển khai lại.");
  };

  const isViewer = state.view === 'VIEWER';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center print:hidden shadow-xl relative z-50">
        <div className="flex items-center gap-6">
          <button onClick={() => setState(p => ({ ...p, view: 'DASHBOARD' }))} className="flex items-center gap-3 hover:bg-white/5 px-4 py-2 rounded-2xl transition-all">
            <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg">🏸</div>
            <div className="text-left">
               <h1 className="text-sm font-black tracking-tight uppercase truncate max-w-[200px]">{state.tournamentName}</h1>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{isViewer ? 'CHẾ ĐỘ KHÁN GIẢ' : 'Version 7.0 Pro'}</p>
            </div>
          </button>
          
          {state.view !== 'DASHBOARD' && !isViewer && (
            <div className="flex bg-slate-800 p-1 rounded-xl gap-0.5">
              {(['SETUP', 'DRAW', 'BRACKET'] as AppView[]).map(v => (
                <button key={v} onClick={() => setState(p => ({ ...p, view: v }))} className={`px-5 py-2 text-[9px] font-black rounded-lg transition-all ${state.view === v ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-700'}`}>{v === 'SETUP' ? 'CÀI ĐẶT' : v === 'DRAW' ? 'BỐC THĂM' : 'SƠ ĐỒ'}</button>
              ))}
            </div>
          )}

          {isViewer && (
            <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Đang ở chế độ xem trực tiếp</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
           {!isViewer ? (
             <>
               <button onClick={() => setState(p => ({...p, view: 'VIEWER'}))} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                 <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                 Xem (Khán giả)
               </button>
               <div className="flex items-center bg-slate-800 rounded-xl p-1 gap-1">
                 <button onClick={handleExportFile} className="p-2.5 hover:bg-slate-700 text-slate-300 rounded-lg transition-all" title="Sao lưu File .PRO">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                 </button>
                 <button onClick={handleExportCSV} className="p-2.5 hover:bg-slate-700 text-slate-300 rounded-lg transition-all" title="Xuất Excel (CSV)">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 </button>
               </div>
               
               {state.linkedSpreadsheetUrl && (
                  <a href={state.linkedSpreadsheetUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">
                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg> Sheets
                  </a>
               )}
               
               <button 
                  onClick={() => handleManualSync()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${
                    syncStatus === 'SAVING' ? 'bg-blue-600 text-white border-blue-600 animate-pulse' : 
                    syncStatus === 'SUCCESS' ? 'bg-green-600 text-white border-green-600' : 
                    'bg-white text-slate-900 border-slate-700 hover:bg-slate-50'
                  }`}
               >
                  {syncStatus === 'SAVING' ? 'GỬI CLOUD...' : syncStatus === 'SUCCESS' ? `XONG ${lastSavedTime}` : 'ĐỒNG BỘ CLOUD'}
               </button>
               <button onClick={() => setState(createNewTournamentState())} className="text-[10px] font-black bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl transition-all uppercase tracking-widest">+ Giải mới</button>
             </>
           ) : (
             <button onClick={() => setState(p => ({...p, view: 'BRACKET'}))} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">
               Quay lại Quản lý
             </button>
           )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {state.view === 'DASHBOARD' ? (
          <div className="flex-1 flex flex-col h-full bg-slate-50">
             <div className="p-8 max-w-6xl mx-auto w-full">
                <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white mb-8 shadow-2xl shadow-blue-100 flex justify-between items-center">
                   <div>
                      <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight">Thư viện Giải đấu</h2>
                      <p className="opacity-70 font-bold text-sm uppercase mt-2">Quản lý và Khôi phục dữ liệu an toàn trên trình duyệt của bạn</p>
                   </div>
                   <div className="flex gap-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="px-6 py-4 bg-white text-blue-600 hover:bg-blue-50 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all flex items-center gap-3 border-none"
                      >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                         KHÔI PHỤC FILE (.PRO)
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept=".pro" onChange={handleImportFile} />
                   </div>
                </div>
                <TournamentDashboard 
                  activeId={state.id} 
                  tournaments={tournaments}
                  onLoad={(id) => { 
                    const saved = localStorage.getItem(`${DATA_PREFIX}${id}`); 
                    if (saved) setState(JSON.parse(saved)); 
                  }} 
                  onDelete={handleDeleteTournament} 
                  onCreateNew={() => setState(createNewTournamentState())} 
                  onClose={() => setState(p => ({ ...p, view: 'SETUP' }))} 
                />
             </div>
          </div>
        ) : (
          <>
            <div className="bg-white border-b px-6 py-2.5 flex items-center gap-4 overflow-x-auto print:hidden shadow-sm sticky top-0 z-40">
              <div className="flex gap-2">
                {state.categories.map(cat => (
                  <button key={cat.id} onClick={() => setState(p => ({ ...p, activeCategoryId: cat.id }))} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-3 border ${state.activeCategoryId === cat.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>{cat.name}</button>
                ))}
              </div>
              {!isViewer && <button onClick={() => setIsModalOpen(true)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-black text-lg hover:bg-blue-600 hover:text-white transition-all">+</button>}
            </div>

            {state.view === 'SETUP' && (
              <div className="p-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Đồng bộ Google Sheets (V7.0)</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">1. Web App URL (Deploy từ Script)</label>
                        <input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" value={state.googleSheetId || ''} onChange={e => setState(p => ({ ...p, googleSheetId: e.target.value }))} placeholder="https://script.google.com/..." />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">2. Link File Spreadsheet (Xem nhanh)</label>
                        <input className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" value={state.linkedSpreadsheetUrl || ''} onChange={e => setState(p => ({ ...p, linkedSpreadsheetUrl: e.target.value }))} placeholder="https://docs.google.com/spreadsheets/..." />
                      </div>
                      <button onClick={() => setShowScriptHelper(!showScriptHelper)} className="text-[10px] font-bold text-blue-600 uppercase hover:underline">Hướng dẫn sửa lỗi ghi dữ liệu</button>
                      {showScriptHelper && (
                        <div className="p-4 bg-slate-900 text-white rounded-2xl text-[10px] space-y-3 shadow-2xl">
                          <p className="text-yellow-400 font-black">PHẢI DÙNG CODE V7.0 MỚI NHẤT:</p>
                          <p>1. Copy code V7.0 bằng nút bên dưới.</p>
                          <p>2. Dán vào Apps Script của bạn.</p>
                          <p>3. Chọn <b>Deploy -> New Deployment</b>.</p>
                          <p>4. Access: <b>Anyone</b>.</p>
                          <button onClick={copyGASScript} className="w-full bg-blue-600 py-2.5 rounded-lg font-black uppercase text-[10px]">Copy mã Script V7.0</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-900 p-8 rounded-[2rem] text-white">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Tổ chức giải đấu</h3>
                    <div className="space-y-4 mb-6">
                      <input type="text" className="w-full bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tên giải đấu" value={state.tournamentName} onChange={e => setState(p => ({...p, tournamentName: e.target.value}))} />
                      <input type="text" className="w-full bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Địa điểm" value={state.venue} onChange={e => setState(p => ({...p, venue: e.target.value}))} />
                    </div>
                    <button onClick={() => setState(p => ({ ...p, view: 'DRAW' }))} disabled={activeCategory.players.length < 2} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-500/20 disabled:opacity-30">Đi tới bốc thăm</button>
                  </div>
                </div>
                <div className="lg:col-span-8">
                  <PlayerInput players={activeCategory.players} onAddPlayers={newPlayers => syncTeamsAndBracket([...activeCategory.players, ...newPlayers])} onRemovePlayer={id => syncTeamsAndBracket(activeCategory.players.filter(p => p.id !== id))} eventType={activeCategory.eventType} />
                </div>
              </div>
            )}

            {state.view === 'DRAW' && (
              <div className="p-8 max-w-4xl mx-auto w-full">
                <DrawView 
                  teams={activeCategory.teams} 
                  onFinish={handleFinishDraw} 
                  clubProtection={state.clubProtection} 
                  tournamentName={state.tournamentName}
                  categoryName={activeCategory.name}
                />
              </div>
            )}

            {(state.view === 'BRACKET' || isViewer) && (
              <div className="p-8 h-full flex flex-col">
                 <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
                    <div>
                      <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{activeCategory.name}</h2>
                      <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest italic">🎯 {state.venue || 'Toàn quốc'} | 📅 {state.date}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {!isViewer && (
                        <>
                          <button 
                            onClick={handleExportImage} 
                            disabled={isExportingImage}
                            className={`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center gap-3 transition-all ${isExportingImage ? 'opacity-50 animate-pulse' : ''}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {isExportingImage ? 'ĐANG TẢI ẢNH...' : 'TẢI ẢNH SƠ ĐỒ'}
                          </button>
                          <button onClick={() => setShowScheduleSettings(!showScheduleSettings)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center gap-3">📅 TỰ ĐỘNG XẾP SÂN</button>
                          <button onClick={() => handleManualSync()} disabled={syncStatus === 'SAVING'} className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all ${syncStatus === 'SUCCESS' ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'}`}>
                            {syncStatus === 'SAVING' ? 'ĐANG ĐỒNG BỘ...' : 'CẬP NHẬT TRANG TÍNH'}
                          </button>
                        </>
                      )}
                    </div>
                 </div>

                 {showScheduleSettings && !isViewer && (
                   <div className="mb-8 bg-white p-8 rounded-3xl border-2 border-blue-500 shadow-2xl animate-in slide-in-from-top-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                         <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Số lượng sân</label>
                            <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={courtCountInput} onChange={e => handleCourtCountChange(e.target.value)} />
                         </div>
                         <div className="md:col-span-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Mã số/Tên các sân (Cách nhau dấu phẩy)</label>
                            <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={courtNamesInput} onChange={e => setCourtNamesInput(e.target.value)} placeholder="VD: Sân 1, Sân 2..." />
                         </div>
                         <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Phút/Trận</label>
                            <input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={state.matchDuration} onChange={e => setState(p => ({...p, matchDuration: parseInt(e.target.value)}))} />
                         </div>
                         <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Bắt đầu lúc</label>
                            <input type="time" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={state.startTime} onChange={e => setState(p => ({...p, startTime: e.target.value}))} />
                         </div>
                         <div className="md:col-span-2 flex gap-2">
                            <button onClick={handleAutoSchedule} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-200">XẾP LỊCH</button>
                            <button onClick={() => setShowScheduleSettings(false)} className="px-4 py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase">HỦY</button>
                         </div>
                      </div>
                   </div>
                 )}
                 <div className="flex-1 bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-auto p-0 relative" id="bracket-canvas">
                    <Bracket 
                      matches={activeCategory.matches} 
                      hasThirdPlaceMatch={activeCategory.hasThirdPlaceMatch}
                      onUpdateScore={updateMatchScore} 
                      onUpdateMatchInfo={updateMatchInfo} 
                      tournamentName={state.tournamentName}
                      categoryName={activeCategory.name}
                      isReadOnly={isViewer}
                    />
                 </div>
              </div>
            )}
          </>
        )}
      </main>
      <CategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={onAddCategory} />
    </div>
  );
};

export default App;
