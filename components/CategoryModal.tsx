
import React, { useState } from 'react';
import { EventType } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, type: EventType) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>(EventType.DOUBLES);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Thêm Nội Dung Mới</h3>
          <p className="text-slate-400 text-sm font-medium mb-8 italic">Vui lòng nhập thông tin cho nội dung thi đấu mới.</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên nội dung</label>
              <input
                type="text"
                autoFocus
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all uppercase"
                placeholder="VD: ĐÔI NAM NỮ..."
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Loại hình thi đấu</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setType(EventType.DOUBLES)}
                  className={`py-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${type === EventType.DOUBLES ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                >
                  Đánh Đôi
                </button>
                <button
                  onClick={() => setType(EventType.SINGLES)}
                  className={`py-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${type === EventType.SINGLES ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                >
                  Đánh Đơn
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 flex gap-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => {
              if (name.trim()) {
                onAdd(name.trim(), type);
                setName('');
                onClose();
              }
            }}
            className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all disabled:opacity-50"
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
