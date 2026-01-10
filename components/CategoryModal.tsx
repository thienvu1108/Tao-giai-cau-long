
import React, { useState } from 'react';
import { EventType, TournamentFormat } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, type: EventType, format: TournamentFormat, hasThirdPlace: boolean) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>(EventType.DOUBLES);
  const [format, setFormat] = useState<TournamentFormat>(TournamentFormat.SINGLE_ELIMINATION);
  const [hasThirdPlace, setHasThirdPlace] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Thêm Nội Dung Mới</h3>
          <p className="text-slate-400 text-sm font-medium mb-8 italic">Thiết lập cấu hình thi đấu cho nội dung này.</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên nội dung</label>
              <input
                type="text"
                autoFocus
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all uppercase"
                placeholder="VD: ĐÔI NAM NỮ..."
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Loại hình</label>
                  <select 
                    value={type} 
                    onChange={e => setType(e.target.value as EventType)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  >
                    <option value={EventType.DOUBLES}>Đánh Đôi</option>
                    <option value={EventType.SINGLES}>Đánh Đơn</option>
                  </select>
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thể thức</label>
                  <select 
                    value={format} 
                    onChange={e => setFormat(e.target.value as TournamentFormat)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  >
                    <option value={TournamentFormat.SINGLE_ELIMINATION}>Loại trực tiếp</option>
                    <option value={TournamentFormat.GROUP_STAGE_ELIMINATION}>Vòng bảng + Knockout</option>
                  </select>
               </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-sm font-bold text-slate-700">Tranh giải Ba</span>
              <button
                onClick={() => setHasThirdPlace(!hasThirdPlace)}
                className={`w-12 h-6 rounded-full transition-all relative ${hasThirdPlace ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${hasThirdPlace ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 flex gap-3 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Hủy</button>
          <button
            onClick={() => {
              if (name.trim()) {
                onAdd(name.trim(), type, format, hasThirdPlace);
                setName('');
                onClose();
              }
            }}
            className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
            disabled={!name.trim()}
          >
            Tạo nội dung
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;
