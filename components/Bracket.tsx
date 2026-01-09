
import React from 'react';
import { Match, Team, RoundKey } from '../types';

interface BracketProps {
  matches: Match[];
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number) => void;
}

const TeamRow: React.FC<{ 
  team?: Team | null; 
  score?: number; 
  isWinner: boolean; 
  onScoreChange: (val: number) => void;
  defaultLabel: string;
  isSpecial?: 'SF' | 'F' | '3RD' | null;
}> = ({ team, score, isWinner, onScoreChange, defaultLabel, isSpecial }) => {
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

  return (
    <div className={`flex items-center w-full h-12 border-b border-slate-200 last:border-0 transition-all duration-300 ${isWinner ? `${winnerBg} text-white` : 'bg-white'}`}>
      <div className={`w-12 flex-shrink-0 text-[10px] font-black flex items-center justify-center h-full border-r border-slate-100 ${isWinner ? `${winnerSideBg} text-white` : 'bg-slate-50 text-slate-500'}`}>
        {displayCode}
      </div>
      <div className="flex-1 px-4 overflow-hidden flex flex-col justify-center h-full">
        {isBye ? (
          <span className="text-[9px] font-black text-slate-300 italic uppercase tracking-widest text-center">Đang chờ...</span>
        ) : (
          team?.players?.map((p, idx) => (
            <span key={idx} className={`text-[11px] font-bold truncate leading-none uppercase ${isWinner ? 'text-white' : isPlaceholder ? 'text-slate-400 italic' : 'text-slate-900'}`}>
              {p.name}
              {p.club && !isPlaceholder && <span className={`ml-2 text-[8px] font-medium opacity-60`}>[{p.club}]</span>}
            </span>
          ))
        )}
      </div>
      {!isBye && (
        <input
          type="number"
          value={score ?? ''}
          placeholder="0"
          className={`w-12 h-full text-center border-l text-[13px] font-black outline-none transition-colors ${
            isWinner ? `${winnerSideBg} border-slate-500/30 text-white` : 'bg-slate-50 border-slate-100 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500'
          }`}
          onChange={(e) => onScoreChange(parseInt(e.target.value) || 0)}
        />
      )}
    </div>
  );
};

const Bracket: React.FC<BracketProps> = ({ matches, onUpdateScore }) => {
  if (!matches || matches.length === 0) return (
    <div className="flex items-center justify-center h-full p-20 text-slate-300 italic font-medium text-center">
      Vui lòng thêm vận động viên và tiến hành bốc thăm để xem sơ đồ.
    </div>
  );

  const maxRoundIdx = Math.max(...matches.map(m => m.roundIndex));
  const finalMatch = matches.find(m => m.roundKey === 'F');
  const thirdMatch = matches.find(m => m.roundKey === '3RD');

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

  const renderRoundColumn = (roundIdx: number) => {
    const roundMatches = matches.filter(m => m.roundIndex === roundIdx).sort((a, b) => {
      if (a.roundKey === 'F') return -1;
      if (b.roundKey === 'F') return 1;
      return a.position - b.position;
    });

    if (roundMatches.length === 0) return null;

    const label = roundIdx === 0 ? 'SƠ LOẠI' : getRoundLabelText(roundMatches[0].roundKey);

    return (
      <div key={roundIdx} className="flex flex-col flex-1 min-w-[300px] border-r border-slate-200 last:border-0 relative">
        <div className="sticky top-0 bg-slate-900 text-white py-4 text-center z-30 shadow-md">
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">{label}</span>
          <p className="text-[8px] font-bold text-slate-500 mt-1 uppercase">{roundMatches.length} trận đấu</p>
        </div>
        
        <div className="flex flex-col justify-around flex-grow gap-10 py-10 px-6">
          {roundMatches.map(m => {
            const isWinnerA = m.scoreA !== undefined && m.scoreB !== undefined && m.scoreA > m.scoreB;
            const isWinnerB = m.scoreA !== undefined && m.scoreB !== undefined && m.scoreB > m.scoreA;
            const specialType = m.roundKey === 'F' ? 'F' : m.roundKey === 'SF' ? 'SF' : m.roundKey === '3RD' ? '3RD' : null;

            let borderClass = 'border-slate-200';
            if (specialType === 'F') borderClass = 'border-yellow-500 ring-4 ring-yellow-500/10';
            else if (specialType === 'SF') borderClass = 'border-indigo-600';
            else if (specialType === '3RD') borderClass = 'border-orange-500';

            return (
              <div key={m.id} className="relative">
                <div className={`absolute -top-3 left-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border rounded-full shadow-sm z-10 
                  ${specialType === 'F' ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 
                    specialType === 'SF' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 
                    specialType === '3RD' ? 'bg-orange-50 border-orange-200 text-orange-600' : 
                    'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  {m.roundKey === '3RD' ? 'Tranh Hạng 3' : `#${m.id.replace('m-', 'M').replace('p-', 'PI')}`}
                </div>
                <div className={`border-2 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 bg-white ${borderClass}`}>
                  <TeamRow 
                    defaultLabel="A"
                    team={m.teamA} score={m.scoreA} isWinner={isWinnerA} isSpecial={specialType}
                    onScoreChange={(val) => onUpdateScore(m.id, val, m.scoreB || 0)}
                  />
                  <TeamRow 
                    defaultLabel="B"
                    team={m.teamB} score={m.scoreB} isWinner={isWinnerB} isSpecial={specialType}
                    onScoreChange={(val) => onUpdateScore(m.id, m.scoreA || 0, val)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const firstPlace = finalMatch && finalMatch.scoreA !== undefined && finalMatch.scoreB !== undefined && finalMatch.scoreA !== finalMatch.scoreB
    ? (finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamA : finalMatch.teamB)
    : null;

  const secondPlace = finalMatch && finalMatch.scoreA !== undefined && finalMatch.scoreB !== undefined && finalMatch.scoreA !== finalMatch.scoreB
    ? (finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamB : finalMatch.teamA)
    : null;

  const thirdPlace = thirdMatch && thirdMatch.scoreA !== undefined && thirdMatch.scoreB !== undefined && thirdMatch.scoreA !== thirdMatch.scoreB
    ? (thirdMatch.scoreA > thirdMatch.scoreB ? thirdMatch.teamA : thirdMatch.teamB)
    : null;

  return (
    <div className="flex bg-slate-50 min-h-full min-w-max p-0 overflow-visible">
      {matches.some(m => m.roundKey === 'PLAYIN') && renderRoundColumn(0)}
      {Array.from({ length: maxRoundIdx }).map((_, i) => renderRoundColumn(i + 1))}

      <div className="sticky right-0 flex flex-col items-center justify-center px-12 bg-white/95 border-l-4 border-slate-900 min-w-[400px] shadow-[-20px_0_30px_rgba(0,0,0,0.05)] z-40 overflow-hidden">
        <div className="absolute top-4 right-4 print:hidden">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Auto-Synced to Cloud</span>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

        <div className="relative mb-10 flex flex-col items-center">
           <div className="text-8xl mb-2 filter drop-shadow-2xl animate-pulse">🏆</div>
           <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Bảng Vinh Danh</h2>
           <div className="h-1 w-16 bg-yellow-500 rounded-full"></div>
        </div>

        <div className="space-y-8 w-full">
          <div className={`text-center transition-all duration-700 ${firstPlace ? 'opacity-100 scale-100' : 'opacity-20 scale-95'}`}>
            <div className="inline-block px-4 py-1 bg-yellow-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest mb-2 shadow-lg shadow-yellow-200">Giải Nhất (Vô Địch)</div>
            <div className="text-2xl font-black text-slate-900 uppercase leading-tight tracking-tighter min-h-[3.5rem] flex flex-col items-center justify-center text-center">
              {firstPlace ? (
                  <>
                    <span>{firstPlace.players.map(p => p.name).join(' & ')}</span>
                    <span className="text-[10px] font-bold text-yellow-600 mt-1 uppercase tracking-widest">Mã: {firstPlace.teamCode} - {firstPlace.club}</span>
                  </>
              ) : (
                <span className="text-slate-300 italic text-lg font-medium">Đang xác định...</span>
              )}
            </div>
          </div>

          <div className={`text-center transition-all duration-700 delay-100 ${secondPlace ? 'opacity-100 scale-100' : 'opacity-20 scale-95'}`}>
            <div className="inline-block px-4 py-1 bg-slate-400 text-white rounded-full text-[9px] font-black uppercase tracking-widest mb-2 shadow-lg shadow-slate-200">Giải Nhì</div>
            <div className="text-lg font-black text-slate-700 uppercase leading-tight tracking-tighter min-h-[3rem] flex flex-col items-center justify-center text-center">
              {secondPlace ? (
                  <>
                    <span>{secondPlace.players.map(p => p.name).join(' & ')}</span>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Mã: {secondPlace.teamCode} - {secondPlace.club}</span>
                  </>
              ) : (
                <span className="text-slate-200 italic text-base">Đang xác định...</span>
              )}
            </div>
          </div>

          <div className={`text-center transition-all duration-700 delay-200 ${thirdPlace ? 'opacity-100 scale-100' : 'opacity-20 scale-95'}`}>
            <div className="inline-block px-4 py-1 bg-orange-400 text-white rounded-full text-[9px] font-black uppercase tracking-widest mb-2 shadow-lg shadow-orange-200">Giải Ba</div>
            <div className="text-lg font-black text-slate-700 uppercase leading-tight tracking-tighter min-h-[3rem] flex flex-col items-center justify-center text-center">
              {thirdPlace ? (
                  <>
                    <span>{thirdPlace.players.map(p => p.name).join(' & ')}</span>
                    <span className="text-[9px] font-bold text-orange-400 mt-1 uppercase tracking-widest">Mã: {thirdPlace.teamCode} - {thirdPlace.club}</span>
                  </>
              ) : (
                <span className="text-slate-200 italic text-base">Đang xác định...</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-100 w-full text-center">
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Badminton Management Pro</p>
        </div>
      </div>
    </div>
  );
};

export default Bracket;
