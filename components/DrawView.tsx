
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Team } from '../types';
import { shuffleWithClubProtection } from '../services/tournamentLogic';

interface DrawViewProps {
  teams: Team[];
  onFinish: (shuffledTeams: Team[]) => void;
  clubProtection: boolean;
}

const DrawView: React.FC<DrawViewProps> = ({ teams, onFinish, clubProtection }) => {
  const drawOrder = useMemo(() => shuffleWithClubProtection(teams, clubProtection), [teams, clubProtection]);
  
  const [drawn, setDrawn] = useState<Team[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAutoDrawing, setIsAutoDrawing] = useState(false);
  const [visualIndex, setVisualIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  const currentlyAvailable = useMemo(() => 
    teams.filter(t => !drawn.find(d => d.id === t.id)),
  [teams, drawn]);

  const performSingleDraw = () => {
    if (drawn.length >= drawOrder.length) return;
    setIsSpinning(true);
    
    let speed = 30;
    let count = 0;
    const maxCount = 12 + Math.floor(Math.random() * 8);

    const spin = () => {
      setVisualIndex(prev => (prev + 1) % Math.max(1, currentlyAvailable.length));
      count++;
      
      if (count < maxCount) {
        timerRef.current = window.setTimeout(spin, speed);
        speed += 12;
      } else {
        setIsSpinning(false);
        const nextTeam = drawOrder[drawn.length];
        setDrawn(prev => [...prev, nextTeam]);
      }
    };

    spin();
  };

  const startAutoDraw = () => {
    setIsAutoDrawing(true);
    performSingleDraw();
  };

  useEffect(() => {
    if (isAutoDrawing && !isSpinning && drawn.length < drawOrder.length) {
      const timeout = setTimeout(() => {
        performSingleDraw();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [isAutoDrawing, isSpinning, drawn.length, drawOrder.length]);

  useEffect(() => {
    if (drawn.length === drawOrder.length && drawOrder.length > 0) {
      setTimeout(() => onFinish(drawn), 1500);
    }
  }, [drawn, drawOrder, onFinish]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 min-h-[650px] relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>

      <div className="text-center mb-8 z-10">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
           {clubProtection ? "Bảo vệ CLB Đang bật" : "Bốc thăm ngẫu nhiên"}
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Hệ Thống Bốc Thăm Tự Động</h2>
        <p className="text-slate-400 font-medium text-sm">Xếp cặp minh bạch, khách quan và chuyên nghiệp</p>
      </div>

      <div className="relative w-80 h-80 mb-10 flex items-center justify-center z-10">
        <div className={`absolute inset-0 rounded-full border-[12px] border-slate-50 shadow-inner flex items-center justify-center ${isSpinning ? 'animate-[spin_2s_linear_infinite]' : ''}`}>
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-12 bg-blue-600 rounded-full -mt-4 z-20 shadow-lg"></div>
        </div>

        <div className="z-20 bg-white rounded-3xl shadow-2xl p-8 w-72 text-center border-4 border-blue-500 scale-105 transition-transform">
           {drawn.length < drawOrder.length ? (
             <div className="space-y-3">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">
                  {isSpinning ? 'Đang quay...' : (isAutoDrawing ? 'Chuẩn bị bốc tiếp...' : 'Sẵn sàng')}
                </p>
                <div className="h-20 flex items-center justify-center">
                  <div className="flex flex-col gap-1">
                    <p className="text-xl font-black text-slate-800 leading-tight">
                      {currentlyAvailable[visualIndex]?.players.map(p => p.name).join(' - ')}
                    </p>
                    <span className="text-blue-600 font-black text-xs">{currentlyAvailable[visualIndex]?.teamCode}</span>
                  </div>
                </div>
                {currentlyAvailable[visualIndex] && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CLB: {currentlyAvailable[visualIndex].club}</p>
                )}
             </div>
           ) : (
             <div className="space-y-2">
               <div className="text-4xl mb-1">🎉</div>
               <p className="text-green-600 font-black text-lg leading-none uppercase">Hoàn tất!</p>
               <p className="text-slate-400 text-[10px] font-bold">Đang khởi tạo sơ đồ thi đấu...</p>
             </div>
           )}
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 z-10">
        <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col h-64">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh sách chờ</h3>
              <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{currentlyAvailable.length}</span>
           </div>
           <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {currentlyAvailable.map(t => (
                <div key={t.id} className="p-3 bg-white rounded-xl border border-slate-100 text-xs font-bold text-slate-500 flex justify-between items-center shadow-sm">
                  <div className="flex flex-col">
                    <span>{t.players.map(p => p.name).join(' - ')}</span>
                    <span className="text-[9px] text-blue-500">{t.teamCode}</span>
                  </div>
                  <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded uppercase">{t.club}</span>
                </div>
              ))}
           </div>
        </div>
        
        <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100 flex flex-col h-64">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Kết quả bốc thăm</h3>
              <span className="bg-blue-200 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{drawn.length}</span>
           </div>
           <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {drawn.map((t, idx) => (
                <div key={t.id} className="p-3 bg-white rounded-xl border border-blue-100 text-xs text-blue-700 font-black flex justify-between items-center shadow-sm animate-fade-in-up">
                  <div className="flex flex-col">
                    <span>{t.players.map(p => p.name).join(' - ')}</span>
                    <span className="text-[9px] text-blue-400 font-bold uppercase">{t.teamCode} - {t.club}</span>
                  </div>
                  <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase">Số {idx + 1}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {!isAutoDrawing && drawn.length === 0 && (
        <button
          onClick={startAutoDraw}
          className="mt-10 px-20 py-5 bg-slate-900 hover:bg-black text-white rounded-full font-black text-sm tracking-widest shadow-2xl shadow-blue-200 transition-all active:scale-95 z-10 flex items-center gap-3 uppercase"
        >
          BẮT ĐẦU BỐC THĂM TỰ ĐỘNG
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      )}

      {isAutoDrawing && drawn.length < drawOrder.length && (
        <div className="mt-10 flex items-center gap-4 text-blue-600 font-bold animate-pulse z-10">
          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
          Đang tự động bốc thăm...
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default DrawView;
