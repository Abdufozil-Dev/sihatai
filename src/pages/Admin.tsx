import { useState, useEffect, useMemo } from 'react';
import { User, Clinic, Settings } from '../types';
import { Users, MapPin, Settings as SettingsIcon, BarChart3, Ban, Save, ChevronLeft, Plus, Trash2, Stethoscope, Send } from 'lucide-react';
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
  const [newClinic, setNewClinic] = useState({ 
    name: '', 
    address: '', 
    phone: '', 
    services: '', 
    photo_url: '', 
    description: '', 
    working_hours: '', 
    location_url: '' 
  });
  const [newDoctor, setNewDoctor] = useState({ 
    name: '', 
    specialty: '', 
    phone: '', 
    clinicId: '', 
    photo_url: '', 
    experience: '', 
    education: '', 
    bio: '', 
    availability: '' 
  });
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({
    aiSystemPrompt: "Siz malakali tibbiy yordamchisiz. Foydalanuvchi simptomlarini tahlil qiling va ehtimoliy sabablarni ayting. MUHIM: Har doim shifokorga murojaat qilishni tavsiya eting.",
    basicLimit: 5,
    proLimit: 20,
    doctorSectionTitle: "HAQIQIY SHIFOKOR",
    doctorSectionDescription: "Sun'iy intellekt yordami yetarli bo'lmasa yoki sizga chuqurroq tibbiy tahlil kerak bo'lsa, bizning malakali va ko'p yillik tajribaga ega shifokorlarimiz bilan bog'laning.",
    doctorSectionTags: ['Professional tahlil', 'Individual yondashuv', '24/7 Aloqa'],
    doctorSectionIcon: "https://emojicdn.elk.sh/👩‍⚕️?style=apple",
    doctorAssignments: []
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Users from server
        let usersData: User[] = [];
        try {
          const r = await fetch('/api/users');
          if (r.ok) usersData = await r.json();
        } catch (e) {
          console.error("Fetch users error:", e);
        }
        
        // Fetch Clinics from server
        let clinicsData: Clinic[] = [];
        try {
          const r = await fetch('/api/clinics');
          if (r.ok) clinicsData = await r.json();
        } catch (e) {
          console.error("Fetch clinics error:", e);
        }
        
        // Fetch Settings from server
        let settingsData = settings;
        try {
          const r = await fetch('/api/settings');
          if (r.ok) settingsData = await r.json();
        } catch (e) {
          console.error("Fetch settings error:", e);
        }

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

  const addClinic = async () => {
    if (!newClinic.name || !newClinic.address) return;
    
    try {
      const response = await fetch('/api/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClinic,
          services: newClinic.services.split(',').map(s => s.trim()),
        })
      });

      if (response.ok) {
        const savedClinic = await response.json();
        setClinics([...clinics, { ...savedClinic, doctors: [] }]);
        setNewClinic({ 
          name: '', 
          address: '', 
          phone: '', 
          services: '', 
          photo_url: '', 
          description: '', 
          working_hours: '', 
          location_url: '' 
        });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      }
    } catch (error) {
      console.error("Error adding clinic:", error);
    }
  };

  const addDoctor = async () => {
    if (!newDoctor.name || !newDoctor.clinicId) return;

    try {
      const response = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: newDoctor.clinicId,
          name: newDoctor.name,
          specialty: newDoctor.specialty,
          phone: newDoctor.phone,
          photo_url: newDoctor.photo_url,
          experience: newDoctor.experience,
          education: newDoctor.education,
          bio: newDoctor.bio,
          availability: newDoctor.availability.split(',').map(s => s.trim()),
        })
      });

      if (response.ok) {
        const savedDoctor = await response.json();
        setClinics(clinics.map(c => {
          if (c.id === newDoctor.clinicId) {
            return { ...c, doctors: [...(c.doctors || []), savedDoctor] };
          }
          return c;
        }));
        setNewDoctor({ 
          name: '', 
          specialty: '', 
          phone: '', 
          clinicId: '', 
          photo_url: '', 
          experience: '', 
          education: '', 
          bio: '', 
          availability: '' 
        });
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      }
    } catch (error) {
      console.error("Error adding doctor:", error);
    }
  };

  const deleteDoctor = async (id: string, clinicId: string) => {
    try {
      const response = await fetch(`/api/doctors/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setClinics(clinics.map(c => {
          if (c.id === clinicId) {
            return { ...c, doctors: (c.doctors || []).filter(d => d.id !== id) };
          }
          return c;
        }));
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
      }
    } catch (error) {
      console.error("Error deleting doctor:", error);
    }
  };

  const deleteClinic = async (id: string) => {
    try {
      const response = await fetch(`/api/clinics/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setClinics(clinics.filter(c => c.id !== id));
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
      }
    } catch (error) {
      console.error("Error deleting clinic:", error);
    }
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
    
    setUsers(users.map(u => u.uid === uid ? { ...u, isBlocked: !isBlocked } : u));
    
    fetch(`/api/users/${encodeURIComponent(uid)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBlocked: !isBlocked }),
    }).catch(() => {});
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
        alert('Sozlamalar muvaffaqiyatli saqlandi!');
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Xatolik yuz berdi!');
    }
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
        const regDate = new Date(u.createdAt);
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
          <h1 className="text-3xl font-semibold text-[#0F172A] tracking-tight">ADMIN PANEL</h1>
          <p className="text-[#2563EB] font-medium text-[10px] mt-1 uppercase tracking-widest">LOKAL BOSHQARUV</p>
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
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-semibold uppercase tracking-widest transition-all whitespace-nowrap",
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
                <p className="text-slate-400 text-[9px] font-medium uppercase tracking-widest">Jami Userlar</p>
                <p className="text-2xl font-semibold text-slate-900 tracking-tight">{users.length}</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-1.5">
                <p className="text-slate-400 text-[9px] font-medium uppercase tracking-widest">Jami Klinikalar</p>
                <p className="text-2xl font-semibold text-slate-900 tracking-tight">{clinics.length}</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-1.5">
                <p className="text-slate-400 text-[9px] font-medium uppercase tracking-widest">Bloklanganlar</p>
                <p className="text-2xl font-semibold text-rose-600 tracking-tight">{users.filter(u => u.isBlocked).length}</p>
              </div>
            </div>

            <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 tracking-tight uppercase">Haftalik faollik</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                  <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">So'rovlar</span>
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
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
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
                  <p className="text-slate-400 text-[10px] font-medium uppercase tracking-[0.2em]">Userlar topilmadi</p>
                </div>
            ) : (
                users.map((user) => (
                    <div key={user.uid} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:border-blue-100 transition-all">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                          {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <Users size={20} className="text-slate-300" />}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900 text-sm tracking-tight">{user.displayName}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">{user.role}</span>
                            <span className="text-[8px] font-semibold text-slate-300 uppercase tracking-widest">ID: {user.telegramId}</span>
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
              <h3 className="text-lg font-semibold text-slate-900 uppercase tracking-tight">Yangi klinika qo'shish</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <input
                      placeholder="Klinika nomi"
                      value={newClinic.name}
                      onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                      className="flex-1 h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                    />
                    <input
                      placeholder="Telefon"
                      value={newClinic.phone}
                      onChange={(e) => setNewClinic({ ...newClinic, phone: e.target.value })}
                      className="w-1/3 h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                    />
                  </div>
                  <input
                    placeholder="Manzil"
                    value={newClinic.address}
                    onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                  />
                  <input
                    placeholder="Rasm URL (Photo URL)"
                    value={newClinic.photo_url}
                    onChange={(e) => setNewClinic({ ...newClinic, photo_url: e.target.value })}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                  />
                  <textarea
                    placeholder="Tavsif (Description)"
                    value={newClinic.description}
                    onChange={(e) => setNewClinic({ ...newClinic, description: e.target.value })}
                    className="w-full h-24 p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium text-sm"
                  />
                  <div className="flex gap-4">
                    <input
                      placeholder="Ish vaqti (e.g. 09:00-18:00)"
                      value={newClinic.working_hours}
                      onChange={(e) => setNewClinic({ ...newClinic, working_hours: e.target.value })}
                      className="flex-1 h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                    />
                    <input
                      placeholder="Xaritalar URL (Location)"
                      value={newClinic.location_url}
                      onChange={(e) => setNewClinic({ ...newClinic, location_url: e.target.value })}
                      className="flex-1 h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                    />
                  </div>
                  <input
                    placeholder="Xizmatlar (vergul bilan ajrating)"
                    value={newClinic.services}
                    onChange={(e) => setNewClinic({ ...newClinic, services: e.target.value })}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                  />
                </div>
                <button 
                  onClick={addClinic}
                  className="w-full h-12 bg-blue-600 text-white rounded-xl font-semibold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  <span>Klinikani saqlash</span>
                </button>
              </div>
            </div>

            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-widest ml-2">Mavjud klinikalar va shifokorlar</h3>
              
              <div className="space-y-6">
                {clinics.map((clinic) => (
                  <div key={clinic.id} className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100 p-6 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-slate-900 text-lg leading-tight">{clinic.name}</h4>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{clinic.address}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {clinic.services?.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-semibold rounded-md uppercase">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteClinic(clinic.id)}
                        className="w-10 h-10 bg-white text-slate-300 hover:text-rose-500 rounded-xl flex items-center justify-center transition-all border border-slate-100 shadow-sm"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button 
                          onClick={() => setSelectedClinicId(selectedClinicId === clinic.id ? null : clinic.id)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[9px] font-semibold uppercase tracking-widest transition-all",
                            selectedClinicId === clinic.id ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-100"
                          )}
                        >
                          {selectedClinicId === clinic.id ? 'Yopish' : "Shifokor qo'shish"}
                        </button>
                        <button 
                          onClick={() => deleteClinic(clinic.id)}
                          className="w-10 h-10 flex items-center justify-center text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Add Doctor Form (Expanded) */}
                    <AnimatePresence>
                      {selectedClinicId === clinic.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-50/50 p-6 border-b border-slate-100 overflow-hidden"
                      >
                        <h5 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mb-4">Shifokor qo'shish: {clinic.name}</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            placeholder="Shifokor ismi"
                            value={newDoctor.name}
                            onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value, clinicId: clinic.id })}
                            className="h-11 px-4 bg-white border border-slate-100 rounded-xl outline-none text-sm font-medium"
                          />
                          <input
                            placeholder="Mutaxassisligi"
                            value={newDoctor.specialty}
                            onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                            className="h-11 px-4 bg-white border border-slate-100 rounded-xl outline-none text-sm font-medium"
                          />
                          <input
                            placeholder="Telefon"
                            value={newDoctor.phone}
                            onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                            className="h-11 px-4 bg-white border border-slate-100 rounded-xl outline-none text-sm font-medium"
                          />
                          <input
                            placeholder="Rasm URL"
                            value={newDoctor.photo_url}
                            onChange={(e) => setNewDoctor({ ...newDoctor, photo_url: e.target.value })}
                            className="h-11 px-4 bg-white border border-slate-100 rounded-xl outline-none text-sm font-medium"
                          />
                          <input
                            placeholder="Tajribasi (e.g. 10 yil)"
                            value={newDoctor.experience}
                            onChange={(e) => setNewDoctor({ ...newDoctor, experience: e.target.value })}
                            className="h-11 px-4 bg-white border border-slate-100 rounded-xl outline-none text-sm font-medium"
                          />
                          <input
                            placeholder="O'qigan joyi"
                            value={newDoctor.education}
                            onChange={(e) => setNewDoctor({ ...newDoctor, education: e.target.value })}
                            className="h-11 px-4 bg-white border border-slate-100 rounded-xl outline-none text-sm font-medium"
                          />
                          <textarea
                            placeholder="Biografiya"
                            value={newDoctor.bio}
                            onChange={(e) => setNewDoctor({ ...newDoctor, bio: e.target.value })}
                            className="col-span-2 h-20 p-4 bg-white border border-slate-100 rounded-xl outline-none text-sm font-medium"
                          />
                          <input
                            placeholder="Vaqtlari (vergul bilan, e.g. 09:00, 10:00)"
                            value={newDoctor.availability}
                            onChange={(e) => setNewDoctor({ ...newDoctor, availability: e.target.value })}
                            className="col-span-2 h-11 px-4 bg-white border border-slate-100 rounded-xl outline-none text-sm font-medium"
                          />
                        </div>
                        <button 
                          onClick={addDoctor}
                          className="mt-4 w-full h-11 bg-slate-900 text-white rounded-xl font-semibold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                        >
                          <Plus size={16} />
                          <span>Shifokorni saqlash</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-3 pt-2">
                    <h5 className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Klinika shifokorlari ({clinic.doctors?.length || 0})</h5>
                    <div className="grid grid-cols-1 gap-2">
                      {clinic.doctors?.map((doctor) => (
                        <div key={doctor.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group/doc transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100">
                              {doctor.photo_url ? (
                                <img src={doctor.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Stethoscope size={18} className="text-slate-300" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm leading-none mb-1">{doctor.name}</p>
                              <p className="text-[9px] font-medium text-blue-600 uppercase tracking-widest">{doctor.specialty}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => deleteDoctor(doctor.id, clinic.id)}
                            className="w-8 h-8 text-slate-200 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {(!clinic.doctors || clinic.doctors.length === 0) && (
                        <p className="text-[10px] text-slate-300 font-medium uppercase tracking-widest text-center py-4 italic">
                          Shifokorlar hali qo'shilmagan
                        </p>
                      )}
                    </div>
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
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
              <div className="space-y-3">
                <label className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">E'lon (Broadcast)</label>
                <div className="relative">
                  <textarea 
                    placeholder="Barcha userlarga xabar yuborish..."
                    className="w-full h-32 p-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium text-sm leading-relaxed"
                  />
                  <button className="absolute bottom-4 right-4 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 active:scale-90 transition-all">
                    <Send size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">AI System Prompt</label>
                <textarea 
                  value={settings.aiSystemPrompt}
                  onChange={(e) => setSettings({ ...settings, aiSystemPrompt: e.target.value })}
                  className="w-full h-40 p-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium text-sm leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Basic Limit</label>
                  <input 
                    type="number"
                    value={settings.basicLimit}
                    onChange={(e) => setSettings({ ...settings, basicLimit: parseInt(e.target.value) })}
                    className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium text-slate-900"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Pro Limit</label>
                  <input 
                    type="number"
                    value={settings.proLimit}
                    onChange={(e) => setSettings({ ...settings, proLimit: parseInt(e.target.value) })}
                    className="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <button 
                  onClick={saveSettings}
                  className="w-full h-14 bg-blue-600 text-white rounded-2xl font-semibold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-200 active:scale-95 transition-all"
                >
                  <Save size={20} />
                  <span>Sozlamalarni saqlash</span>
                </button>

                <button 
                  onClick={handleClearAllLocalData}
                  className="w-full h-14 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-semibold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <Trash2 size={20} />
                  <span>Barcha ma'lumotlarni o'chirish</span>
                </button>
                <p className="text-[10px] text-slate-400 font-medium text-center px-2">
                  Supabase dagi ma&apos;lumotlar o&apos;chmaydi — faqat ushbu qurilmadagi brauzer xotirasi.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
