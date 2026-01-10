
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Team } from '../types';
import { shuffleWithClubProtection } from '../services/tournamentLogic';

interface DrawViewProps {
  teams: Team[];
  onFinish: (shuffledTeams: Team[]) => void;
  clubProtection: boolean;
  tournamentName: string;
  categoryName: string;
  isGroupStage?: boolean;
}

const DrawView: React.FC<DrawViewProps> = ({ teams, onFinish, clubProtection, tournamentName, categoryName, isGroupStage }) => {
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
    const maxCount = 15 + Math.floor(Math.random() * 10);

    const spin = () => {
      setVisualIndex(prev => (prev + 1) % Math.max(1, currentlyAvailable.length));
      count++;
      
      if (count < maxCount) {
        timerRef.current = window.setTimeout(spin, speed);
        speed += 10;
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
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isAutoDrawing, isSpinning, drawn.length, drawOrder.length]);

  useEffect(() => {
    if (drawn.length === drawOrder.length && drawOrder.length > 0) {
      setTimeout(() => onFinish(drawn), 2000);
    }
  }, [drawn, drawOrder, onFinish]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-[3rem] shadow-2xl border border-slate-100 min-h-[700px] relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 animate-pulse delay-1000"></div>

      <div className="text-center mb-10 z-10">
        <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 shadow-lg shadow-blue-200">
           {clubProtection ? "🏆 Bảo vệ CLB: Đang bật" : (isGroupStage ? "🎲 Chia bảng ngẫu nhiên" : "🎲 Bốc thăm ngẫu nhiên")}
        </div>
        <h1 className="text-2xl font-black text-blue-600 uppercase tracking-tight mb-1">{tournamentName}</h1>
        <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter uppercase italic">
          {isGroupStage ? "Lễ Bốc Thăm Chia Bảng" : "Lễ Bốc Thăm Công Khai"}
        </h2>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">NỘI DUNG: {categoryName}</p>
        <div className="flex items-center justify-center gap-2 text-slate-300 font-bold text-[10px]">
           <span className="w-8 h-[1px] bg-slate-200"></span>
           PHẦN MỀM QUẢN LÝ GIẢI ĐẤU PRO
           <span className="w-8 h-[1px] bg-slate-200"></span>
        </div>
      </div>

      <div className="relative w-80 h-80 mb-10 flex items-center justify-center z-10">
        {/* Spinning Outer Ring */}
        <div className={`absolute inset-0 rounded-full border-[12px] border-slate-100 shadow-inner flex items-center justify-center ${isSpinning ? 'animate-[spin_1.5s_linear_infinite]' : ''}`}>
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center -mt-4 z-30">
              <span className="text-3xl filter drop-shadow-md">🏸</span>
           </div>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center -mb-4 z-30 opacity-50">
              <span className="text-xl">🏸</span>
           </div>
        </div>

        {/* Center Card */}
        <div className={`z-20 bg-white rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] p-10 w-72 text-center border-4 ${isSpinning ? 'border-blue-500 scale-110' : 'border-slate-100'} transition-all duration-500`}>
           {drawn.length < drawOrder.length ? (
             <div className="space-y-4">
                <div className="flex flex-col items-center gap-1">
                  <p className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isSpinning ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`}>
                    {isSpinning ? 'Đang quay...' : (isAutoDrawing ? 'Tiếp theo...' : 'Sẵn sàng')}
                  </p>
                  <div className="w-10 h-1 bg-blue-500/20 rounded-full"></div>
                </div>
                
                <div className="h-28 flex items-center justify-center">
                  <div className="flex flex-col gap-2">
                    <p className={`text-xl font-black text-slate-900 leading-tight uppercase ${isSpinning ? 'blur-[1px]' : ''}`}>
                      {currentlyAvailable[visualIndex]?.players.map(p => p.name).join(' & ')}
                    </p>
                    <div className="inline-block bg-blue-50 px-3 py-1 rounded-full">
                       <span className="text-blue-600 font-black text-[10px] tracking-widest uppercase">{currentlyAvailable[visualIndex]?.teamCode}</span>
                    </div>
                  </div>
                </div>
                
                {currentlyAvailable[visualIndex] && (
                  <div className="pt-2 border-t border-slate-50">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">CLB: {currentlyAvailable[visualIndex].club}</p>
                  </div>
                )}
             </div>
           ) : (
             <div className="space-y-4 py-4">
               <div className="text-5xl animate-bounce">🥇</div>
               <div className="space-y-1">
                 <p className="text-green-600 font-black text-2xl leading-none uppercase tracking-tighter">Hoàn tất!</p>
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                   {isGroupStage ? "Đang phân bổ vào bảng..." : "Đang tải sơ đồ..."}
                 </p>
               </div>
               <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full w-full animate-[loading_2s_ease-in-out]"></div>
               </div>
             </div>
           )}
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 z-10 px-4">
        <div className="bg-slate-50/80 backdrop-blur p-8 rounded-[2.5rem] border border-slate-200 flex flex-col h-72 shadow-sm">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                   {isGroupStage ? "Đội chưa vào bảng" : "Danh sách chờ"}
                 </h3>
              </div>
              <span className="bg-white border border-slate-200 text-slate-600 text-[11px] font-black px-3 py-1 rounded-full shadow-sm">{currentlyAvailable.length}</span>
           </div>
           <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar space-y-3">
              {currentlyAvailable.map(t => (
                <div key={t.id} className="p-4 bg-white rounded-2xl border border-slate-100 text-xs font-bold text-slate-500 flex justify-between items-center shadow-sm hover:border-blue-200 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-700">{t.players.map(p => p.name).join(' & ')}</span>
                    <span className="text-[9px] text-blue-500 font-black">{t.teamCode}</span>
                  </div>
                  <span className="text-[9px] bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg uppercase font-black text-slate-400">{t.club}</span>
                </div>
              ))}
           </div>
        </div>
        
        <div className="bg-blue-600 p-8 rounded-[2.5rem] flex flex-col h-72 shadow-2xl shadow-blue-200">
           <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                 <h3 className="text-[10px] font-black text-blue-100 uppercase tracking-widest">
                   {isGroupStage ? "Vị trí phân bảng" : "Thứ tự thi đấu"}
                 </h3>
              </div>
              <span className="bg-blue-500 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-lg">{drawn.length}</span>
           </div>
           <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar space-y-3">
              {drawn.map((t, idx) => (
                <div key={t.id} className="p-4 bg-white/10 backdrop-blur rounded-2xl border border-white/20 text-xs text-white font-black flex justify-between items-center shadow-sm animate-fade-in-up">
                  <div className="flex flex-col gap-0.5">
                    <span>{t.players.map(p => p.name).join(' & ')}</span>
                    <span className="text-[9px] text-blue-200 font-bold uppercase tracking-widest">{t.teamCode} - {t.club}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] bg-white text-blue-600 px-3 py-1 rounded-full uppercase font-black shadow-sm">
                       {isGroupStage ? `Slot ${idx + 1}` : `# ${idx + 1}`}
                     </span>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {!isAutoDrawing && drawn.length === 0 && (
        <button
          onClick={startAutoDraw}
          className="mt-12 group relative px-16 py-6 bg-slate-900 hover:bg-black text-white rounded-full font-black text-base tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] transition-all active:scale-95 z-10 flex items-center gap-4 uppercase overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="relative z-10">
            {isGroupStage ? "BẮT ĐẦU CHIA BẢNG" : "BẮT ĐẦU BỐC THĂM"}
          </span>
          <svg className="relative z-10 w-6 h-6 animate-bounce-x" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      )}

      {isAutoDrawing && drawn.length < drawOrder.length && (
        <div className="mt-12 flex flex-col items-center gap-2 z-10">
           <div className="flex items-center gap-4 text-blue-600 font-black uppercase text-xs tracking-widest animate-pulse">
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            {isGroupStage ? "Hệ thống đang tiến hành chia bảng tự động" : "Máy đang thực hiện bốc thăm tự động"}
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase italic">Vui lòng không tắt trình duyệt...</p>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .bg-slate-50 .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loading {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounce-x { animation: bounce-x 1s infinite; }
      `}</style>
    </div>
  );
};

export default DrawView;
