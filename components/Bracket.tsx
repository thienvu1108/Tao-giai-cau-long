
import React, { useState, useMemo } from 'react';
import { Match, Team, RoundKey } from '../types';

interface BracketProps {
  matches: Match[];
  hasThirdPlaceMatch: boolean;
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number) => void;
  onUpdateMatchInfo?: (matchId: string, court: string, time: string) => void;
  tournamentName: string;
  categoryName: string;
}

const MATCH_BOX_HEIGHT = 130; 
const BASE_GAP = 40;

const TeamRow: React.FC<{ 
  team?: Team | null; 
  score?: number; 
  isWinner: boolean; 
  onScoreChange: (val: number) => void;
  defaultLabel: string;
  isSpecial?: 'SF' | 'F' | '3RD' | null;
  isHighlighted: boolean;
}> = ({ team, score, isWinner, onScoreChange, defaultLabel, isSpecial, isHighlighted }) => {
  const isBye = !team;
  const isPlaceholder = team?.players?.[0]?.name?.startsWith('VỊ TRÍ');
  const displayCode = team?.teamCode || defaultLabel;
  
  let winnerBg = 'bg-blue-600';
  let winnerSideBg = 'bg-blue-700';

  if (isSpecial === 'F') {
    winnerBg = 'bg-yellow-500';
    winnerSideBg = 'bg-yellow-600';
  } else if (isSpecial === 'SF') {
    winnerBg = 'bg-indigo-600';
    winnerSideBg = 'bg-indigo-700';
  } else if (isSpecial === '3RD') {
    winnerBg = 'bg-orange-500';
    winnerSideBg = 'bg-orange-600';
  }

  const renderPlayers = () => {
    if (!team) return null;
    const { players } = team;
    if (players.length === 2) {
      const sameClub = players[0].club === players[1].club;
      return (
        <div className="flex flex-col justify-center h-full py-2">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className={`text-[11px] font-bold truncate uppercase ${isWinner ? 'text-white' : isPlaceholder ? 'text-slate-400 italic' : 'text-slate-900'}`}>
              {players[0].name}
            </span>
            {!sameClub && players[0].club && !isPlaceholder && (
              <span className={`text-[8px] font-medium px-1 bg-slate-100 rounded ${isWinner ? 'bg-white/20 text-white' : 'text-slate-400'}`}>
                {players[0].club}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 leading-tight mt-0.5">
            <span className={`text-[11px] font-bold truncate uppercase ${isWinner ? 'text-white' : isPlaceholder ? 'text-slate-400 italic' : 'text-slate-900'}`}>
              {players[1].name}
            </span>
            {!sameClub && players[1].club && !isPlaceholder && (
              <span className={`text-[8px] font-medium px-1 bg-slate-100 rounded ${isWinner ? 'bg-white/20 text-white' : 'text-slate-400'}`}>
                {players[1].club}
              </span>
            )}
          </div>
          {sameClub && players[0].club && !isPlaceholder && (
            <div className={`text-[8px] font-black uppercase tracking-widest mt-1 ${isWinner ? 'text-white/70' : 'text-blue-500'}`}>
              {players[0].club}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="flex flex-col justify-center h-full">
        <span className={`text-[11px] font-bold truncate uppercase ${isWinner ? 'text-white' : isPlaceholder ? 'text-slate-400 italic' : 'text-slate-900'}`}>
          {players[0].name}
        </span>
        {players[0].club && !isPlaceholder && (
          <span className={`text-[8px] font-medium px-1 bg-slate-100 rounded mt-0.5 ${isWinner ? 'bg-white/20 text-white' : 'text-slate-400'}`}>
            {players[0].club}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`flex items-center w-full h-[52px] border-b border-slate-100 last:border-0 transition-all duration-300 
      ${isHighlighted ? 'bg-blue-50 ring-inset ring-2 ring-blue-400' : ''} 
      ${isWinner ? `${winnerBg} text-white` : ''}`}>
      <div className={`w-8 flex-shrink-0 text-[9px] font-black flex items-center justify-center h-full border-r border-slate-100/10 
        ${isHighlighted && !isWinner ? 'bg-blue-100 text-blue-700' : isWinner ? `${winnerSideBg} text-white` : 'bg-slate-50 text-slate-500'}`}>
        {displayCode}
      </div>
      <div className="flex-1 px-3 overflow-hidden h-full">
        {isBye ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px] font-black text-slate-300 italic uppercase tracking-widest">Đang chờ...</span>
          </div>
        ) : renderPlayers()}
      </div>
      {!isBye && (
        <input
          type="number"
          value={score ?? ''}
          placeholder="0"
          className={`w-10 h-full text-center border-l text-[13px] font-black outline-none transition-colors ${
            isWinner ? `${winnerSideBg} border-white/20 text-white` : 
            isHighlighted ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50 border-slate-100 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500'
          }`}
          onChange={(e) => onScoreChange(parseInt(e.target.value) || 0)}
        />
      )}
    </div>
  );
};

const Bracket: React.FC<BracketProps> = ({ matches, hasThirdPlaceMatch, onUpdateScore, onUpdateMatchInfo, tournamentName, categoryName }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [tempCourt, setTempCourt] = useState('');
  const [tempTime, setTempTime] = useState('');
  const [zoom, setZoom] = useState(1);

  if (!matches || matches.length === 0) return (
    <div className="flex items-center justify-center h-full p-20 text-slate-300 italic font-medium text-center">
      Vui lòng thêm vận động viên và tiến hành bốc thăm để xem sơ đồ.
    </div>
  );

  const maxRoundIdx = Math.max(...matches.map(m => m.roundIndex));
  const finalMatch = matches.find(m => m.roundKey === 'F');
  const thirdMatch = matches.find(m => m.roundKey === '3RD');
  const sfMatches = matches.filter(m => m.roundKey === 'SF');

  const getRoundLabelText = (roundKey: RoundKey) => {
    switch (roundKey) {
      case 'PLAYIN': return 'Sơ loại';
      case 'F': return 'Chung kết';
      case '3RD': return 'Hạng 3';
      case 'SF': return 'Bán kết';
      case 'QF': return 'Tứ kết';
      case 'R16': return 'Vòng 1/8';
      case 'R32': return 'Vòng 1/16';
      case 'R64': return 'Vòng 1/32';
      default: return roundKey;
    }
  };

  const isTeamMatchSearch = (team?: Team | null) => {
    if (!team || !searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    const nameMatch = team.players.some(p => p.name.toLowerCase().includes(q));
    const clubMatch = team.club.toLowerCase().includes(q);
    const codeMatch = team.teamCode.toLowerCase().includes(q);
    return nameMatch || clubMatch || codeMatch;
  };

  const startEditMatch = (m: Match) => {
    setEditingMatchId(m.id);
    setTempCourt(m.court || '');
    setTempTime(m.scheduledTime || '');
  };

  const saveMatchInfo = () => {
    if (editingMatchId && onUpdateMatchInfo) {
      onUpdateMatchInfo(editingMatchId, tempCourt, tempTime);
    }
    setEditingMatchId(null);
  };

  const renderRoundColumn = (roundIdx: number) => {
    const roundMatches = matches.filter(m => m.roundIndex === roundIdx).sort((a, b) => a.position - b.position);
    if (roundMatches.length === 0) return null;

    const cellHeight = (MATCH_BOX_HEIGHT + BASE_GAP) * Math.pow(2, roundIdx);
    const verticalTravel = cellHeight / 2; 

    const label = roundIdx === 0 ? 'SƠ LOẠI' : getRoundLabelText(roundMatches[0].roundKey);

    return (
      <div key={roundIdx} className="flex flex-col flex-1 min-w-[320px] relative">
        <div className="sticky top-0 bg-slate-900 text-white py-4 text-center z-[45] shadow-xl border-b border-white/5">
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">{label}</span>
          <p className="text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{roundMatches.length} TRẬN</p>
        </div>
        
        <div className="flex flex-col py-10 px-6 relative">
          {roundMatches.map((m) => {
            const hasWinner = m.scoreA !== undefined && m.scoreB !== undefined && (m.scoreA > 0 || m.scoreB > 0) && m.scoreA !== m.scoreB;
            const isWinnerA = hasWinner && (m.scoreA ?? 0) > (m.scoreB ?? 0);
            const isWinnerB = hasWinner && (m.scoreB ?? 0) > (m.scoreA ?? 0);
            const specialType = m.roundKey === 'F' ? 'F' : m.roundKey === 'SF' ? 'SF' : m.roundKey === '3RD' ? '3RD' : null;
            const highlightA = isTeamMatchSearch(m.teamA);
            const highlightB = isTeamMatchSearch(m.teamB);
            const hasMatchHighlight = highlightA || highlightB;

            let headerBg = 'bg-slate-900';
            if (hasMatchHighlight) headerBg = 'bg-blue-600';
            else if (specialType === 'F') headerBg = 'bg-yellow-500';
            else if (specialType === 'SF') headerBg = 'bg-indigo-600';
            else if (specialType === '3RD') headerBg = 'bg-orange-500';

            const showConnector = m.next && m.roundKey !== 'F' && m.roundKey !== '3RD';
            const isTargetSlotA = m.next?.targetSlot === 'A';
            const connectorColor = hasWinner ? (specialType === 'F' ? 'border-yellow-400' : 'border-blue-500') : 'border-slate-200';

            return (
              <div 
                key={m.id} 
                className="relative flex items-center justify-center" 
                style={{ height: cellHeight }}
              >
                {showConnector && (
                  <div className="absolute left-full top-1/2 w-8 h-px pointer-events-none z-0 overflow-visible">
                    <div className={`absolute left-0 top-0 w-4 border-t-2 ${connectorColor}`}></div>
                    <div 
                      className={`absolute left-4 border-l-2 ${connectorColor}`}
                      style={{
                        top: isTargetSlotA ? '0' : `-${verticalTravel}px`,
                        height: `${verticalTravel}px`
                      }}
                    ></div>
                    <div 
                      className={`absolute left-4 w-4 border-t-2 ${connectorColor}`}
                      style={{
                        top: isTargetSlotA ? `${verticalTravel}px` : `-${verticalTravel}px`
                      }}
                    ></div>
                  </div>
                )}

                <div className="relative w-full max-w-[260px] flex flex-col z-10 group scale-[0.9] origin-center">
                  <div className="flex justify-between items-end h-6 px-1">
                    <div className={`${headerBg} text-white text-[8px] font-black px-2.5 py-1 rounded-t-lg shadow-sm border-t border-x border-white/20 transition-all duration-300 relative -bottom-[1px] z-20`}>
                      #T{m.matchNumber}
                    </div>
                    <div className="flex gap-1 mb-0.5 items-center">
                      {editingMatchId === m.id ? (
                        <div className="flex gap-1 items-center bg-white p-1 rounded-lg border border-blue-500 shadow-xl z-50">
                           <input className="w-12 text-[8px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-bold" value={tempCourt} placeholder="Sân..." onChange={e => setTempCourt(e.target.value)} />
                           <input className="w-10 text-[8px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-bold" value={tempTime} placeholder="Giờ..." onChange={e => setTempTime(e.target.value)} />
                           <button onClick={saveMatchInfo} className="bg-blue-600 text-white p-0.5 rounded"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></button>
                        </div>
                      ) : (
                        <>
                          {m.court && <span className="bg-slate-800 text-white text-[7px] font-black px-1.5 py-0.5 rounded border border-slate-700 uppercase tracking-widest">{m.court}</span>}
                          {m.scheduledTime && <span className="bg-blue-100 text-blue-700 text-[7px] font-black px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-widest">{m.scheduledTime}</span>}
                          <button onClick={() => startEditMatch(m)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full shadow-sm text-slate-400 border border-slate-100"><svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`relative border-2 rounded-xl rounded-tl-none overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-white ${hasMatchHighlight ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-100'}`}>
                    <TeamRow defaultLabel="A" team={m.teamA} score={m.scoreA} isWinner={isWinnerA} isSpecial={specialType} isHighlighted={highlightA} onScoreChange={(val) => onUpdateScore(m.id, val, m.scoreB || 0)} />
                    <TeamRow defaultLabel="B" team={m.teamB} score={m.scoreB} isWinner={isWinnerB} isSpecial={specialType} isHighlighted={highlightB} onScoreChange={(val) => onUpdateScore(m.id, m.scoreA || 0, val)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const winners = useMemo(() => {
    const first = finalMatch && finalMatch.scoreA !== undefined && finalMatch.scoreB !== undefined && (finalMatch.scoreA > 0 || finalMatch.scoreB > 0) && finalMatch.scoreA !== finalMatch.scoreB
      ? (finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamA : finalMatch.teamB)
      : null;

    const second = finalMatch && finalMatch.scoreA !== undefined && finalMatch.scoreB !== undefined && (finalMatch.scoreA > 0 || finalMatch.scoreB > 0) && finalMatch.scoreA !== finalMatch.scoreB
      ? (finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamB : finalMatch.teamA)
      : null;

    let thirds: Team[] = [];
    if (hasThirdPlaceMatch) {
      if (thirdMatch && thirdMatch.scoreA !== undefined && thirdMatch.scoreB !== undefined && (thirdMatch.scoreA > 0 || thirdMatch.scoreB > 0) && thirdMatch.scoreA !== thirdMatch.scoreB) {
        thirds = [(thirdMatch.scoreA > thirdMatch.scoreB ? thirdMatch.teamA : thirdMatch.teamB) as Team];
      }
    } else {
      sfMatches.forEach(m => {
        if (m.scoreA !== undefined && m.scoreB !== undefined && (m.scoreA > 0 || m.scoreB > 0) && m.scoreA !== m.scoreB) {
          const loser = m.scoreA > m.scoreB ? m.teamB : m.teamA;
          if (loser) thirds.push(loser);
        }
      });
    }
    return { first, second, thirds };
  }, [finalMatch, thirdMatch, sfMatches, hasThirdPlaceMatch]);

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden bg-slate-50">
      {/* ZOOM CONTROLS */}
      <div className="fixed top-24 left-8 z-[60] flex flex-col gap-2 print:hidden">
         <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} className="w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></button>
         <button onClick={() => setZoom(1)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center justify-center text-[10px] font-black text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">100%</button>
         <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} className="w-10 h-10 bg-white border border-slate-200 rounded-xl shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg></button>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] print:hidden">
         <div className="bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl border border-white/10 flex items-center gap-4 group focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <div className="flex items-center gap-2 text-white/50 group-focus-within:text-blue-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
            <input type="text" placeholder="Tìm VĐV hoặc CLB..." className="bg-transparent border-none text-white font-bold text-sm outline-none placeholder:text-white/30 w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-white/50 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>}
         </div>
      </div>

      <div 
        className="flex min-h-full min-w-max p-0 overflow-visible transition-transform duration-300 origin-top-left"
        style={{ transform: `scale(${zoom})` }}
      >
        {matches.some(m => m.roundKey === 'PLAYIN') && renderRoundColumn(0)}
        {Array.from({ length: maxRoundIdx }).map((_, i) => renderRoundColumn(i + 1))}
        
        {/* HONOR BOARD: Cân đối với vị trí chung kết */}
        <div className="flex flex-col items-center justify-center px-10 bg-white border-l-2 border-slate-100 min-w-[450px] shadow-[-20px_0_40px_rgba(0,0,0,0.02)] z-40 relative">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none"></div>
          
          <div className="relative mb-12 flex flex-col items-center text-center">
             <div className="text-7xl mb-6 animate-bounce duration-[3000ms] filter drop-shadow-2xl">🏆</div>
             <h1 className="text-2xl font-black text-blue-600 uppercase tracking-tight mb-1">{tournamentName}</h1>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{categoryName}</p>
             <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.4em] mb-4 bg-slate-100 px-4 py-1 rounded-full">Bảng Vàng Danh Dự</h2>
             <div className="h-1.5 w-24 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 rounded-full shadow-lg"></div>
          </div>
          
          <div className="space-y-10 w-full relative z-10 text-center px-4 overflow-y-auto max-h-[85vh] custom-scrollbar">
            {/* GIẢI NHẤT */}
            <div className={`transition-all duration-1000 ${winners.first ? 'opacity-100 scale-100' : 'opacity-20 scale-95 blur-sm'}`}>
              <div className="inline-block px-6 py-2 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-5 shadow-[0_10px_20px_-5px_rgba(234,179,8,0.5)] border border-white/30">GIẢI NHẤT (VÔ ĐỊCH)</div>
              <div className="text-2xl font-black text-slate-900 uppercase leading-tight min-h-[4.5rem] flex flex-col items-center justify-center">
                {winners.first ? (
                    <>
                      <span className={`px-6 py-2 rounded-2xl ${isTeamMatchSearch(winners.first) ? "bg-blue-600 text-white" : "bg-slate-50"}`}>
                        {winners.first.players.map(p => p.name).join(' & ')}
                      </span>
                      <span className="text-[11px] font-black text-yellow-600 mt-3 uppercase tracking-widest">{winners.first.club}</span>
                    </>
                ) : <span className="text-slate-200 italic font-medium">Đang tranh tài...</span>}
              </div>
            </div>

            {/* GIẢI NHÌ */}
            <div className={`transition-all duration-1000 delay-150 ${winners.second ? 'opacity-100 scale-100' : 'opacity-20 scale-95 blur-sm'}`}>
              <div className="inline-block px-5 py-2 bg-slate-400 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-lg shadow-slate-200">GIẢI NHÌ</div>
              <div className="text-xl font-black text-slate-700 uppercase leading-tight min-h-[3.5rem] flex flex-col items-center justify-center">
                {winners.second ? (
                    <>
                      <span className={`px-4 py-1.5 rounded-xl ${isTeamMatchSearch(winners.second) ? "bg-blue-600 text-white" : "bg-slate-50"}`}>
                        {winners.second.players.map(p => p.name).join(' & ')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">{winners.second.club}</span>
                    </>
                ) : <span className="text-slate-100 italic">---</span>}
              </div>
            </div>

            {/* GIẢI BA */}
            <div className={`transition-all duration-1000 delay-300 ${winners.thirds.length > 0 ? 'opacity-100 scale-100' : 'opacity-20 scale-95 blur-sm'}`}>
              <div className="inline-block px-5 py-2 bg-orange-400 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-lg shadow-orange-100">
                {hasThirdPlaceMatch ? "GIẢI BA" : "ĐỒNG GIẢI BA"}
              </div>
              <div className="flex flex-col gap-5">
                {winners.thirds.length > 0 ? winners.thirds.map((team, idx) => (
                  <div key={idx} className="text-xl font-black text-slate-700 uppercase leading-tight flex flex-col items-center justify-center">
                     <span className={`px-4 py-1.5 rounded-xl ${isTeamMatchSearch(team) ? "bg-blue-600 text-white" : "bg-slate-50"}`}>
                        {team.players.map(p => p.name).join(' & ')}
                      </span>
                      <span className="text-[10px] font-bold text-orange-400 mt-2 uppercase tracking-wide">{team.club}</span>
                  </div>
                )) : <div className="text-slate-100 italic">---</div>}
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-100 w-full text-center">
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">HỆ THỐNG QUẢN LÝ BADMINTON PRO</p>
             <p className="text-[8px] font-bold text-slate-200 mt-2 uppercase">CHAMPIONS NEVER STOP</p>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Bracket;
