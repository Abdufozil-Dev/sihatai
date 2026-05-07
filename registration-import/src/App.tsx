import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Calendar, 
  Scale, 
  Ruler, 
  CheckCircle2, 
  Activity,
  Heart
} from 'lucide-react';

interface UserData {
  fullName: string;
  age: string;
  gender: 'Erkak' | 'Ayol' | '';
  weight: string;
  height: string;
}

const STEPS = [
  { 
    id: 'welcome', 
    title: 'Xush kelibsiz', 
    description: 'Sogʻligʻingizni nazorat qilishni boshlaymiz', 
    emoji: 'https://emojicdn.elk.sh/🩺?style=apple' 
  },
  { 
    id: 'name', 
    title: 'Ismingiz', 
    description: 'Sizga qanday murojaat qilaylik?', 
    emoji: 'https://emojicdn.elk.sh/👤?style=apple' 
  },
  { 
    id: 'age', 
    title: 'Yoshingiz', 
    description: 'Tavsiyalarni aniqlashtirish uchun kerak', 
    emoji: 'https://emojicdn.elk.sh/🎂?style=apple' 
  },
  { 
    id: 'gender', 
    title: 'Jinsingiz', 
    description: 'Biologik maʻlumotlarni aniqlash', 
    emoji: 'https://emojicdn.elk.sh/🚻?style=apple' 
  },
  { 
    id: 'weight', 
    title: 'Vazningiz', 
    description: 'Hozirgi vazningizni kg da kiriting', 
    emoji: 'https://emojicdn.elk.sh/⚖️?style=apple' 
  },
  { 
    id: 'height', 
    title: 'Boʻyingiz', 
    description: 'Boʻyingizni cm da kiriting', 
    emoji: 'https://emojicdn.elk.sh/📏?style=apple' 
  },
  { 
    id: 'complete', 
    title: 'Tayyor!', 
    description: 'Maʻlumotlar muvaffaqiyatli saqlandi', 
    emoji: 'https://emojicdn.elk.sh/🎉?style=apple' 
  },
];

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [userData, setUserData] = useState<UserData>({
    fullName: '',
    age: '',
    gender: '',
    weight: '',
    height: '',
  });

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(s => s + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(s => s - 1);
    }
  };

  const updateData = (field: keyof UserData, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const progress = (currentStep / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-[#F9FBFF] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial gradients for depth */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-100 rounded-full blur-[120px] opacity-30" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[100px] opacity-50" />

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="registration-card overflow-hidden"
          >
            {/* Unified Header Inside Card */}
            <div className="flex items-center justify-between mb-8">
              {currentStep > 0 && currentStep < STEPS.length - 1 ? (
                <button
                  onClick={prevStep}
                  className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#0052FF] transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-10" />
              )}
              
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === currentStep ? 'w-8 bg-[#0052FF]' : 'w-1.5 bg-blue-50'
                    }`}
                  />
                ))}
              </div>
              
              <div className="w-10" />
            </div>

            {/* Step Content */}
            <div className="space-y-10">
              <div className="text-center space-y-3 px-2">
                <h1 className="text-[32px] font-[800] text-[#0A0F29] tracking-tight leading-tight">
                  {STEPS[currentStep].title}
                </h1>
                <p className="text-[#64748B] text-[15px] font-medium leading-relaxed">
                  {STEPS[currentStep].description}
                </p>
              </div>

              <div className="min-h-[140px] flex items-center justify-center">
                {currentStep === 0 && (
                  <div className="flex flex-col items-center gap-6">
                    <motion.div
                      animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="w-20 h-20 select-none"
                    >
                      <img src={STEPS[currentStep].emoji} alt="emoji" className="w-full h-full object-contain" />
                    </motion.div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="w-full space-y-4">
                    <div className="flex justify-center mb-2">
                       <img src={STEPS[currentStep].emoji} alt="emoji" className="w-12 h-12" />
                    </div>
                    <input
                      autoFocus
                      type="text"
                      className="input-field text-center"
                      placeholder="Ismingizni kiriting"
                      value={userData.fullName}
                      onChange={(e) => updateData('fullName', e.target.value)}
                    />
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="w-full flex flex-col items-center gap-4">
                    <img src={STEPS[currentStep].emoji} alt="emoji" className="w-12 h-12" />
                    <input
                      autoFocus
                      type="number"
                      className="input-field text-center max-w-[200px]"
                      placeholder="Yosh"
                      value={userData.age}
                      onChange={(e) => updateData('age', e.target.value)}
                    />
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="grid grid-cols-2 gap-4 w-full">
                    {[
                      { label: 'Erkak', emoji: 'https://emojicdn.elk.sh/👨?style=apple' },
                      { label: 'Ayol', emoji: 'https://emojicdn.elk.sh/👩?style=apple' }
                    ].map((g) => (
                      <button
                        key={g.label}
                        onClick={() => updateData('gender', g.label as 'Erkak' | 'Ayol')}
                        className={`p-6 rounded-[24px] border-2 transition-all duration-300 flex flex-col items-center gap-3 ${
                          userData.gender === g.label
                            ? 'border-[#0052FF] bg-blue-50/50 text-[#0052FF]'
                            : 'border-[#F1F5F9] bg-[#F8FAFC] text-slate-400'
                        }`}
                      >
                        <img src={g.emoji} alt={g.label} className="w-10 h-10 mb-1" />
                        <span className="font-bold text-sm tracking-wide">{g.label.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                )}

                {(currentStep === 4 || currentStep === 5) && (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <img src={STEPS[currentStep].emoji} alt="emoji" className="w-12 h-12" />
                    <div className="flex items-center gap-3">
                      <input
                        autoFocus
                        type="number"
                        className="input-field text-center max-w-[160px]"
                        placeholder="0"
                        value={currentStep === 4 ? userData.weight : userData.height}
                        onChange={(e) => updateData(currentStep === 4 ? 'weight' : 'height', e.target.value)}
                      />
                      <span className="text-2xl font-black text-blue-100 select-none">
                        {currentStep === 4 ? 'KG' : 'CM'}
                      </span>
                    </div>
                  </div>
                )}

                {currentStep === 6 && (
                  <div className="flex flex-col items-center gap-6 py-4">
                    <motion.div 
                      animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <img src={STEPS[currentStep].emoji} alt="success" className="w-20 h-20" />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-[#64748B] font-semibold mb-1">Muvaffaqiyatli!</p>
                      <h2 className="text-2xl font-extrabold text-[#0A0F29]">{userData.fullName}</h2>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={nextStep}
                disabled={isStepInvalid(currentStep, userData)}
                className={`w-full p-5 rounded-2xl flex items-center justify-center gap-3 font-extrabold text-base uppercase tracking-widest transition-all duration-300 ${
                  isStepInvalid(currentStep, userData)
                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                    : 'bg-[#0052FF] text-white shadow-[0_15px_30px_-5px_rgba(0,82,255,0.3)] hover:-translate-y-1 active:translate-y-0'
                }`}
              >
                {currentStep === 0 ? 'Boshlash' : currentStep === STEPS.length - 1 ? 'Profilga oʻtish' : 'Davom etish'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function InputWrapper({ children, icon: Icon, suffix }: { children: React.ReactNode, icon: any, suffix?: string }) {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">
        <Icon className="w-6 h-6" />
      </div>
      <div className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-5 pl-14 transition-all duration-200 group-focus-within:bg-white group-focus-within:border-blue-600 group-focus-within:ring-4 group-focus-within:ring-blue-50 flex items-center">
        {children}
        {suffix && (
          <span className="text-slate-400 font-bold ml-2">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function isStepInvalid(step: number, data: UserData) {
  switch (step) {
    case 1: return !data.fullName.trim();
    case 2: return !data.age || parseInt(data.age) < 1 || parseInt(data.age) > 120;
    case 3: return !data.gender;
    case 4: return !data.weight || parseInt(data.weight) < 20 || parseInt(data.weight) > 300;
    case 5: return !data.height || parseInt(data.height) < 50 || parseInt(data.height) > 250;
    default: return false;
  }
}

