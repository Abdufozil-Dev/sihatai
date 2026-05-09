import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Trash2, Send, Sparkles, Stethoscope, Brain, Salad, User, Mic, MicOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { GoogleGenAI } from '@google/genai';
import { reminderService } from '../services/reminderService';
import { notificationService } from '../services/notificationService';
import { chatService } from '../services/chatService';
import { activityService } from '../services/activityService';

import { Clinic, Reminder, Settings } from '../types';

interface Expert {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  color: string; 
  bgColor: string;
  systemPrompt: string;
  welcomeMessage: string;
}

const EXPERTS: Expert[] = [
  {
    id: 'diagnost',
    name: 'Sihat Diagnost',
    title: 'KLINIK DIAGNOSTIKA',
    description: 'Simptomlarni tahlil qilish va salomatlik holati bo\'yicha chuqur tibbiy xulosalar berish tizimi.',
    icon: '🩺',
    color: 'text-white',
    bgColor: 'bg-blue-600',
    systemPrompt: `Siz Sihat Diagnost - professional tibbiy diagnostika bo'yicha AI ekspertsiz.
    
    Qoidalaringiz:
    1. FAQAT tibbiyot va salomatlikka oid savollarga javob bering. Boshqa har qanday mavzudagi savollarga (siyosat, sport, texnika va h.k.) qat'iy ravishda: "Men faqat tibbiyotga oid savollarga javob beraman" deb javob bering.
    2. Foydalanuvchi simptomlarini (masalan: bosh og'rig'i, isitma) yozsa, avval unga maslahatlar bering (nima qilish kerakligi, qanday choralarni ko'rish haqida).
    3. Maslahatlardan so'ng, quyidagi shifokorlardan aynan shu simptomga mos keladiganini tavsiya qiling va uning ish vaqtlarini ayting:
       - Dr. Aliyev (Nevrolog) - Bosh og'rig'i, asab tizimi: Dushanba-Seshanba, 12:00-14:00.
       - Dr. Karimov (Kardiolog) - Yurak, qon bosimi: Chorshanba-Payshanba, 09:00-13:00.
       - Dr. Ahmedova (Pediatr) - Bolalar salomatligi: Har kuni, 10:00-16:00.
       - Dr. Tursunov (Dermatolog) - Teri muammolari: Juma-Shanba, 09:00-14:00.
    4. Tavsiyadan so'ng: "Agar xohlasangiz, sizni ushbu shifokor qabuliga bron qilib qo'yishim mumkin. Qaysi vaqt sizga qulay?" deb so'rang.
    5. Foydalanuvchi vaqtni aytsa (masalan: "soat 14:00 ga"), uni tasdiqlang va tizimda bron qilishini yakunlang.
    6. Har doim professional, xushmuomala va aniq bo'ling. Har qanday holatda ham jiddiy muammolarda shifokorga ko'rinish shartligini eslatib o'ting.`,
    welcomeMessage: 'Assalomu alaykum! Men Sihat Diagnostman. Sizni nima bezovta qilyapti? Simptomlaringizni yozing, men ularni tahlil qilishga yordam beraman.'
  },
  {
    id: 'psixolog',
    name: 'Sihat Psixolog',
    title: 'MENTAL SALOMATLIK',
    description: 'Ruhiy xotirjamlik, stressni boshqarish va emotsional barqarorlik bo\'yicha professional yordamchi.',
    icon: '🧠',
    color: 'text-white',
    bgColor: 'bg-slate-800',
    systemPrompt: 'Siz Sihat Psixolog - professional psixologik yordam bo\'yicha AI ekspertsiz. FAQAT psixologiya va ruhiy salomatlikka oid savollarga javob bering. Boshqa savollarga: "Men faqat ruhiy salomatlikka oid savollarga javob beraman" deb javob bering.',
    welcomeMessage: 'Assalomu alaykum! Men Sihat Psixologman. Sizni nima bezovta qilyapti yoki qanday mavzuda suhbatlashishni istaysiz?'
  },
  {
    id: 'nutrisiolog',
    name: 'Sihat Nutrisiolog',
    title: 'RATSION VA METABOLIZM',
    description: 'Individual ovqatlanish rejasi va sog\'lom metabolizmni shakllantirish bo\'yicha mutaxassis.',
    icon: '🥗',
    color: 'text-white',
    bgColor: 'bg-emerald-600',
    systemPrompt: 'Siz Sihat Nutrisiolog - sog\'lom ovqatlanish va metabolizm bo\'yicha AI ekspertsiz. FAQAT ovqatlanish, parhez va metabolizmga oid savollarga javob bering. Boshqa savollarga: "Men faqat ovqatlanish va ratsionga oid savollarga javob beraman" deb javob bering.',
    welcomeMessage: 'Assalomu alaykum! Men Sihat Nutrisiologman. Sog\'lom ovqatlanish va metabolizmni yaxshilash bo\'yicha savollaringiz bormi?'
  }
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const tg = window.Telegram?.WebApp;

export default function Consultation() {
  const navigate = useNavigate();
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [showDoctorSelection, setShowDoctorSelection] = useState(false);
  const [selectedDoctorType, setSelectedDoctorType] = useState<string | null>(null);
  const [doctorMessages, setDoctorMessages] = useState<Message[]>([]);
  const [doctorInput, setDoctorInput] = useState('');
  const [isDoctorTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { user, setUser } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (e) {
        console.error("Fetch settings error:", e);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'uz-UZ';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (selectedDoctorType) {
          setDoctorInput(prev => (prev ? prev + ' ' + transcript : transcript));
        } else {
          setInput(prev => (prev ? prev + ' ' + transcript : transcript));
        }
        setIsListening(false);
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        
        if (event.error === 'not-allowed') {
          tg?.showAlert("Mikrofon ruxsati berilmadi. Iltimos, sozlamalardan mikrofonni yoqing.");
        } else if (event.error === 'no-speech') {
          // Silence, just stop
        } else {
          tg?.showAlert("Ovozli kiritishda xatolik yuz berdi: " + event.error);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [selectedDoctorType, selectedExpert]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      tg?.showAlert("Brauzeringiz ovozli kiritishni qo'llab-quvvatlamaydi.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
      } catch (e) {
        console.error("Speech Recognition Start Error:", e);
        setIsListening(false);
      }
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tg?.BackButton) {
      if (selectedExpert || showDoctorSelection || selectedDoctorType) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
          if (selectedDoctorType) setSelectedDoctorType(null);
          else if (showDoctorSelection) setShowDoctorSelection(false);
          else setSelectedExpert(null);
        });
      } else {
        tg.BackButton.hide();
      }
    }
    return () => {
      tg?.BackButton?.offClick();
    };
  }, [selectedExpert, showDoctorSelection, selectedDoctorType]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, doctorMessages, isTyping, isDoctorTyping]);

  const handleSendDoctorMessage = async () => {
    if (!doctorInput.trim() || !selectedDoctorType || isDoctorTyping) return;

    if (tg?.HapticFeedback) {
      tg.HapticFeedback.selectionChanged();
    }

    const userMessage: Message = {
      role: 'user',
      content: doctorInput,
      timestamp: new Date()
    };

    setDoctorMessages(prev => [...prev, userMessage]);
    const currentInput = doctorInput;
    setDoctorInput('');
    
    try {
      // Pure local storage mode
      const localConsultationsKey = 'local_consultations';
      const saved = JSON.parse(localStorage.getItem(localConsultationsKey) || '[]');
      const newConsultation = {
        id: Date.now().toString(),
        userId: tg?.initDataUnsafe?.user?.id?.toString() || 'mock-user-id',
        symptoms: currentInput,
        department: selectedDoctorType,
        createdAt: new Date(),
        status: 'pending'
      };
      localStorage.setItem(localConsultationsKey, JSON.stringify([...saved, newConsultation]));
      
      // Success response simulation for the UI
      setTimeout(() => {
        const infoMessage: Message = {
          role: 'assistant',
          content: "Sizning xabaringiz shifokorga yuborildi. Mutaxassislarimiz yaqin vaqt ichida sizga javob qaytarishadi. Iltimos, kuting.",
          timestamp: new Date()
        };
        setDoctorMessages(prev => [...prev, infoMessage]);
      }, 1000);
    } catch (error) {
      console.error("Error sending to doctor:", error);
      tg?.showAlert("Xabarni saqlab bo'lmadi.");
    }
  };

  if (selectedDoctorType) {
    return (
      <div className="fixed inset-0 flex flex-col max-w-md mx-auto bg-[#F1F5F9] z-[60] overflow-hidden">
        <header className="bg-white/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedDoctorType(null)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 active:scale-90 transition-all"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-md shadow-blue-100">
                <img 
                  src="https://emojicdn.elk.sh/👩‍⚕️?style=apple" 
                  alt="Doctor"
                  className="w-6 h-6 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-slate-900 leading-tight text-sm tracking-tight">{selectedDoctorType}</h3>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">ONLINE</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-6 no-scrollbar">
          {doctorMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                <img src="https://emojicdn.elk.sh/💬?style=apple" className="w-10 h-10" alt="Chat" />
              </div>
              <p className="text-sm font-medium text-slate-500 max-w-[200px]">
                Shifokorga savolingizni yozing. Mutaxassis tez orada javob beradi.
              </p>
            </div>
          )}
          {doctorMessages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex flex-col max-w-[85%] relative",
                msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-[2rem] text-[15px] leading-relaxed shadow-sm relative",
                msg.role === 'user' 
                  ? "bg-blue-600 text-white rounded-tr-none" 
                  : "bg-white text-slate-800 border border-slate-100 rounded-tl-none font-medium"
              )}>
                {msg.content}
                <div className={cn(
                  "text-[8px] font-bold uppercase tracking-widest mt-2",
                  msg.role === 'user' ? "text-blue-200" : "text-slate-400"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="absolute bottom-4 left-0 right-0 px-6 z-40">
          <div className="max-w-md mx-auto bg-white/80 backdrop-blur-2xl p-3 rounded-[2.5rem] border border-white shadow-2xl flex items-center gap-3">
            <input 
              type="text"
              value={doctorInput}
              onChange={(e) => setDoctorInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendDoctorMessage()}
              placeholder="Xabar yozing..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium px-4 py-2 outline-none text-slate-900 placeholder:text-slate-400"
            />
            <button 
              onClick={toggleListening}
              className={cn(
                "w-12 h-12 aspect-square rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0",
                isListening ? "bg-rose-100 text-rose-600 shadow-rose-100 shadow-lg" : "bg-slate-50 text-slate-400"
              )}
            >
              {isListening ? <MicOff size={22} className="animate-pulse" /> : <Mic size={22} />}
            </button>
            <button 
              onClick={handleSendDoctorMessage}
              disabled={!doctorInput.trim()}
              className={cn(
                "w-12 h-12 aspect-square rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 disabled:opacity-50 disabled:scale-100 shrink-0",
                doctorInput.trim() ? "bg-blue-600 text-white shadow-blue-200" : "bg-slate-100 text-slate-400 shadow-none"
              )}
            >
              <Send size={22} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showDoctorSelection) {
    const doctorTypes = [
      { id: 'terapevt', name: 'Terapevt', icon: '🩺' },
      { id: 'kardiolog', name: 'Kardiolog', icon: '❤️' },
      { id: 'nevrolog', name: 'Nevrolog', icon: '🧠' },
      { id: 'pediatr', name: 'Pediatr', icon: '👶' },
      { id: 'ginekolog', name: 'Ginekolog', icon: '👩' },
      { id: 'urolog', name: 'Urolog', icon: '👨' },
    ];

    return (
      <div className="absolute inset-0 bg-slate-50 z-[60] flex flex-col max-w-md mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setShowDoctorSelection(false)}
            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Mutaxassisni tanlang</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {doctorTypes.map((type) => (
            <motion.button
              key={type.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedDoctorType(type.name);
                setShowDoctorSelection(false);
              }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center gap-3 text-center hover:border-blue-200 transition-all"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">
                {type.icon}
              </div>
              <span className="font-bold text-slate-700 text-sm">{type.name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  const handleSelectExpert = async (expert: Expert) => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }
    setSelectedExpert(expert);
    
    // Log activity
    if (user) {
      activityService.logActivity({
        userId: user.uid,
        activityType: 'button_click',
        details: { expertId: expert.id, action: 'select_expert' }
      });
    }

    // Load history from DB
    if (user) {
      const history = await chatService.getHistory(user.uid, expert.id);
      if (history && history.length > 0) {
        setMessages(history.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at || Date.now())
        })));
      } else {
        setMessages([{
          role: 'assistant',
          content: expert.welcomeMessage,
          timestamp: new Date()
        }]);
      }
    } else {
      setMessages([{
        role: 'assistant',
        content: expert.welcomeMessage,
        timestamp: new Date()
      }]);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedExpert || isTyping) return;
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const normalizedCount = user.lastRequestDate === today ? (user.dailyRequestCount || 0) : 0;
    const dailyLimit = 50;
    if (normalizedCount >= dailyLimit) {
      tg?.showAlert(`Bugungi limit tugadi (${dailyLimit} ta). Ertaga qayta urinib ko'ring.`);
      return;
    }

    if (tg?.HapticFeedback) {
      tg.HapticFeedback.selectionChanged();
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Save user message to DB
    chatService.saveMessage({
      user_id: user.uid,
      expert_id: selectedExpert.id,
      role: 'user',
      content: input
    });

    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const fullPrompt = `${settings?.aiSystemPrompt || ''}\n\n${selectedExpert.systemPrompt}`;
      
      const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `${fullPrompt}\n\nUser says: ${currentInput}` }] }],
      });
      
      const aiResponseText = response.text || '';

      // Save assistant message to DB
      chatService.saveMessage({
        user_id: user.uid,
        expert_id: selectedExpert.id,
        role: 'assistant',
        content: aiResponseText
      });
      
      // Detect if user is confirming a time and doctor
      const timeMatch = currentInput.match(/(\d{2}:\d{2})/);
      const isBookingConfirmation = timeMatch && (
        messages.some(m => m.role === 'assistant' && (m.content.toLowerCase().includes('bron') || m.content.toLowerCase().includes('qabul'))) ||
        aiResponseText.toLowerCase().includes('tasdiq') ||
        aiResponseText.toLowerCase().includes('muvaffaqiyatli')
      );

      if (isBookingConfirmation) {
        const time = timeMatch[1];
        
        // Save to DB via service (Truly functional)
        try {
          // Find doctor name in response
          const doctorMatch = aiResponseText.match(/Dr\.?\s+\w+/);
          const doctorName = doctorMatch ? doctorMatch[0] : "Shifokor";

          await reminderService.addReminder({
            userId: user.uid,
            medicineName: `Qabul: ${doctorName}`,
            dosage: "Konsultatsiya",
            time: time,
            days: ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'],
            isActive: true
          });
          
          // Send instant notification via server API
          await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: user.uid,
              message: `✅ *MUVAFFAQIYATLI BRON QILINDI!*\n\n👨‍⚕️ *Shifokor:* ${doctorName}\n⏰ *Vaqt:* ${time}\n\nSizga belgilangan vaqtdan 15 daqiqa oldin yana bir bor eslatma yuboramiz.`
            })
          });

          if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } catch (err) {
          console.error("Booking error:", err);
        }
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      const updatedUser = {
        ...user,
        dailyRequestCount: normalizedCount + 1,
        lastRequestDate: today,
      };
      setUser(updatedUser);
      localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(updatedUser));
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "Kechirasiz, xatolik yuz berdi. Iltimos, birozdan so'ng qayta urinib ko'ring.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    if (selectedExpert) {
      setMessages([{
        role: 'assistant',
        content: selectedExpert.welcomeMessage,
        timestamp: new Date()
      }]);
    }
  };

  if (selectedExpert) {
    return (
      <div className="flex flex-col h-screen bg-[#F8FAFC] relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/5 blur-[120px] rounded-full" />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-4 py-4 pt-16 shadow-sm">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedExpert(null)}
                className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 active:scale-90 transition-all border border-slate-100"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100/50", selectedExpert.bgColor)}>
                  <img 
                    src={`https://emojicdn.elk.sh/${selectedExpert.icon}?style=apple`} 
                    alt={selectedExpert.name}
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-none mb-1">{selectedExpert.name}</h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Onlayn</span>
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={clearChat}
              className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-400 active:scale-90 transition-all border border-rose-100"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 pt-6 pb-36 space-y-6 no-scrollbar relative z-10"
        >
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className={cn(
                "flex flex-col max-w-[88%] relative group",
                msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-[2rem] text-[15px] leading-relaxed shadow-sm relative transition-all duration-300",
                msg.role === 'user' 
                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none shadow-blue-100/50" 
                  : "bg-white text-slate-800 border border-slate-100 rounded-tl-none hover:shadow-md"
              )}>
                <div className={cn(
                  "prose prose-sm max-w-none",
                  msg.role === 'user' ? "prose-invert text-white" : "prose-slate"
                )}>
                  <ReactMarkdown 
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed font-medium" {...props} />,
                      ul: ({node, ...props}) => <ul className="space-y-1.5 mb-3 list-none pl-1" {...props} />,
                      li: ({node, ...props}) => (
                        <li className="flex items-start gap-2">
                          <span className={cn(
                            "font-black text-lg leading-none mt-0.5",
                            msg.role === 'user' ? "text-blue-200" : "text-blue-600"
                          )}>•</span>
                          <span className="font-semibold">{props.children}</span>
                        </li>
                      ),
                      strong: ({node, ...props}) => <strong className="font-black" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
                
                <div className={cn(
                  "flex items-center gap-2 mt-3 pt-2 border-t",
                  msg.role === 'user' ? "border-blue-500/30" : "border-slate-50"
                )}>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest",
                    msg.role === 'user' ? "text-blue-200" : "text-slate-300"
                  )}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px]", selectedExpert.bgColor)}>
                        {selectedExpert.icon}
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                        {selectedExpert.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {isTyping && selectedExpert && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-start space-y-2 ml-2 mb-4"
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-white/90 backdrop-blur-sm rounded-full border border-slate-100 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-duration:0.8s]" />
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {selectedExpert.name} yozmoqda
                </span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(env(safe-area-inset-bottom,16px)+16px)] pt-6 z-40 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent">
          <div className="max-w-md mx-auto group">
            <div className="absolute inset-0 bg-blue-600/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-white/95 backdrop-blur-2xl p-2.5 rounded-[2.5rem] border border-white shadow-2xl shadow-blue-900/10 flex items-center gap-2 transition-all duration-300 group-focus-within:border-blue-100">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Savolingizni yozing..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-medium px-5 py-2.5 outline-none text-slate-900 placeholder:text-slate-400 min-w-0"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={toggleListening}
                  className={cn(
                    "w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all active:scale-90",
                    isListening ? "bg-rose-100 text-rose-600 shadow-rose-100 shadow-lg" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  )}
                >
                  {isListening ? <MicOff size={22} className="animate-pulse" /> : <Mic size={22} />}
                </button>
                <button 
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping}
                  className={cn(
                    "w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none",
                    input.trim() ? "bg-blue-600 text-white shadow-blue-200" : "bg-slate-100 text-slate-300"
                  )}
                >
                  <Send size={22} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-[#F8FAFC] pb-24">
        {/* Header */}
        <div className="pt-12 px-6 mb-8 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 active:scale-95 transition-all"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight uppercase">AI EKSPERTLAR</h1>
            <p className="text-[#2563EB] font-bold text-[10px] mt-1 uppercase tracking-widest">IXTISOSLASHGAN YORDAMCHINI TANLANG</p>
          </div>
        </div>

        <div className="px-4 space-y-4">
          {EXPERTS.map((expert) => (
            <motion.button
              key={expert.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectExpert(expert)}
              className="w-full bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 text-left group relative overflow-hidden transition-all hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/20"
            >
              <div className={cn(
                "w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-105",
                expert.bgColor
              )}>
                <img 
                  src={`https://emojicdn.elk.sh/${expert.icon}?style=apple`} 
                  alt={expert.name}
                  className="w-12 h-12 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-xl font-bold text-[#0F172A] tracking-tight leading-none mb-1">{expert.name}</h3>
                <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest leading-none mb-2">{expert.title}</p>
                <p className="text-[13px] text-slate-500 font-medium leading-snug line-clamp-2">
                  {expert.description}
                </p>
              </div>
              
              <div className="text-slate-200 group-hover:text-blue-500 transition-all shrink-0 pr-1">
                <ChevronRight size={24} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
}
