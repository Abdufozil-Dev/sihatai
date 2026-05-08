import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';

interface FormData {
  fullName: string;
  age: string;
  gender: 'Erkak' | 'Ayol' | '';
  weight: string;
  height: string;
}

const STEPS = [
  { title: 'Xush kelibsiz', description: "Sog'lig'ingizni nazorat qilishni boshlaymiz", emoji: 'https://emojicdn.elk.sh/🩺?style=apple&size=512' },
  { title: 'Ismingiz', description: 'Sizga qanday murojaat qilaylik?', emoji: 'https://emojicdn.elk.sh/👤?style=apple&size=512' },
  { title: 'Yoshingiz', description: 'Tavsiyalarni aniqroq berish uchun kerak', emoji: 'https://emojicdn.elk.sh/🎂?style=apple&size=512' },
  { title: 'Jinsingiz', description: "Biologik ma'lumotni aniqlash", emoji: 'https://emojicdn.elk.sh/🚻?style=apple&size=512' },
  { title: 'Vazningiz', description: "Hozirgi vazningizni kg da kiriting", emoji: 'https://emojicdn.elk.sh/⚖️?style=apple&size=512' },
  { title: "Bo'yingiz", description: "Bo'yingizni cm da kiriting", emoji: 'https://emojicdn.elk.sh/📏?style=apple&size=512' },
  { title: 'Tayyor!', description: "Ma'lumotlar muvaffaqiyatli saqlandi", emoji: 'https://emojicdn.elk.sh/🎉?style=apple&size=512' },
];

const tg = window.Telegram?.WebApp;

export default function Registration() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: user?.displayName || '',
    age: user?.age ? String(user.age) : '',
    gender: (user?.gender as 'Erkak' | 'Ayol' | '') || '',
    weight: user?.weight ? String(user.weight) : '',
    height: user?.height ? String(user.height) : '',
  });

  const isKeyboardVisible = useKeyboardHeight();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus logic for TMA native feel
  useEffect(() => {
    // We need a tiny delay for TMA viewport to be ready and AnimatePresence to mount
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // For iOS TMA, sometimes we need to trigger click or additional focus
        inputRef.current.click();
      }
    }, 150); 

    return () => clearTimeout(timer);
  }, [currentStep]);

  const isInvalid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return !formData.fullName.trim();
      case 2: {
        const age = Number(formData.age);
        return !Number.isFinite(age) || age < 1 || age > 120;
      }
      case 3:
        return !formData.gender;
      case 4: {
        const weight = Number(formData.weight);
        return !Number.isFinite(weight) || weight < 20 || weight > 300;
      }
      case 5: {
        const height = Number(formData.height);
        return !Number.isFinite(height) || height < 50 || height > 250;
      }
      default:
        return false;
    }
  }, [currentStep, formData]);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const patch = {
        displayName: formData.fullName.trim(),
        age: Number(formData.age),
        gender: formData.gender,
        weight: Number(formData.weight),
        height: Number(formData.height),
      };
      await userService.updateProfile(user.uid, patch);
      const updatedUser = { ...user, ...patch };
      
      // Update local state and storage
      setUser(updatedUser);
      localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(updatedUser));
      
      tg?.HapticFeedback?.notificationOccurred('success');
      
      // Explicitly navigate to home after successful save
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch (e) {
      alert("Saqlashda xatolik bo'ldi. Qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  };

  const nextStep = async () => {
    if (saving || isInvalid) return;
    
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } else {
      await saveProfile();
    }
  };

  const prevStep = () => {
    if (saving) return;
    if (currentStep > 0 && currentStep < STEPS.length - 1) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F9FBFF] overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-100 rounded-full blur-[120px] opacity-30" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[100px] opacity-50" />

      <div 
        className="w-full max-w-md relative z-10 keyboard-safe-transition" 
        style={{ transform: isKeyboardVisible ? 'translateY(-120px)' : 'translateY(10px)' }}
      >
        <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="registration-card"
            >
              <div className="flex items-center justify-between mb-8">
                {currentStep > 0 && currentStep < STEPS.length - 1 ? (
                  <button onClick={prevStep} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="w-10" />
                )}
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-[#0052FF]' : 'w-1.5 bg-blue-50'}`} />
                  ))}
                </div>
                <div className="w-10" />
              </div>

              <div className="space-y-8">
                <div className="text-center space-y-3 px-2">
                  <h1 className="text-[28px] font-[800] text-[#0A0F29] tracking-tight leading-tight font-display">{STEPS[currentStep].title}</h1>
                  <p className="text-[#64748B] text-[15px] font-medium leading-relaxed font-sans">{STEPS[currentStep].description}</p>
                </div>

                <div className="min-h-[140px] flex items-center justify-center">
                  {currentStep === 0 && (
                  <img 
                    src={STEPS[currentStep].emoji} 
                    alt="emoji" 
                    className="w-24 h-24 object-contain" 
                    loading="eager"
                  />
                )}

                {currentStep === 1 && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="w-full space-y-6"
                  >
                    <div className="flex justify-center">
                      <img 
                        src={STEPS[currentStep].emoji} 
                        alt="emoji" 
                        className="w-14 h-14" 
                        loading="eager"
                      />
                    </div>
                    <div className="relative group">
                      <input 
                        ref={inputRef}
                        type="text" 
                        className="input-field text-center font-sans" 
                        placeholder="Ismingizni kiriting" 
                        value={formData.fullName} 
                        onChange={(e) => updateField('fullName', e.target.value)} 
                      />
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="w-full flex flex-col items-center gap-6"
                  >
                    <img 
                      src={STEPS[currentStep].emoji} 
                      alt="emoji" 
                      className="w-14 h-14" 
                      loading="eager"
                    />
                    <input 
                        ref={inputRef}
                        type="number" 
                        className="input-field text-center max-w-[200px] font-sans" 
                        placeholder="Yosh" 
                        value={formData.age} 
                        onChange={(e) => updateField('age', e.target.value)} 
                      />
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="grid grid-cols-2 gap-4 w-full"
                  >
                    {[{ label: 'Erkak', emoji: 'https://emojicdn.elk.sh/👨?style=apple&size=512' }, { label: 'Ayol', emoji: 'https://emojicdn.elk.sh/👩?style=apple&size=512' }].map((g) => (
                      <button key={g.label} onClick={() => updateField('gender', g.label)} className={`p-6 rounded-[28px] border-2 transition-all duration-300 flex flex-col items-center gap-3 active:scale-95 ${formData.gender === g.label ? 'border-[#0052FF] bg-blue-50/50 text-[#0052FF] shadow-lg shadow-blue-100' : 'border-[#F1F5F9] bg-[#F8FAFC] text-slate-400'}`}>
                        <img src={g.emoji} alt={g.label} className="w-12 h-12 mb-1" loading="eager" />
                        <span className="font-bold text-sm tracking-wide font-display">{g.label.toUpperCase()}</span>
                      </button>
                    ))}
                  </motion.div>
                )}

                {(currentStep === 4 || currentStep === 5) && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex flex-col items-center gap-6 w-full"
                  >
                    <img 
                      src={STEPS[currentStep].emoji} 
                      alt="emoji" 
                      className="w-14 h-14" 
                      loading="eager"
                    />
                    <div className="flex items-center gap-4 w-full justify-center">
                        <input
                          ref={inputRef}
                          type="number"
                          className="input-field text-center max-w-[180px] font-sans"
                          placeholder="0"
                          value={currentStep === 4 ? formData.weight : formData.height}
                          onChange={(e) => updateField(currentStep === 4 ? 'weight' : 'height', e.target.value)}
                        />
                      <span className="text-3xl font-black text-blue-200 select-none font-display w-12">{currentStep === 4 ? 'KG' : 'CM'}</span>
                    </div>
                  </motion.div>
                )}

                {currentStep === 6 && (
                  <div className="flex flex-col items-center gap-5 text-center">
                    <img 
                      src={STEPS[currentStep].emoji} 
                      alt="success" 
                      className="w-20 h-20" 
                      loading="eager"
                    />
                    <p className="text-[#64748B] font-semibold font-sans">
                      {saving ? "Ma'lumotlar saqlanmoqda..." : "Tayyor! Profilga o'tishingiz mumkin"}
                    </p>
                  </div>
                )}
                </div>

                <button
                  onClick={nextStep}
                  disabled={isInvalid || saving}
                  className={`w-full p-5 rounded-2xl flex items-center justify-center gap-3 font-extrabold text-base uppercase tracking-widest transition-all duration-200 font-display active:scale-[0.98] ${
                    isInvalid || saving ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-[#0052FF] text-white shadow-[0_15px_30px_-5px_rgba(0,82,255,0.3)]'
                  }`}
                >
                  {currentStep === 0 ? 'Boshlash' : currentStep === STEPS.length - 1 ? 'Profilga o‘tish' : 'Davom etish'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
