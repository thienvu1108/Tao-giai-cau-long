
import React from 'react';
import { TournamentMetadata } from '../types';

interface TournamentDashboardProps {
  activeId: string;
  tournaments: TournamentMetadata[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

const TournamentDashboard: React.FC<TournamentDashboardProps> = ({ activeId, tournaments, onLoad, onDelete, onCreateNew, onClose }) => {
  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-transparent animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Danh sách Giải đấu</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Chọn giải đấu để tiếp tục làm việc</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
              Quay lại
            </button>
            <button 
              onClick={onCreateNew}
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-all"
            >
              + Tạo giải mới
            </button>
          </div>
        </div>

        {tournaments.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center">
             <div className="text-6xl mb-6 opacity-20">🏸</div>
             <p className="text-slate-400 font-bold uppercase tracking-widest">Chưa có giải đấu nào được lưu trữ</p>
             <button onClick={onCreateNew} className="mt-6 text-blue-600 font-black uppercase text-xs hover:underline">Bắt đầu ngay</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map(t => (
              <div 
                key={t.id} 
                className={`group relative bg-white rounded-[2.5rem] p-8 border-2 transition-all hover:shadow-2xl hover:scale-[1.02] ${activeId === t.id ? 'border-blue-500 ring-4 ring-blue-50 shadow-lg' : 'border-white shadow-sm hover:border-slate-200'}`}
              >
                {activeId === t.id && (
                  <div className="absolute top-6 right-6 bg-blue-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Đang mở</div>
                )}
                
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {t.isCloudLinked && (
                       <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Đã kết nối Cloud"></span>
                    )}
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.date || 'Chưa đặt ngày'}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight uppercase group-hover:text-blue-600 transition-colors truncate">{t.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 truncate">📍 {t.venue || 'Không xác định'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">VĐV</p>
                      <p className="text-lg font-black text-slate-700">{t.playerCount}</p>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Cập nhật</p>
                      <p className="text-[9px] font-black text-slate-700 mt-1">{formatDate(t.lastUpdated)}</p>
                   </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => { onLoad(t.id); onClose(); }}
                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all"
                  >
                    Mở giải
                  </button>
                  <button 
                    onClick={() => onDelete(t.id)}
                    className="w-12 bg-red-50 text-red-500 py-3 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                    title="Xóa giải đấu"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentDashboard;
