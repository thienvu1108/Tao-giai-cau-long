
import React from 'react';
import { Group, Team, Match, TeamStats } from '../types';
import { calculateGroupRankings } from '../services/tournamentLogic';

interface GroupStageViewProps {
  groups: Group[];
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number) => void;
  onFinishStage: () => void;
  isReadOnly?: boolean;
}

const GroupStageView: React.FC<GroupStageViewProps> = ({ groups, onUpdateScore, onFinishStage, isReadOnly }) => {
  return (
    <div className="p-8 space-y-12">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Vòng Thi Đấu Bảng</h2>
          <p className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-widest">Cập nhật kết quả để tự động tính điểm xếp hạng</p>
        </div>
        {!isReadOnly && (
          <button 
            onClick={onFinishStage}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all"
          >
            KẾT THÚC VÒNG BẢNG & VÀO CHUNG KẾT
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {groups.map((group) => {
          const rankings = calculateGroupRankings(group);
          
          return (
            <div key={group.id} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col">
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <h3 className="text-lg font-black uppercase tracking-widest">{group.name}</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{group.teams.length} ĐỘI</span>
              </div>

              <div className="p-8 space-y-8 flex-1">
                {/* Ranking Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="min-w-full bg-white">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-4 py-3 text-left">Hạng</th>
                        <th className="px-4 py-3 text-left">Đội</th>
                        <th className="px-4 py-3 text-center">T</th>
                        <th className="px-4 py-3 text-center">B</th>
                        <th className="px-4 py-3 text-center">HS</th>
                        <th className="px-4 py-3 text-center text-blue-600">Đ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rankings.map((stat, idx) => {
                        const team = group.teams.find(t => t.id === stat.teamId);
                        return (
                          <tr key={stat.teamId} className={`hover:bg-slate-50 transition-colors ${idx < 2 ? 'bg-blue-50/30' : ''}`}>
                            <td className="px-4 py-3 text-sm font-black text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900 uppercase">{team?.players.map(p => p.name).join(' & ')}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{team?.club}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-xs font-bold">{stat.won}</td>
                            <td className="px-4 py-3 text-center text-xs font-bold">{stat.lost}</td>
                            <td className="px-4 py-3 text-center text-xs font-bold text-slate-400">{stat.diff > 0 ? `+${stat.diff}` : stat.diff}</td>
                            <td className="px-4 py-3 text-center text-sm font-black text-blue-600">{stat.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Match List */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lịch thi đấu bảng</h4>
                  <div className="grid gap-3">
                    {group.matches.map((m) => (
                      <div key={m.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div className="flex-1 text-right pr-4">
                          <p className="text-[10px] font-black text-slate-900 uppercase leading-tight truncate">{m.teamA?.players.map(p => p.name).join(' & ')}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{m.teamA?.club}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                           {isReadOnly ? (
                             <div className="flex gap-2 items-center bg-white px-4 py-2 rounded-xl border border-slate-200 font-black text-lg">
                               <span>{m.scoreA ?? 0}</span>
                               <span className="text-slate-300">-</span>
                               <span>{m.scoreB ?? 0}</span>
                             </div>
                           ) : (
                             <div className="flex gap-1 items-center">
                               <input 
                                 type="number" 
                                 className="w-12 h-10 bg-white border border-slate-200 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                                 value={m.scoreA ?? ''} 
                                 onChange={(e) => onUpdateScore(m.id, parseInt(e.target.value) || 0, m.scoreB || 0)}
                                 placeholder="0"
                               />
                               <span className="font-black text-slate-300 px-1">VS</span>
                               <input 
                                 type="number" 
                                 className="w-12 h-10 bg-white border border-slate-200 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                                 value={m.scoreB ?? ''} 
                                 onChange={(e) => onUpdateScore(m.id, m.scoreA || 0, parseInt(e.target.value) || 0)}
                                 placeholder="0"
                               />
                             </div>
                           )}
                        </div>

                        <div className="flex-1 text-left pl-4">
                          <p className="text-[10px] font-black text-slate-900 uppercase leading-tight truncate">{m.teamB?.players.map(p => p.name).join(' & ')}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{m.teamB?.club}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupStageView;
