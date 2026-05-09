import React, { useState, useEffect, useMemo } from 'react';
import { User, Clinic, Settings, Doctor } from '../types';
import { Users, MapPin, Settings as SettingsIcon, BarChart3, Shield, Ban, Save, ChevronLeft, Plus, Trash2, Phone, Stethoscope, Megaphone, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clearAllAppLocalStorage } from '../lib/clearAppStorage';

const tg = window.Telegram?.WebApp;

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'clinics' | 'settings'>('stats');
  const [users, setUsers] = useState<User[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [newClinic, setNewClinic] = useState({ name: '', address: '', phone: '', services: '' });
  const [newDoctor, setNewDoctor] = useState({ name: '', specialty: '', phone: '', clinicId: '' });
  const [settings, setSettings] = useState<Settings>({
    aiSystemPrompt: "Siz malakali tibbiy yordamchisiz. Foydalanuvchi simptomlarini tahlil qiling va ehtimoliy sabablarni ayting. MUHIM: Har doim shifokorga murojaat qilishni tavsiya eting.",
    basicLimit: 5,
    proLimit: 20
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Users from server (Supabase). Fallback: localStorage cache.
        let usersData: User[] = [];
        try {
          const r = await fetch('/api/users');
          if (r.ok) usersData = await r.json();
        } catch {}
        if (!usersData.length) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('user_profile_')) {
              usersData.push(JSON.parse(localStorage.getItem(key)!));
            }
          }
        }
        
        // Fetch Clinics
        const clinicsData = JSON.parse(localStorage.getItem('clinics') || '[]');
        
        // Fetch Settings
        const settingsData = JSON.parse(localStorage.getItem('admin_settings') || JSON.stringify(settings));

        setUsers(usersData);
        setClinics(clinicsData);
        setSettings(settingsData);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const addClinic = () => {
    if (!newClinic.name || !newClinic.address) return;
    const clinic: Clinic = {
      id: Date.now().toString(),
      name: newClinic.name,
      address: newClinic.address,
      phone: newClinic.phone,
      services: newClinic.services.split(',').map(s => s.trim()),
      createdAt: Date.now()
    };
    
    const updatedClinics = [...clinics, clinic];
    setClinics(updatedClinics);
    localStorage.setItem('clinics', JSON.stringify(updatedClinics));
    setNewClinic({ name: '', address: '', phone: '', services: '' });
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  };

  const deleteClinic = (id: string) => {
    const updatedClinics = clinics.filter(c => c.id !== id);
    setClinics(updatedClinics);
    localStorage.setItem('clinics', JSON.stringify(updatedClinics));
  };

  const handleTabChange = (tab: any) => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.selectionChanged();
    }
    setActiveTab(tab);
  };

  const toggleBlock = (uid: string, isBlocked: boolean) => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }
    
    const updatedUsers = users.map(u => {
      if (u.uid === uid) {
        const updated = { ...u, isBlocked: !isBlocked };
        localStorage.setItem(`user_profile_${uid}`, JSON.stringify(updated));
        return updated;
      }
      return u;
    });
    setUsers(updatedUsers);
    fetch(`/api/users/${encodeURIComponent(uid)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBlocked: !isBlocked }),
    }).catch(() => {});
  };

  const [broadcastText, setBroadcastText] = useState('');

  const saveSettings = () => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred('success');
    }
    localStorage.setItem('admin_settings', JSON.stringify(settings));
    if (broadcastText) {
      localStorage.setItem('admin_broadcast', JSON.stringify({ text: broadcastText }));
      // Dispatch storage event manually for the same window
      window.dispatchEvent(new Event('storage'));
    } else {
      localStorage.removeItem('admin_broadcast');
      window.dispatchEvent(new Event('storage'));
    }
    alert('Sozlamalar muvaffaqiyatli saqlandi!');
  };

  const handleClearAllLocalData = () => {
    const msg =
      "Barcha lokal ma'lumotlar o'chiriladi: foydalanuvchilar profillari, klinikalar, eslatmalar, admin sozlamalari. Davom etasizmi?";
    if (!window.confirm(msg)) return;
    clearAllAppLocalStorage();
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
    window.location.reload();
  };

  const chartData = useMemo(() => {
    const days = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayName = days[d.getDay()];
      const count = users.filter(u => {
        const regDate = new Date(u.createdAt || 0);
        return regDate.toDateString() === d.toDateString();
      }).length;
      data.push({ name: dayName, users: count, requests: count * 12 });
    }
    return data;
  }, [users]);

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
  }, [navigate]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="pt-12 flex items-center gap-4">
        <button 
          onClick={handleBack}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 active:scale-95 transition-all"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">ADMIN PANEL</h1>
          <p className="text-[#2563EB] font-bold text-[10px] mt-1 uppercase tracking-widest">LOKAL BOSHQARUV</p>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar mx-1 gap-1">
        {[
          { id: 'stats', icon: BarChart3, label: 'Statistika' },
          { id: 'users', icon: Users, label: 'Userlar' },
          { id: 'clinics', icon: MapPin, label: 'Klinikalar' },
          { id: 'settings', icon: SettingsIcon, label: 'Sozlamalar' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-400 hover:bg-slate-50"
            )}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-1.5">
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Jami Userlar</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{users.length}</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-1.5">
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Jami Klinikalar</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{clinics.length}</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-1.5">
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Bloklanganlar</p>
                <p className="text-2xl font-bold text-rose-600 tracking-tight">{users.filter(u => u.isBlocked).length}</p>
              </div>
            </div>

            <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight uppercase">Haftalik faollik</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">So'rovlar</span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 15px 20px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    />
                    <Area type="monotone" dataKey="requests" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {users.length === 0 ? (
                <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center space-y-4">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Userlar topilmadi</p>
                </div>
            ) : (
                users.map((user) => (
                    <div key={user.uid} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:border-blue-100 transition-all">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                          {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <Users size={20} className="text-slate-300" />}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-sm tracking-tight">{user.displayName}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</span>
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">ID: {user.uid}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleBlock(user.uid, user.isBlocked)}
                          className={cn(
                            "w-10 h-10 rounded-xl transition-all flex items-center justify-center shadow-sm active:scale-90",
                            user.isBlocked ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-50 text-slate-400 border border-slate-100"
                          )}
                        >
                          <Ban size={18} />
                        </button>
                      </div>
                    </div>
                  ))
            )}
          </motion.div>
        )}


        {activeTab === 'clinics' && (
          <motion.div
            key="clinics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Add Clinic Form */}
            <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-5">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Yangi klinika qo'shish</h3>
              <div className="grid grid-cols-1 gap-4">
                <input
                  placeholder="Klinika nomi"
                  value={newClinic.name}
                  onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                />
                <input
                  placeholder="Manzil"
                  value={newClinic.address}
                  onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                />
                <input
                  placeholder="Telefon"
                  value={newClinic.phone}
                  onChange={(e) => setNewClinic({ ...newClinic, phone: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                />
                <input
                  placeholder="Xizmatlar (vergul bilan ajrating)"
                  value={newClinic.services}
                  onChange={(e) => setNewClinic({ ...newClinic, services: e.target.value })}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                />
                <button 
                  onClick={addClinic}
                  className="w-full h-12 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Klinikani saqlash
                </button>
              </div>
            </div>

            {/* Clinics List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-2">Mavjud klinikalar</h3>
              {clinics.map((clinic) => (
                <div key={clinic.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{clinic.name}</h4>
                        <p className="text-[10px] text-slate-400 font-medium">{clinic.address}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteClinic(clinic.id)}
                      className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-7 rounded-[2.5rem] border border-slate-100 space-y-7 shadow-sm"
          >
            <div className="space-y-2.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">E'lon (Broadcast)</label>
              <input
                type="text"
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Yangi e'lon matni..."
                className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium text-slate-900"
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">AI System Prompt</label>
              <textarea
                value={settings?.aiSystemPrompt || ''}
                onChange={(e) => setSettings({ ...settings!, aiSystemPrompt: e.target.value })}
                className="w-full h-48 p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs font-medium leading-relaxed outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Basic Limit</label>
                <input
                  type="number"
                  value={settings?.basicLimit || 0}
                  onChange={(e) => setSettings({ ...settings!, basicLimit: parseInt(e.target.value) })}
                  className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-bold text-slate-900"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Pro Limit</label>
                <input
                  type="number"
                  value={settings?.proLimit || 0}
                  onChange={(e) => setSettings({ ...settings!, proLimit: parseInt(e.target.value) })}
                  className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-100">
              <button 
                onClick={saveSettings}
                className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-200 active:scale-95 transition-all"
              >
                <Save size={20} />
                Sozlamalarni saqlash
              </button>

              <button
                type="button"
                onClick={handleClearAllLocalData}
                className="w-full h-14 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Trash2 size={20} />
                Barcha lokal ma&apos;lumotlarni tozalash
              </button>
              <p className="text-[10px] text-slate-400 font-medium text-center px-2">
                Supabase dagi ma&apos;lumotlar o&apos;chmaydi — faqat ushbu qurilmadagi brauzer xotirasi.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
