import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reminderService, Reminder as FirestoreReminder } from '../services/reminderService';
import { Bell, Plus, Trash2, Clock, CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const tg = window.Telegram?.WebApp;

export default function Reminders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<FirestoreReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', time: '', dosage: '', days: [] as string[] });

  const daysOfWeek = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

  const handleBack = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    navigate(-1);
  };

  useEffect(() => {
    if (tg?.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    }
    return () => {
      tg?.BackButton?.offClick();
      tg?.BackButton?.hide();
    };
  }, []);

  useEffect(() => {
    const fetchReminders = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const data = await reminderService.getUserReminders(user.uid);
        setReminders(data);
      } catch (err) {
        console.error("Fetch reminders failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReminders();
  }, [user?.uid]);

  const handleAdd = async () => {
    if (!newReminder.title || !newReminder.time || !user) return;
    
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred('success');
    }

    try {
      const createdReminder = await reminderService.addReminder({
        userId: user.uid,
        medicineName: newReminder.title,
        dosage: newReminder.dosage || '1 mahal',
        time: newReminder.time,
        days: newReminder.days,
        isActive: true,
      });

      if (createdReminder) {
        setReminders(prev => [createdReminder, ...prev]);
        setIsAdding(false);
        setNewReminder({ title: '', time: '', dosage: '', days: [] });
      }
    } catch (err) {
      console.error("Add reminder failed:", err);
    }
  };

  const toggleReminder = async (id: string | undefined, current: boolean) => {
    if (!id || !user?.uid) return;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.selectionChanged();
    }
    try {
      await reminderService.toggleReminder(id, !current);
      setReminders(prev => prev.map(r => r.id === id ? { ...r, isActive: !current } : r));
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  const deleteReminder = async (id: string | undefined) => {
    if (!id || !user?.uid) return;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }
    try {
      await reminderService.deleteReminder(id);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="pt-12 flex items-center gap-4">
        <button 
          onClick={handleBack}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 active:scale-95 transition-all"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">ESLATMALAR</h1>
          <p className="text-[#2563EB] font-bold text-[10px] mt-1 uppercase tracking-widest">DORI QABULI NAZORATI</p>
        </div>
      </div>

      {/* Summary Section */}
      <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex items-center justify-between group">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">Yangi dori</h2>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Vaqtida ichish nazorati</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "w-14 h-14 flex items-center justify-center rounded-2xl shadow-lg transition-all active:scale-90",
            isAdding ? "bg-rose-500 text-white shadow-rose-200 rotate-45" : "bg-blue-600 text-white shadow-blue-200"
          )}
        >
          <Plus size={28} />
        </button>
      </section>

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-white rounded-[2.5rem] p-7 shadow-xl shadow-blue-100/40 border border-blue-100 overflow-hidden"
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Dori nomi</label>
                <input
                  type="text"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  placeholder="Masalan: Paratsetamol"
                  className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-semibold text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Vaqt</label>
                  <input
                    type="time"
                    value={newReminder.time}
                    onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                    className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Kunlar</label>
                  <div className="flex flex-wrap gap-1">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day}
                        onClick={() => {
                          const days = newReminder.days.includes(day)
                            ? newReminder.days.filter(d => d !== day)
                            : [...newReminder.days, day];
                          setNewReminder({ ...newReminder, days });
                        }}
                        className={cn(
                          "w-8 h-8 rounded-lg text-[9px] font-bold transition-all uppercase tracking-tighter",
                          newReminder.days.includes(day) ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-50 text-slate-400 border border-slate-100"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="flex-1 h-14 bg-slate-50 text-slate-500 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  Bekor qilish
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex-1 h-14 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all"
                >
                  Saqlash
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reminders List */}
      <div className="space-y-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reminders.length > 0 ? (
          reminders.map((reminder) => (
            <motion.div
              key={reminder.id}
              layout
              className={cn(
                "bg-white p-6 rounded-[2.5rem] border transition-all flex items-center justify-between group",
                reminder.isActive ? "border-slate-100 shadow-sm hover:shadow-lg hover:shadow-blue-50/50" : "border-slate-50 opacity-60 grayscale"
              )}
            >
              <div className="flex items-center gap-5">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105",
                  reminder.isActive ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                )}>
                  <Clock size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">{reminder.medicineName}</h3>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg">{reminder.time}</span>
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{reminder.days.join(', ')}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => toggleReminder(reminder.id, reminder.isActive)}
                  className={cn(
                    "w-10 h-10 rounded-xl transition-all flex items-center justify-center shadow-sm active:scale-90",
                    reminder.isActive ? "text-emerald-600 bg-emerald-50 border border-emerald-100" : "text-slate-400 bg-slate-50 border border-slate-100"
                  )}
                >
                  {reminder.isActive ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </button>
                <button 
                  onClick={() => deleteReminder(reminder.id)}
                  className="w-10 h-10 text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all flex items-center justify-center border border-rose-100 active:scale-90"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200">
              <Bell size={32} />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Hali eslatmalar yo'q</p>
          </div>
        )}
      </div>
    </div>
  );
}
