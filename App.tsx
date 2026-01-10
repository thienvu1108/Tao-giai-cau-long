
import React, { useState, useEffect, useRef } from 'react';
import { EventType, Player, Team, Match, TournamentState, AppView, EventCategory, TournamentMetadata, TournamentFormat } from './types.js';
import PlayerInput from './components/PlayerInput.js';
import Bracket from './components/Bracket.js';
import DrawView from './components/DrawView.js';
import CategoryModal from './components/CategoryModal.js';
import TournamentDashboard from './components/TournamentDashboard.js';
import GroupStageView from './components/GroupStageView.js';
import { 
  createTeams, buildInitialBracket, fillBracketWithTeams, assignCourtsAndTime, 
  recalculateBracket, generateGroups, calculateGroupRankings 
} from './services/tournamentLogic.js';
import { syncToGoogleSheet, getGASCode } from './services/googleSheetService.js';
import { exportTournamentToCSV, exportTournamentToPro } from './services/exportService.js';

const INDEX_KEY = 'badminton_tournaments_index_v1';
const DATA_PREFIX = 'badminton_data_';

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
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
      categories: [{
        id: catId,
        name: 'NỘI DUNG MẶC ĐỊNH',
        eventType: EventType.DOUBLES,
        format: TournamentFormat.SINGLE_ELIMINATION,
        players: [], teams: [], matches: [], groups: [],
        isDrawDone: false,
        hasThirdPlaceMatch: true,
        teamsPerGroup: 3,
        advancePerGroup: 2
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

  const updateIndex = (s: TournamentState) => {
    const indexStr = localStorage.getItem(INDEX_KEY);
    let index: TournamentMetadata[] = indexStr ? JSON.parse(indexStr) : [];
    
    const meta: TournamentMetadata = {
      id: s.id,
      name: s.tournamentName,
      date: s.date || '',
      venue: s.venue || '',
      playerCount: s.categories.reduce((acc, cat) => acc + cat.players.length, 0),
      lastUpdated: Date.now(),
      isCloudLinked: !!s.linkedSpreadsheetUrl
    };

    const existingIdx = index.findIndex(t => t.id === s.id);
    if (existingIdx >= 0) {
      index[existingIdx] = meta;
    } else {
      index.push(meta);
    }
    
    index.sort((a, b) => b.lastUpdated - a.lastUpdated);
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    setTournaments(index);
  };

  useEffect(() => {
    const indexStr = localStorage.getItem(INDEX_KEY);
    if (indexStr) setTournaments(JSON.parse(indexStr).sort((a: any, b: any) => b.lastUpdated - a.lastUpdated));
  }, []);

  useEffect(() => {
    if (!state.id) return;
    localStorage.setItem(`${DATA_PREFIX}${state.id}`, JSON.stringify(state));
    localStorage.setItem('last_active_tournament', state.id);
    updateIndex(state);
  }, [state]);

  const activeCategory = state.categories.find(c => c.id === state.activeCategoryId) || state.categories[0];

  const updateCategory = (categoryId: string, updates: Partial<EventCategory>) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === categoryId ? { ...c, ...updates } : c)
    }));
  };

  const syncTeamsAndBracket = (newPlayers: Player[]) => {
    const teams = createTeams(newPlayers, activeCategory.eventType);
    updateCategory(activeCategory.id, { players: newPlayers, teams });
  };

  const updateMatchScore = (matchId: string, scoreA: number, scoreB: number) => {
    if (state.view === 'GROUP_STAGE') {
      const updatedGroups = activeCategory.groups.map(g => ({
        ...g,
        matches: g.matches.map(m => m.id === matchId ? { ...m, scoreA, scoreB } : m)
      }));
      updateCategory(activeCategory.id, { groups: updatedGroups });
    } else {
      const updatedMatches = activeCategory.matches.map(m => m.id === matchId ? { ...m, scoreA, scoreB } : m);
      updateCategory(activeCategory.id, { matches: recalculateBracket(updatedMatches) });
    }
  };

  const onAddCategory = (name: string, type: EventType, format: TournamentFormat, hasThirdPlace: boolean) => {
    const newCat: EventCategory = {
      id: `cat-${Date.now()}`,
      name: name.toUpperCase(),
      eventType: type,
      format,
      players: [], teams: [], matches: [], groups: [],
      isDrawDone: false,
      hasThirdPlaceMatch: hasThirdPlace,
      teamsPerGroup: 3, advancePerGroup: 1
    };
    setState(prev => ({ ...prev, categories: [...prev.categories, newCat], activeCategoryId: newCat.id }));
  };

  const handleFinishDraw = (shuffledTeams: Team[]) => {
    if (activeCategory.format === TournamentFormat.GROUP_STAGE_ELIMINATION) {
      const groups = generateGroups(shuffledTeams, activeCategory.teamsPerGroup);
      updateCategory(activeCategory.id, { groups, teams: shuffledTeams, isDrawDone: true });
      setState(prev => ({ ...prev, view: 'GROUP_STAGE' }));
    } else {
      const initialMatches = buildInitialBracket(shuffledTeams.length, activeCategory.hasThirdPlaceMatch);
      const filledMatches = fillBracketWithTeams(shuffledTeams, initialMatches);
      updateCategory(activeCategory.id, { matches: filledMatches, isDrawDone: true, teams: shuffledTeams });
      setState(prev => ({ ...prev, view: 'BRACKET' }));
    }
  };

  const handleFinishGroupStage = () => {
    const advancingTeams: Team[] = [];
    activeCategory.groups.forEach(group => {
      const rankings = calculateGroupRankings(group);
      const winners = rankings.slice(0, activeCategory.advancePerGroup);
      winners.forEach(stat => {
        const team = group.teams.find(t => t.id === stat.teamId);
        if (team) advancingTeams.push(team);
      });
    });

    if (advancingTeams.length < 2) {
      alert("Cần ít nhất 2 đội vượt qua vòng bảng để tạo sơ đồ Knockout!");
      return;
    }

    const initialMatches = buildInitialBracket(advancingTeams.length, activeCategory.hasThirdPlaceMatch);
    const filledMatches = fillBracketWithTeams(advancingTeams, initialMatches);
    updateCategory(activeCategory.id, { matches: filledMatches });
    setState(prev => ({ ...prev, view: 'BRACKET' }));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedState = JSON.parse(content) as TournamentState;
        
        // Basic validation
        if (importedState.id && importedState.tournamentName && importedState.categories) {
          // Update ID to avoid conflicts if it's an old file or shared file
          importedState.id = `t-import-${Date.now()}`;
          importedState.lastUpdated = Date.now();
          
          setState(importedState);
          alert(`Đã nhập giải đấu "${importedState.tournamentName}" thành công!`);
          setState(prev => ({ ...prev, view: 'SETUP' }));
        } else {
          throw new Error("Cấu trúc tệp không hợp lệ.");
        }
      } catch (err) {
        alert("Lỗi: Tệp .pro không hợp lệ hoặc bị hỏng.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isViewer = state.view === 'VIEWER';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportFile} 
        accept=".pro" 
        className="hidden" 
      />

      <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center z-50 print:hidden">
        <div className="flex items-center gap-6">
          <button onClick={() => setState(p => ({ ...p, view: 'DASHBOARD' }))} className="flex items-center gap-3">
            <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-xl">🏸</div>
            <div className="text-left">
               <h1 className="text-sm font-black uppercase">{state.tournamentName}</h1>
               <p className="text-[9px] font-bold text-slate-500 uppercase">{isViewer ? 'KHÁN GIẢ' : 'Quản lý'}</p>
            </div>
          </button>
          
          {state.view !== 'DASHBOARD' && !isViewer && (
            <div className="flex bg-slate-800 p-1 rounded-xl gap-0.5">
              <button onClick={() => setState(p => ({ ...p, view: 'SETUP' }))} className={`px-5 py-2 text-[9px] font-black rounded-lg ${state.view === 'SETUP' ? 'bg-blue-600' : 'text-slate-500'}`}>CÀI ĐẶT</button>
              <button onClick={() => setState(p => ({ ...p, view: 'DRAW' }))} className={`px-5 py-2 text-[9px] font-black rounded-lg ${state.view === 'DRAW' ? 'bg-blue-600' : 'text-slate-500'}`}>BỐC THĂM</button>
              {activeCategory.format === TournamentFormat.GROUP_STAGE_ELIMINATION && (
                <button onClick={() => setState(p => ({ ...p, view: 'GROUP_STAGE' }))} className={`px-5 py-2 text-[9px] font-black rounded-lg ${state.view === 'GROUP_STAGE' ? 'bg-blue-600' : 'text-slate-500'}`}>VÒNG BẢNG</button>
              )}
              <button onClick={() => setState(p => ({ ...p, view: 'BRACKET' }))} className={`px-5 py-2 text-[9px] font-black rounded-lg ${state.view === 'BRACKET' ? 'bg-blue-600' : 'text-slate-500'}`}>SƠ ĐỒ</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(state.view === 'BRACKET' || state.view === 'GROUP_STAGE') && (
             <button 
                onClick={() => exportTournamentToCSV(state)}
                className="text-[10px] font-black bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg"
             >
               📊 XUẤT EXCEL KẾT QUẢ
             </button>
          )}
          {state.view === 'SETUP' && (
            <button 
              onClick={() => exportTournamentToPro(state)} 
              className="text-[10px] font-black bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl flex items-center gap-2"
              title="Lưu file .pro"
            >
              💾 LƯU FILE
            </button>
          )}
          <button onClick={() => setState(p => ({...p, view: 'DASHBOARD'}))} className="text-[10px] font-black bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl">TRANG CHỦ</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {state.view === 'DASHBOARD' ? (
          <TournamentDashboard 
             activeId={state.id} 
             tournaments={tournaments} 
             onLoad={(id) => { const s = localStorage.getItem(`${DATA_PREFIX}${id}`); if(s) setState(JSON.parse(s)); }} 
             onDelete={(id) => {
               if(window.confirm("Bạn có chắc chắn muốn xóa giải đấu này?")) {
                 localStorage.removeItem(`${DATA_PREFIX}${id}`);
                 const index = tournaments.filter(t => t.id !== id);
                 localStorage.setItem(INDEX_KEY, JSON.stringify(index));
                 setTournaments(index);
                 if (state.id === id) setState(createNewTournamentState());
               }
             }} 
             onCreateNew={() => setState(createNewTournamentState())} 
             onClose={() => setState(p => ({...p, view: 'SETUP'}))}
             onImportClick={() => fileInputRef.current?.click()}
          />
        ) : (
          <>
            <div className="bg-white border-b px-6 py-2.5 flex items-center gap-2 sticky top-0 z-40 print:hidden">
              {state.categories.map(cat => (
                <button key={cat.id} onClick={() => setState(p => ({ ...p, activeCategoryId: cat.id }))} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase ${state.activeCategoryId === cat.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}>{cat.name}</button>
              ))}
              <button onClick={() => setIsModalOpen(true)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-black">+</button>
            </div>

            {state.view === 'SETUP' && (
              <div className="p-8 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-slate-900 p-8 rounded-[2rem] text-white">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase mb-6">Thông tin Giải đấu</h3>
                    <div className="space-y-4">
                       <div>
                          <label className="block text-[10px] text-slate-400 uppercase mb-2">Tên giải đấu</label>
                          <input type="text" value={state.tournamentName} onChange={e => setState(p => ({...p, tournamentName: e.target.value}))} className="w-full bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                       </div>
                       <div>
                          <label className="block text-[10px] text-slate-400 uppercase mb-2">Địa điểm</label>
                          <input type="text" value={state.venue || ''} onChange={e => setState(p => ({...p, venue: e.target.value}))} className="w-full bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase mb-2">Số đội / Bảng</label>
                            <input type="number" value={activeCategory.teamsPerGroup} onChange={e => updateCategory(activeCategory.id, { teamsPerGroup: parseInt(e.target.value) })} className="w-full bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase mb-2">Đội đi tiếp / Bảng</label>
                            <input type="number" value={activeCategory.advancePerGroup} onChange={e => updateCategory(activeCategory.id, { advancePerGroup: parseInt(e.target.value) })} className="w-full bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                       </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-800 space-y-3">
                      <button onClick={() => setState(p => ({ ...p, view: 'DRAW' }))} disabled={activeCategory.players.length < 2} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black text-[11px] uppercase transition-all">Tiến hành bốc thăm</button>
                      <button onClick={() => exportTournamentToPro(state)} className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-black text-[10px] uppercase text-slate-400 transition-all flex items-center justify-center gap-2">
                        📥 Tải file .pro để lưu trữ
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Ghi chú nhanh</h3>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      "Hãy đảm bảo danh sách vận động viên chính xác trước khi bốc thăm. Tệp .pro chứa toàn bộ dữ liệu hiện tại, bao gồm cả điểm số và lịch thi đấu."
                    </p>
                  </div>
                </div>
                <div className="lg:col-span-8">
                  <PlayerInput players={activeCategory.players} onAddPlayers={newPlayers => syncTeamsAndBracket([...activeCategory.players, ...newPlayers])} onRemovePlayer={id => syncTeamsAndBracket(activeCategory.players.filter(p => p.id !== id))} eventType={activeCategory.eventType} />
                </div>
              </div>
            )}

            {state.view === 'DRAW' && (
              <DrawView 
                teams={activeCategory.teams} 
                onFinish={handleFinishDraw} 
                clubProtection={state.clubProtection} 
                tournamentName={state.tournamentName} 
                categoryName={activeCategory.name}
                isGroupStage={activeCategory.format === TournamentFormat.GROUP_STAGE_ELIMINATION}
              />
            )}

            {state.view === 'GROUP_STAGE' && (
              <GroupStageView 
                groups={activeCategory.groups} 
                onUpdateScore={updateMatchScore} 
                onFinishStage={handleFinishGroupStage} 
                isReadOnly={isViewer} 
              />
            )}

            {state.view === 'BRACKET' && (
              <div className="p-8 h-full bg-white">
                 <Bracket 
                   matches={activeCategory.matches} hasThirdPlaceMatch={activeCategory.hasThirdPlaceMatch} 
                   onUpdateScore={updateMatchScore} tournamentName={state.tournamentName} categoryName={activeCategory.name} isReadOnly={isViewer} 
                 />
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
