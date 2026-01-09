
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EventType, Player, Team, Match, TournamentState, AppView, EventCategory } from './types';
import PlayerInput from './components/PlayerInput';
import Bracket from './components/Bracket';
import DrawView from './components/DrawView';
import CategoryModal from './components/CategoryModal';
import { createTeams, buildInitialBracket, advanceWinner, fillBracketWithTeams } from './services/tournamentLogic';
import { exportTournamentToCSV } from './services/exportService';
import { syncToGoogleSheet, getGASCode } from './services/googleSheetService';

const STORAGE_KEY = 'badminton_pro_v5_final';

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showScriptHelper, setShowScriptHelper] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);
  
  const [state, setState] = useState<TournamentState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.categories && parsed.categories.length > 0) return parsed;
      } catch (e) { console.error("Restore state error", e); }
    }
    const firstId = `cat-${Date.now()}`;
    return {
      tournamentName: 'GIẢI CẦU LÔNG MỞ RỘNG 2025',
      venue: 'Sân vận động Quân khu 7',
      date: new Date().toISOString().split('T')[0],
      organizer: 'CLB Cầu lông Pro',
      googleSheetId: '',
      linkedSpreadsheetUrl: '',
      categories: [{
        id: firstId,
        name: 'NỘI DUNG MẶC ĐỊNH',
        eventType: EventType.DOUBLES,
        players: [],
        teams: [],
        matches: [],
        isDrawDone: false
      }],
      activeCategoryId: firstId,
      view: 'SETUP',
      clubProtection: true
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    if (state.googleSheetId && state.googleSheetId.startsWith('http')) {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      setSyncStatus('SAVING');
      setSyncErrorMessage(null);
      
      debounceTimerRef.current = window.setTimeout(async () => {
        const result = await syncToGoogleSheet(state.googleSheetId!, state);
        if (result.success) {
          setSyncStatus('SUCCESS');
          setLastSaved(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
          
          if (result.spreadsheetUrl && result.spreadsheetUrl !== state.linkedSpreadsheetUrl) {
            setState(prev => ({ ...prev, linkedSpreadsheetUrl: result.spreadsheetUrl }));
          }
          
          setTimeout(() => setSyncStatus('IDLE'), 3000);
        } else {
          setSyncStatus('ERROR');
          setSyncErrorMessage(result.error || 'Lỗi không xác định');
        }
      }, 2500);
    }
  }, [state.tournamentName, state.categories, state.googleSheetId]);

  const activeCategory = state.categories.find(c => c.id === state.activeCategoryId) || state.categories[0];

  const updateCategory = useCallback((categoryId: string, updates: Partial<EventCategory>) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === categoryId ? { ...c, ...updates } : c)
    }));
  }, []);

  const syncTeamsAndBracket = (updatedPlayers: Player[]) => {
    const newTeams = createTeams(updatedPlayers, activeCategory.eventType);
    const initialMatches = buildInitialBracket(newTeams.length);
    const placeholderTeams = newTeams.map((t, idx) => ({
      ...t,
      players: t.players.map(p => ({ ...p, name: `VỊ TRÍ ${idx + 1}` }))
    }));
    const structuredMatches = fillBracketWithTeams(placeholderTeams, initialMatches);
    updateCategory(activeCategory.id, { players: updatedPlayers, teams: newTeams, matches: structuredMatches, isDrawDone: false });
  };

  const handleAddPlayers = (newPlayers: Player[]) => {
    const updatedPlayers = [...activeCategory.players, ...newPlayers];
    syncTeamsAndBracket(updatedPlayers);
  };

  const handleRemovePlayer = (playerId: string) => {
    const updatedPlayers = activeCategory.players.filter(p => p.id !== playerId);
    syncTeamsAndBracket(updatedPlayers);
  };

  const handleFinishDraw = (shuffledTeams: Team[]) => {
    const initialMatches = buildInitialBracket(shuffledTeams.length);
    const filledMatches = fillBracketWithTeams(shuffledTeams, initialMatches);
    updateCategory(activeCategory.id, { matches: filledMatches, isDrawDone: true, teams: shuffledTeams });
    setState(prev => ({ ...prev, view: 'BRACKET' }));
  };

  const handleExportCSV = () => {
    exportTournamentToCSV(state);
  };

  const updateMatchScore = (matchId: string, s1: number, s2: number) => {
    const newMatches = activeCategory.matches.map(m => m.id === matchId ? { ...m, scoreA: s1, scoreB: s2 } : m);
    const advancedMatches = advanceWinner(newMatches, matchId);
    updateCategory(activeCategory.id, { matches: advancedMatches });
  };

  const onAddCategory = (name: string, type: EventType) => {
    const newId = `cat-${Date.now()}`;
    const newCategory: EventCategory = { id: newId, name, eventType: type, players: [], teams: [], matches: [], isDrawDone: false };
    setState(prev => ({ ...prev, categories: [...prev.categories, newCategory], activeCategoryId: newId, view: 'SETUP' }));
  };

  const removeCategory = (id: string) => {
    if (!confirm("Xóa nội dung này?")) return;
    setState(prev => {
      const remaining = prev.categories.filter(c => c.id !== id);
      if (remaining.length === 0) {
        const newId = `cat-${Date.now()}`;
        return { ...prev, categories: [{ id: newId, name: 'NỘI DUNG MẶC ĐỊNH', eventType: EventType.DOUBLES, players: [], teams: [], matches: [], isDrawDone: false }], activeCategoryId: newId, view: 'SETUP' };
      }
      return { ...prev, categories: remaining, activeCategoryId: remaining[0].id, view: 'SETUP' };
    });
  };

  const resetAll = () => { if (confirm("Xóa TOÀN BỘ dữ liệu?")) { localStorage.removeItem(STORAGE_KEY); window.location.reload(); } };

  const copyGASScript = () => {
    navigator.clipboard.writeText(getGASCode());
    alert("Đã sao chép mã Script! Đừng quên CHẠY HÀM 'setup' trong Google Script để cấp quyền.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center print:hidden shadow-xl relative z-50">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30">🏸</div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none">{state.tournamentName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Management Pro System</p>
              {state.googleSheetId && (
                <div className={`flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-full border transition-all ${
                  syncStatus === 'SAVING' ? 'bg-blue-500/10 border-blue-500/30' : 
                  syncStatus === 'SUCCESS' ? 'bg-green-500/10 border-green-500/30' : 
                  syncStatus === 'ERROR' ? 'bg-red-500/10 border-red-500/30 animate-pulse' : 'bg-slate-500/10 border-slate-500/30'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'SAVING' ? 'bg-blue-400 animate-pulse' : syncStatus === 'SUCCESS' ? 'bg-green-400' : syncStatus === 'ERROR' ? 'bg-red-400' : 'bg-slate-400'}`}></div>
                  <span className={`text-[8px] font-black uppercase tracking-wider ${syncStatus === 'SAVING' ? 'text-blue-400' : syncStatus === 'SUCCESS' ? 'text-green-400' : syncStatus === 'ERROR' ? 'text-red-400' : 'text-slate-400'}`}>
                    {syncStatus === 'SAVING' ? 'Đang đồng bộ...' : syncStatus === 'SUCCESS' ? `Đã lưu (${lastSaved})` : syncStatus === 'ERROR' ? 'Lỗi Cloud' : 'Cloud Active'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <nav className="flex bg-slate-800 p-1.5 rounded-2xl gap-1">
          {(['SETUP', 'DRAW', 'BRACKET'] as AppView[]).map(v => (
            <button key={v} onClick={() => setState(p => ({ ...p, view: v }))} className={`px-8 py-3 text-[10px] font-black rounded-xl transition-all ${state.view === v ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
              {v === 'SETUP' ? 'CÀI ĐẶT' : v === 'DRAW' ? 'BỐC THĂM' : 'SƠ ĐỒ'}
            </button>
          ))}
        </nav>
        <button onClick={resetAll} className="text-[9px] font-black text-slate-500 hover:text-red-400 uppercase tracking-[0.2em] transition-colors">Reset</button>
      </header>

      {syncStatus === 'ERROR' && (
        <div className="bg-red-500 text-white px-6 py-3 text-[10px] font-bold text-center animate-in slide-in-from-top duration-300 shadow-xl">
          ⚠️ {syncErrorMessage} | <span className="underline">Hành động cần thiết:</span> Copy lại Script mới, CHẠY hàm "setup" và Deploy lại với quyền "Anyone".
        </div>
      )}

      <div className="bg-white border-b px-6 py-3 flex items-center gap-4 overflow-x-auto print:hidden shadow-sm sticky top-0 z-40">
        <div className="flex gap-2">
          {state.categories.map(cat => (
            <div key={cat.id} className="group relative">
              <button onClick={() => setState(p => ({ ...p, activeCategoryId: cat.id, view: 'SETUP' }))} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 border-2 ${state.activeCategoryId === cat.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                {cat.name}
                <span className={`px-2 py-0.5 rounded-md text-[8px] ${state.activeCategoryId === cat.id ? 'bg-blue-500 text-white' : 'bg-slate-100'}`}>{cat.players.length}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); removeCategory(cat.id); }} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-all shadow-md">×</button>
            </div>
          ))}
        </div>
        <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-black text-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center">+</button>
      </div>

      <main className="flex-1 overflow-y-auto">
        {state.view === 'SETUP' && (
          <div className="p-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Cấu hình Cloud (Google Sheets)
                </h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên giải đấu (Tên file Trang tính)</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      value={state.tournamentName}
                      onChange={e => setState(p => ({ ...p, tournamentName: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Web App URL (Triển khai từ GAS)</label>
                      <button onClick={() => setShowScriptHelper(!showScriptHelper)} className="text-[8px] font-black text-blue-600 hover:underline uppercase">Fix lỗi Cloud</button>
                    </div>
                    <div className="relative">
                      <input 
                        className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none pr-10 ${state.googleSheetId ? (syncStatus === 'ERROR' ? 'border-red-200 bg-red-50/20' : 'border-green-200 bg-green-50/20') : 'border-slate-100'}`}
                        value={state.googleSheetId || ''}
                        onChange={e => setState(p => ({ ...p, googleSheetId: e.target.value }))}
                        placeholder="Dán URL Web App tại đây..."
                      />
                    </div>
                    {showScriptHelper && (
                      <div className="mt-4 p-5 bg-indigo-900 text-white rounded-2xl shadow-xl animate-in slide-in-from-top-2 border-t-4 border-yellow-500">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
                           <span className="bg-yellow-500 text-black px-1 rounded">BẮT BUỘC</span> Quy trình Fix lỗi:
                        </p>
                        <ol className="text-[9px] font-bold space-y-3 list-decimal ml-4 text-indigo-100">
                          <li>Click "Copy Script" dưới đây.</li>
                          <li>Dán vào Apps Script -> Save.</li>
                          <li className="text-yellow-400">Chọn hàm <span className="bg-white/10 px-1 rounded">setup</span> và nhấn <span className="bg-white/10 px-1 rounded">Run</span>.</li>
                          <li>Xác thực quyền khi bảng hiện ra (Review Permissions).</li>
                          <li>Nhấn "Deploy" -> "New Deployment".</li>
                          <li className="text-green-400">Execute as: "Me", Who has access: "Anyone".</li>
                        </ol>
                        <button onClick={copyGASScript} className="mt-5 w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Sao chép mã Script mới</button>
                      </div>
                    )}
                  </div>
                  
                  {state.linkedSpreadsheetUrl && (
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                      <p className="text-[9px] font-black text-green-600 uppercase mb-2">File đã liên kết thành công:</p>
                      <a href={state.linkedSpreadsheetUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                        Mở Google Sheets kết quả
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Trạng thái</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 p-4 rounded-2xl"><p className="text-[9px] font-bold text-slate-500 uppercase">VĐV</p><p className="text-3xl font-black text-blue-400">{activeCategory.players.length}</p></div>
                  <div className="bg-slate-800 p-4 rounded-2xl"><p className="text-[9px] font-bold text-slate-500 uppercase">Kết nối</p><p className={`text-[10px] font-black uppercase mt-2 ${state.linkedSpreadsheetUrl ? 'text-green-400' : 'text-slate-500'}`}>{state.linkedSpreadsheetUrl ? 'ĐÃ KẾT NỐI' : 'CHƯA CẤU HÌNH'}</p></div>
                </div>
                <button onClick={() => setState(p => ({ ...p, view: 'DRAW' }))} disabled={activeCategory.players.length < 2} className="w-full mt-8 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-30 shadow-lg">Tiến hành bốc thăm</button>
              </div>
            </div>
            
            <div className="lg:col-span-8">
              <PlayerInput players={activeCategory.players} onAddPlayers={handleAddPlayers} onRemovePlayer={handleRemovePlayer} eventType={activeCategory.eventType} />
            </div>
          </div>
        )}

        {state.view === 'DRAW' && <div className="p-8 max-w-4xl mx-auto w-full"><DrawView teams={activeCategory.teams} onFinish={handleFinishDraw} clubProtection={state.clubProtection} /></div>}

        {state.view === 'BRACKET' && (
          <div className="p-8 h-full flex flex-col">
             <div className="mb-10 flex justify-between items-end print:hidden">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter">{activeCategory.name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-slate-500 text-xs font-bold uppercase">
                    <span>📍 {state.venue}</span><span>📅 {state.date}</span>
                    {state.linkedSpreadsheetUrl && <a href={state.linkedSpreadsheetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-black">☁️ XEM TRANG TÍNH CLOUD</a>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all">Xuất CSV</button>
                  <button onClick={() => window.print()} className="bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all">In / PDF</button>
                </div>
             </div>
             <div className="flex-1 bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-auto p-4">
                <Bracket matches={activeCategory.matches} onUpdateScore={updateMatchScore} />
             </div>
          </div>
        )}
      </main>

      <CategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={onAddCategory} />
    </div>
  );
};

export default App;
