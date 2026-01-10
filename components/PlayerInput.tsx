
import React, { useState, useMemo } from 'react';
import { Player, EventType } from '../types';
import { generatePlayerCode, generateTeamCode } from '../services/tournamentLogic';

interface PlayerInputProps {
  onAddPlayers: (players: Player[]) => void;
  onRemovePlayer: (playerId: string) => void;
  players: Player[];
  eventType: EventType;
}

const PlayerInput: React.FC<PlayerInputProps> = ({ onAddPlayers, onRemovePlayer, players, eventType }) => {
  const [rawText, setRawText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleProcess = () => {
    const lines = rawText.split('\n').filter(n => n.trim() !== '');
    const newPlayers: Player[] = lines.map((line, idx) => {
      const parts = line.split(/[|\-]/);
      const name = parts[0]?.trim() || "VĐV Mới";
      const club = parts[1]?.trim() || "Tự do";
      
      return {
        id: `p-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        name,
        club,
        code: generatePlayerCode(players.length + idx),
      };
    });
    onAddPlayers(newPlayers);
    setRawText('');
  };

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const q = searchQuery.toLowerCase();
    return players.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.club.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q)
    );
  }, [players, searchQuery]);

  const teamCount = eventType === EventType.SINGLES ? players.length : Math.floor(players.length / 2);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          Danh sách Vận động viên
        </h3>
        <div className="bg-blue-50 px-3 py-1 rounded-full">
           <span className="text-xs font-bold text-blue-600 uppercase">Tổng cộng: {teamCount} {eventType === EventType.SINGLES ? 'VĐV' : 'Cặp'}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            Nhập "Tên | CLB" (Mỗi dòng một người)
          </label>
          <textarea
            className="w-full h-40 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-sm"
            placeholder="Nguyễn Văn A | CLB Quận 1&#10;Trần Thị B | CLB Thủ Đức..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
        </div>
        <button
          onClick={handleProcess}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Thêm vào danh sách
        </button>
      </div>

      <div className="mt-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">Đã đăng ký ({players.length})</h4>
          
          <div className="relative w-full max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
              type="text" 
              placeholder="Tìm tên VĐV, CLB..."
              className="w-full bg-slate-100 border-none rounded-lg pl-9 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 shadow-inner relative custom-scrollbar">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="relative z-20">
              <tr>
                <th className="sticky top-0 bg-white px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Mã VĐV</th>
                <th className="sticky top-0 bg-white px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Mã Cặp</th>
                <th className="sticky top-0 bg-white px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Vận động viên</th>
                <th className="sticky top-0 bg-white px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">CLB</th>
                <th className="sticky top-0 bg-white px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlayers.map((p, idx) => {
                const globalIdx = players.findIndex(orig => orig.id === p.id);
                const teamIdx = eventType === EventType.SINGLES ? globalIdx : Math.floor(globalIdx / 2);
                const tCode = generateTeamCode(teamIdx, eventType);
                const isOddInDoubles = eventType === EventType.DOUBLES && globalIdx === players.length - 1 && players.length % 2 !== 0;

                return (
                  <tr key={p.id} className="hover:bg-white transition-colors group">
                    <td className="px-4 py-3 text-[10px] text-blue-500 font-mono font-bold">{p.code}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isOddInDoubles ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isOddInDoubles ? 'Chờ cặp' : tCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-bold">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-medium">
                      <span className="bg-slate-200/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{p.club}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => onRemovePlayer(p.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Xóa vận động viên"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredPlayers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-300 italic text-sm bg-white">
                    {players.length === 0 ? "Chưa có dữ liệu vận động viên" : "Không tìm thấy vận động viên phù hợp"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

export default PlayerInput;
