import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { notificationService, AppNotification } from '../services/notificationService';
import { medicineLogService } from '../services/medicineLogService';
import { 
  Activity, 
  ChevronRight,
  Heart,
  Utensils,
  Bell,
  Sparkles,
  Pill,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn, isPlaceholderName } from '../lib/utils';
import CustomModal from '../components/CustomModal';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';

const tg = window.Telegram?.WebApp;

const mealPlans = [
  {
    breakfast: "Suli bo'tqasi (ovsyanka) mevalar bilan va ko'k choy.",
    lunch: "Tovuq go'shti va grechka, yangi bodring salati.",
    dinner: "Bug'da pishgan baliq va dimlangan sabzavotlar.",
    snack: "Bir hovuch yong'oq yoki olma."
  },
  {
    breakfast: "2 ta qaynatilgan tuxum, pishloq va javdar noni.",
    lunch: "Moshxo'rda (yog'siz) va mol go'shti, ko'katlar.",
    dinner: "Tvorog mevalar bilan yoki engil qatiq.",
    snack: "Banan yoki quritilgan mevalar."
  },
  {
    breakfast: "Suli yormasidan quymoq (ovsyannoblin) va qahva.",
    lunch: "Sabzavotli sho'rva va qaynatilgan mol go'shti.",
    dinner: "Tovuq filesi va guruch, pomidor salati.",
    snack: "Yogurt yoki nok."
  },
  {
    breakfast: "Ismaloqli omlet va ko'k choy.",
    lunch: "Yasmiqli sho'rva (shurpa) va javdar noni.",
    dinner: "Kurka go'shti va kinoa, yangi salat.",
    snack: "Bir stakan qatiq."
  },
  {
    breakfast: "Tvorogli quymoqlar (sirniki) va asal.",
    lunch: "Mol go'shti va sabzavotli ragu.",
    dinner: "Pishirilgan seld balig'i va brokkoli.",
    snack: "Bodom yoki yong'oq."
  },
  {
    breakfast: "Sutli grechka bo'tqasi va mevalar.",
    lunch: "Tovuqli Sezar salati (engil usulda).",
    dinner: "Sabzavotli karri va jigarrang guruch.",
    snack: "Greypfrut yoki apelsin."
  },
  {
    breakfast: "Avokado va tuxumli buterbrod (butun donli non).",
    lunch: "Qovoqli manti (bug'da pishgan) va qatiq.",
    dinner: "Engil sabzavotli sho'rva va qaynatilgan tovuq.",
    snack: "Yashil olma."
  }
];

const healthTipsData = [
  "Kuniga kamida 2 litr suv ichish metabolizmni yaxshilaydi va teringizni yoshroq saqlashga yordam beradi.",
  "Ertalabki badantarbiya qon aylanishini yaxshilaydi va kun davomida energiya beradi.",
  "Mevalar va sabzavotlarni ko'proq iste'mol qilish immunitetni mustahkamlaydi.",
  "Yaxshi uyqu (7-8 soat) miya faoliyatini va xotirani yaxshilash uchun zarurdir.",
  "Shakar va tuzni kamaytirish yurak-qon tomir kasalliklari xavfini kamaytiradi.",
  "Kun davomida ko'proq piyoda yurish vaznni nazorat qilishga yordam beradi.",
  "Stressni kamaytirish uchun meditatsiya yoki nafas mashqlarini bajaring.",
  "Har kuni yangi narsa o'rganish miya yoshligini saqlab qoladi.",
  "Tishlarni kuniga ikki marta yuvish nafaqat tishlar, balki butun tana salomatligi uchun muhim.",
  "Yashil choy antioksidantlarga boy bo'lib, organizmni tozalashga yordam beradi."
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Xayrli tong');
    else if (hour < 18) setGreeting('Xayrli kun');
    else setGreeting('Xayrli kech');
  }, []);

  const [modalType, setModalType] = useState<'meal' | 'weight' | 'health' | 'notification' | 'notifications_list' | null>(null);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.uid) return;
      try {
        const data = await notificationService.getUserNotifications(user.uid);
        setNotifications(data);
        setHasNewNotification(data.some(n => !n.isRead));
      } catch (err) {
        console.error("Fetch notifications failed:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling har 30 soniyada
    
    // Brauzer bildirshnomasi uchun ruxsat so'rash
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => clearInterval(interval);
  }, [user?.uid]);

  // Yangi bildirishnoma kelganda brauzer xabarini chiqarish
  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length > 0) {
      const latest = unread[0];
      // Faqat agar app fonda bo'lsa yoki ruxsat berilgan bo'lsa
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(latest.title, {
          body: latest.message,
          icon: '/metadata.json' // Ikonka yo'qligi sababli metadata'dan foydalanamiz yoki biron rasm
        });
      }
    }
  }, [notifications]);

  const handleBellClick = () => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }
    setModalType('notifications_list');
  };

  const markAsTaken = async (n: AppNotification) => {
    if (!user?.uid) return;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    
    try {
      // Dori nomini xabardan ajratib olishga harakat qilamiz (agar dori eslatmasi bo'lsa)
      // Bizning xabarimiz: "${r.medicine_name} ni ichib oling siz uchun bu muhim"
      const medicineName = n.message.split(' ni ichib oling')[0] || 'Dori';
      
      await medicineLogService.logIntake({
        userId: user.uid,
        medicineName: medicineName
      });
      
      await notificationService.markAsRead(n.id);
      setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, isRead: true } : notif));
      setNotificationMsg(`${medicineName} ichilgani qayd etildi!`);
      setModalType('notification');
    } catch (err) {
      console.error("Mark as taken failed:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.uid) return;
    try {
      const unread = notifications.filter(n => !n.isRead);
      await Promise.all(unread.map(n => notificationService.markAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setHasNewNotification(false);
    } catch (err) {
      console.error("Mark as read failed:", err);
    }
  };

  const handleAction = (message: string) => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light');
    }
    setNotificationMsg(message);
    setModalType('notification');
  };

  const handleNavigate = (path: string) => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light');
    }
    navigate(path);
  };

  const [healthInput, setHealthInput] = useState({ bp: '', pulse: '' });
  const [mealPlan, setMealPlan] = useState<{
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
  } | null>(null);
  const [bpPulse, setBpPulse] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  useEffect(() => {
    const dayOfWeek = new Date().getDay(); 
    setMealPlan(mealPlans[dayOfWeek]);

    if (user) {
      if (user.bloodPressure) setBpPulse(user.bloodPressure);
      if (user.weight) setWeight(String(user.weight));
      if (user.height) setHeight(String(user.height));
      
      setHealthInput({
        bp: user.bloodPressure || '',
        pulse: user.pulse || ''
      });
    }
  }, [user]);

  const handleShowMealPlan = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    setModalType('meal');
  };

  const calculateBMI = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (!w || !h) return null;
    const bmi = w / (h * h);
    return bmi.toFixed(1);
  };

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return 'Vazn kam';
    if (bmi < 25) return 'Me\'yorda';
    if (bmi < 30) return 'Ortiqcha vazn';
    return 'Semizlik';
  };

  const handleLogWeight = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    setModalType('weight');
  };

  const handleLogHealth = () => {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    setModalType('health');
  };

  const handleSaveWeight = async () => {
    if (!weight || !height) {
      alert("Iltimos, barcha maydonlarni to'ldiring.");
      return;
    }

    try {
      localStorage.setItem('health_weight', weight);
      localStorage.setItem('health_height', height);
      
      setNotificationMsg("Vazn ma'lumotlari saqlandi!");
      setModalType('notification');
    } catch (error) {
      alert("Ma'lumotlarni saqlashda xatolik yuz berdi.");
    }
  };

  const saveHealthData = async () => {
    if (!healthInput.bp || !healthInput.pulse) {
      alert("Iltimos, barcha maydonlarni to'ldiring.");
      return;
    }

    try {
      const newBp = `${healthInput.bp}`;
      setBpPulse(newBp);
      localStorage.setItem('health_bp', newBp);
      localStorage.setItem('health_pulse', healthInput.pulse);
      
      setNotificationMsg("Salomatlik ma'lumotlari saqlandi!");
      setModalType('notification');
    } catch (error) {
      alert("Ma'lumotlarni saqlashda xatolik yuz berdi.");
    }
  };

  const stats = [
    { label: 'Ovqatlanish rejasi', value: 'Ko\'rish', target: 'Sog\'lom', icon: Utensils, color: 'text-orange-600', bgColor: 'bg-orange-50', onClick: handleShowMealPlan },
    { label: 'Bosim/Puls', value: bpPulse || 'Kiritish', target: 'Normal', icon: Activity, color: 'text-rose-500', bgColor: 'bg-rose-50', onClick: handleLogHealth },
    { label: 'Vazn/BMI', value: weight ? `${weight} kg` : 'Kiritish', target: calculateBMI() ? `BMI: ${calculateBMI()}` : 'BMI', icon: Heart, color: 'text-emerald-500', bgColor: 'bg-emerald-50', onClick: handleLogWeight },
  ];

  const [nextReminder, setNextReminder] = useState<any>(null);
  
  const getDisplayName = () => {
    if (!user) return 'Foydalanuvchi';
    if (!isPlaceholderName(user.displayName)) return user.displayName?.trim() || 'Foydalanuvchi';
    if (user.username) return `@${user.username}`;
    return 'Foydalanuvchi';
  };

  const displayName = getDisplayName();
  const firstName = displayName.split(' ')[0];

  useEffect(() => {
    try {
      const savedReminders = localStorage.getItem('reminders');
      if (savedReminders) {
        const parsed = JSON.parse(savedReminders);
        const active = parsed.filter((r: any) => r.isActive);
        if (active.length > 0) {
          setNextReminder(active[0]);
        }
      }
    } catch (e) {
      // Silent fail
    }
  }, []);

  const getDailyTip = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return healthTipsData[dayOfYear % healthTipsData.length];
  };

  return (
    <div 
      className="space-y-10 pb-12 transition-transform duration-500 ease-out"
      style={{ transform: keyboardHeight > 0 ? `translateY(${-keyboardHeight * 0.4}px)` : 'none' }}
    >
      {/* Custom Modal */}
      <CustomModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={
          modalType === 'meal' ? 'Sog\'lom ovqatlanish rejasi' :
          modalType === 'weight' ? 'Vazn va BMI' :
          modalType === 'health' ? 'Salomatlik' :
          modalType === 'notifications_list' ? 'Bildirishnomalar' :
          'Bildirishnoma'
        }
        message={
          modalType === 'meal' ? 'Bugun uchun tavsiya etilgan menyu' :
          modalType === 'weight' ? 'Vazningiz va bo\'yingizni kiriting' :
          modalType === 'health' ? 'Qon bosimi va pulsni kiriting' :
          modalType === 'notifications_list' ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className={cn(
                    "p-4 rounded-2xl border transition-all",
                    n.isRead ? "bg-slate-50 border-slate-100" : "bg-blue-50 border-blue-100"
                  )}>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                      {!n.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {!n.isRead && n.title === 'Dori ichish vaqti!' && (
                        <button 
                          onClick={() => markAsTaken(n)}
                          className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-md shadow-blue-100 active:scale-95 transition-all"
                        >
                          DORI ICHILDI
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Bell size={32} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Hozircha bildirishnomalar yo'q</p>
                </div>
              )}
            </div>
          ) :
          notificationMsg
        }
        actions={
          modalType === 'meal' ? [
            { label: 'Tushunarli', onClick: () => setModalType(null), variant: 'primary' }
          ] :
          modalType === 'weight' ? [
            { 
              label: 'Saqlash', 
              onClick: handleSaveWeight,
              variant: 'primary' 
            },
            { label: 'Bekor qilish', onClick: () => setModalType(null), variant: 'secondary' }
          ] :
          modalType === 'health' ? [
            { 
              label: 'Saqlash', 
              onClick: saveHealthData,
              variant: 'primary' 
            },
            { label: 'Bekor qilish', onClick: () => setModalType(null), variant: 'secondary' }
          ] :
          modalType === 'notifications_list' ? [
            { 
              label: 'Barchasini o\'qish', 
              onClick: markAllAsRead, 
              variant: 'primary',
              disabled: !hasNewNotification 
            },
            { label: 'Yopish', onClick: () => setModalType(null), variant: 'secondary' }
          ] :
          modalType === 'notification' ? [
            { label: 'Tushunarli', onClick: () => setModalType(null), variant: 'primary' }
          ] :
          [{ label: 'Yopish', onClick: () => setModalType(null), variant: 'primary' }]
        }
      >
        {modalType === 'meal' && mealPlan && (
          <div className="space-y-4 py-2">
            {[
              { label: 'Nonushta', value: mealPlan.breakfast, color: 'bg-amber-50 text-amber-700 border-amber-100' },
              { label: 'Tushlik', value: mealPlan.lunch, color: 'bg-blue-50 text-blue-700 border-blue-100' },
              { label: 'Kechki ovqat', value: mealPlan.dinner, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
              { label: 'Tamaddi (Snek)', value: mealPlan.snack, color: 'bg-purple-50 text-purple-700 border-purple-100' }
            ].map((meal, idx) => (
              <div key={idx} className={cn("p-4 rounded-2xl border space-y-1", meal.color)}>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{meal.label}</p>
                <p className="text-sm font-bold leading-tight">{meal.value}</p>
              </div>
            ))}
          </div>
        )}

        {modalType === 'weight' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vazn (kg)</label>
                <input 
                  type="number" 
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="70"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bo'y (cm)</label>
                <input 
                  type="number" 
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="175"
                />
              </div>
            </div>
            {calculateBMI() && (
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Sizning BMI ko'rsatkichingiz</p>
                <p className="text-3xl font-black text-blue-700">{calculateBMI()}</p>
                <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mt-1">
                  Holat: {getBMIStatus(parseFloat(calculateBMI() || '0'))}
                </p>
              </div>
            )}
          </div>
        )}

        {modalType === 'health' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Qon bosimi</label>
              <input 
                type="text" 
                value={healthInput.bp}
                onChange={(e) => setHealthInput(prev => ({ ...prev, bp: e.target.value }))}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="120/80"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Puls</label>
              <input 
                type="text" 
                value={healthInput.pulse}
                onChange={(e) => setHealthInput(prev => ({ ...prev, pulse: e.target.value }))}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="75"
              />
            </div>
          </div>
        )}
      </CustomModal>

      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="pt-4">
          <p className="text-[#2563EB] font-semibold text-[10px] uppercase tracking-[0.22em] leading-none">
            {greeting}
          </p>
          <h1 className="text-[34px] font-semibold text-[#0F172A] tracking-tight leading-[1.08] mt-2">
            {firstName}
          </h1>
        </div>
        <button 
          onClick={handleBellClick}
          className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 active:scale-95 transition-all relative"
        >
          <Bell size={24} strokeWidth={2.5} />
          {hasNewNotification && (
            <span className="absolute top-4 right-4 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Daily Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <button
            key={idx}
            onClick={stat.onClick}
            className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3 cursor-pointer active:scale-95 transition-all outline-none group hover:border-blue-100"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bgColor, stat.color)}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[18px] font-bold text-slate-900 leading-none">{stat.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{stat.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* AI Health Banner */}
      <motion.div 
        whileTap={{ scale: 0.98 }}
        onClick={() => handleNavigate('/consult')}
        className="bg-[#2563EB] rounded-[2rem] p-6 text-white shadow-xl shadow-blue-200/40 relative overflow-hidden group cursor-pointer"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <Sparkles className="text-white" size={22} />
            </div>
            <div>
              <h3 className="text-[22px] font-bold tracking-tight uppercase">AI DIAGNOSTIKA</h3>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Sog'lig'ingizni tekshiring</p>
            </div>
          </div>
          <p className="text-blue-50 text-[13px] font-medium leading-relaxed opacity-90">
            Simptomlaringizni yozing va sun'iy intellekt yordamida tezkor tavsiyalarni oling
          </p>
          <div className="pt-0.5">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#2563EB] rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-lg">
              Boshlash <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </motion.div>

      {/* Upcoming Reminders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">ESLATMALAR</h3>
          <button 
            onClick={() => handleNavigate('/reminders')} 
            className="text-[9px] font-bold text-blue-600 uppercase tracking-widest"
          >
            Hammasi
          </button>
        </div>
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
          {nextReminder ? (
            <div 
              onClick={() => handleNavigate('/reminders')}
              className="p-5 flex items-center gap-4 group cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <Pill size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[15px] font-bold text-slate-900 uppercase truncate">{nextReminder.title}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bugun • {nextReminder.time}</p>
              </div>
              <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-200 group-hover:border-blue-600 group-hover:text-blue-600 transition-all">
                <ChevronRight size={16} />
              </div>
            </div>
          ) : (
            <div 
              onClick={() => handleNavigate('/reminders')}
              className="p-8 text-center space-y-2 cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Hozircha eslatmalar yo'q</p>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">+ Yangi qo'shish</p>
            </div>
          )}
        </div>
      </div>

      {/* Health Tip */}
      <div className="bg-emerald-50 rounded-[2.5rem] p-7 border border-emerald-100/50 relative overflow-hidden mb-8">
        <div className="absolute top-4 right-8 text-emerald-200/50">
          <Activity size={60} strokeWidth={1} />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Search size={18} />
            </div>
            <h3 className="text-[10px] font-bold text-emerald-700 uppercase tracking-[0.2em]">KUN MASLAHATI</h3>
          </div>
          <p className="text-slate-800 font-semibold leading-relaxed text-[14px] italic">
            "{getDailyTip()}"
          </p>
        </div>
      </div>
    </div>
  );
}
