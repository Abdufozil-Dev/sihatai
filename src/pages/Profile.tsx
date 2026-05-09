import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, Activity, Heart, Calendar, Ruler, Weight, ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import CustomModal from '../components/CustomModal';

import { userService, UserProfile } from '../services/userService';

const tg = window.Telegram?.WebApp;

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
    isPasswordPrompt?: boolean;
    isInputPrompt?: boolean;
    inputType?: string;
    fieldToUpdate?: keyof UserProfile;
    actions?: { label: string; onClick: (val?: string) => void; variant?: 'primary' | 'secondary' | 'danger' }[];
  }>({ isOpen: false });
  const [adminClicks, setAdminClicks] = useState(0);
  const [textInput, setTextInput] = useState('');
  
  const [profile, setProfile] = useState<Partial<UserProfile>>(user || {});

  useEffect(() => {
    if (user) setProfile(user);
  }, [user]);

  const updateField = async (field: keyof UserProfile, value: any) => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const updatedData = { [field]: value };
      await userService.updateProfile(user.uid, updatedData);
      const newProfile = { ...profile, ...updatedData };
      setProfile(newProfile);
      setUser({ ...user, ...updatedData }); // Update global state
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setLoading(false);
      setModalConfig(prev => ({ ...prev, isOpen: false }));
      setTextInput('');
    }
  };

  const openEditModal = (field: keyof UserProfile, label: string, type: string = 'text') => {
    setModalConfig({
      isOpen: true,
      title: `${label}NI TAHRIRLASH`,
      message: `Yangi qiymatni kiriting:`,
      isInputPrompt: true,
      inputType: type,
      fieldToUpdate: field,
      actions: [
        { 
          label: "SAQLASH", 
          onClick: (val) => updateField(field, type === 'number' ? parseFloat(val || '0') : val),
          variant: 'primary' 
        }
      ]
    });
    setTextInput(profile[field]?.toString() || '');
  };

  const calculateBMI = () => {
    const weight = profile.weight;
    const height = profile.height;
    if (!weight || !height) return null;
    const w = typeof weight === 'string' ? parseFloat(weight) : weight;
    const h = (typeof height === 'string' ? parseFloat(height) : height) / 100;
    if (isNaN(w) || isNaN(h) || h === 0) return null;
    return (w / (h * h)).toFixed(1);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Vazn kam', color: 'text-blue-500' };
    if (bmi < 25) return { label: 'Normal', color: 'text-emerald-500' };
    if (bmi < 30) return { label: 'Ortiqcha vazn', color: 'text-amber-500' };
    return { label: 'Semizlik', color: 'text-rose-500' };
  };

  const bmiValue = calculateBMI();
  const bmiInfo = bmiValue ? getBMICategory(parseFloat(bmiValue)) : null;

  const handleVersionClick = () => {
    const newClicks = adminClicks + 1;
    setAdminClicks(newClicks);
    
    if (newClicks >= 5) {
      setAdminClicks(0);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
      setModalConfig({
        isOpen: true,
        title: "Admin Kirish",
        message: "Maxfiy kodni kiriting:",
        isPasswordPrompt: true,
        actions: [
          { 
            label: "Tasdiqlash", 
            onClick: (val) => {
              if (val === '@rawdovs2021') {
                try {
                  const localUserKey = `user_profile_${user?.uid}`;
                  const updatedUser = { ...user, role: 'admin' };
                  localStorage.setItem(localUserKey, JSON.stringify(updatedUser));
                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                  window.location.hash = '#/admin';
                  window.location.reload();
                } catch (e) {
                  console.error("Error verifying admin code:", e);
                }
              }
            }, 
            variant: 'primary' 
          }
        ]
      });
    }
  };

  useEffect(() => {
    if (tg?.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(() => navigate('/'));
    }
    return () => {
      tg?.BackButton?.offClick();
      tg?.BackButton?.hide();
    };
  }, [navigate]);

  if (!user) return null;

  const IndicatorCard = ({ icon: Icon, label, value, colorClass, onClick }: any) => (
    <motion.button 
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white p-5 rounded-[2.5rem] border border-slate-50 shadow-sm flex flex-col gap-4 text-left group transition-all hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/50"
    >
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110", colorClass)}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">{label}</p>
        <p className={cn("font-bold text-slate-900", !value || value === 'Kiritilmagan' ? "text-[10px] uppercase tracking-wider text-slate-400/60" : "text-xl")}>
          {value || 'Kiritilmagan'}
        </p>
      </div>
    </motion.button>
  );

  return (
    <div className="space-y-8 pb-32">
      <CustomModal
        isOpen={modalConfig.isOpen}
        onClose={() => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          setTextInput('');
        }}
        title={modalConfig.title}
        message={modalConfig.message}
        actions={modalConfig.actions?.map(a => ({
          ...a,
          onClick: () => a.onClick(textInput)
        }))}
      >
        {(modalConfig.isPasswordPrompt || modalConfig.isInputPrompt) && (
          <input
            type={modalConfig.inputType || (modalConfig.isPasswordPrompt ? 'password' : 'text')}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="..."
            className="w-full h-12 px-4 mt-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-center tracking-widest"
            autoFocus
          />
        )}
      </CustomModal>

      {/* Header */}
      <div className="pt-12">
        <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">PROFIL</h1>
        <p className="text-[#2563EB] font-bold text-[10px] mt-1 uppercase tracking-widest">SHAXSIY MA'LUMOTLAR</p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-[2.25rem] p-5 shadow-lg shadow-slate-200/40 flex flex-col items-center border border-white">
        <div className="w-20 h-20 bg-[#EEF2FF] rounded-full flex items-center justify-center mb-4">
          <UserIcon size={34} className="text-[#4F46E5]" />
        </div>
        <h2 className="text-[30px] font-semibold text-[#0F172A] mb-0.5">{user.displayName || user.username || 'Foydalanuvchi'}</h2>
        <p className="text-slate-400 font-medium text-lg mb-4">
          {user.username ? `@${user.username}` : user.email || `ID: ${user.telegramId}`}
        </p>
        <button className="px-7 py-2 rounded-full border border-slate-100 font-semibold text-[#0F172A] text-[11px] uppercase tracking-[0.12em] active:scale-95 transition-all">
          ASOSIY TARIF
        </button>
      </div>

      {/* Medical Indicators Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-[#2563EB]" />
          <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">TIBBIY KO'RSATKICHLAR</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <IndicatorCard 
            icon={Weight} 
            label="VAZN" 
            value={profile.weight ? `${profile.weight} kg` : 'Kiritilmagan'} 
            colorClass="bg-emerald-50 text-emerald-500" 
            onClick={() => openEditModal('weight', 'VAZN', 'number')}
          />
          <IndicatorCard 
            icon={Ruler} 
            label="BO'Y" 
            value={profile.height ? `${profile.height} cm` : 'Kiritilmagan'} 
            colorClass="bg-blue-50 text-blue-500" 
            onClick={() => openEditModal('height', 'BO\'Y', 'number')}
          />
          <IndicatorCard 
            icon={Heart} 
            label="QON BOSIMI" 
            value={profile.bloodPressure || 'Kiritilmagan'} 
            colorClass="bg-rose-50 text-rose-500" 
            onClick={() => openEditModal('bloodPressure' as any, 'QON BOSIMI')}
          />
          <IndicatorCard 
            icon={Calendar} 
            label="YOSH" 
            value={profile.age?.toString() || 'Kiritilmagan'} 
            colorClass="bg-indigo-50 text-indigo-500" 
            onClick={() => openEditModal('age', 'YOSH', 'number')}
          />
        </div>
      </div>

      {/* BMI Card */}
      <div className="bg-white p-7 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 tracking-wider mb-1 uppercase">BMI INDEKSI</p>
          <p className="text-xs text-slate-400 font-medium">Tana massa indeksi</p>
        </div>
        <div className="text-right">
          <p className={cn("text-4xl font-black mb-1", bmiValue && parseFloat(bmiValue) > 25 ? "text-rose-500" : "text-emerald-500")}>
            {bmiValue || '--'}
          </p>
          <p className={cn("font-bold uppercase tracking-wider", !bmiInfo ? "text-[8px] text-slate-400/60" : cn("text-[10px]", bmiInfo.color))}>
            {bmiInfo?.label || 'Kiritilmagan'}
          </p>
        </div>
      </div>

      {/* Daily Queries Card */}
      <div className="bg-white p-7 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-[#0F172A] tracking-wider mb-1 uppercase">KUNLIK SO'ROVLAR</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">BUGUNGI ISHLATILGAN LIMIT</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-[#2563EB]">5</span>
          <span className="text-sm font-bold text-slate-300">/ 10</span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center pt-8">
        <button 
          onClick={handleVersionClick}
          className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase hover:text-blue-400 transition-colors"
        >
          MEDAI V1.0.0
        </button>
      </div>
    </div>
  );
}

