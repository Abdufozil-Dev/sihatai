import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Trash2, Send, Sparkles, Stethoscope, Brain, Salad, User, Mic, MicOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { GoogleGenAI } from '@google/genai';

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
    systemPrompt: 'Siz Sihat Diagnost - professional tibbiy diagnostika bo\'yicha AI ekspertsiz. Foydalanuvchi simptomlarini tahlil qiling va ehtimoliy sabablarni ayting. Har doim shifokorga murojaat qilishni tavsiya eting.',
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
    systemPrompt: 'Siz Sihat Psixolog - professional psixologik yordam bo\'yicha AI ekspertsiz. Foydalanuvchiga ruhiy xotirjamlik, stressni boshqarish va emotsional barqarorlik bo\'yicha yordam bering.',
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
    systemPrompt: 'Siz Sihat Nutrisiolog - sog\'lom ovqatlanish va metabolizm bo\'yicha AI ekspertsiz. Foydalanuvchiga individual ovqatlanish rejasi va sog\'lom turmush tarzi bo\'yicha maslahatlar bering.',
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
    const savedSettings = localStorage.getItem('admin_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
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

        <div className="fixed bottom-4 left-0 right-0 px-6 z-40">
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
      <div className="fixed inset-0 bg-slate-50 z-[60] flex flex-col max-w-md mx-auto p-6">
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

  const handleSelectExpert = (expert: Expert) => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }
    setSelectedExpert(expert);
    setMessages([{
      role: 'assistant',
      content: expert.welcomeMessage,
      timestamp: new Date()
    }]);
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
    setInput('');
    setIsTyping(true);

    try {
      const fullPrompt = `${settings?.aiSystemPrompt || ''}\n\n${selectedExpert.systemPrompt}`;
      
      const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `${fullPrompt}\n\nUser says: ${input}` }] }],
      });
      
      const aiResponseText = response.text || '';
      
      // Detect if user is confirming a time
      const timeMatch = input.match(/(\d{2}:\d{2})/);
      if (timeMatch && messages.some(m => m.role === 'assistant' && m.content.toLowerCase().includes('bron'))) {
        const time = timeMatch[1];
        const reminder: Reminder = {
          id: Date.now().toString(),
          userId: tg?.initDataUnsafe?.user?.id?.toString() || 'demo',
          title: `Shifokor qabuli (${time})`,
          time: time,
          days: ['Dushanba'], // Default or derived
          isActive: true
        };
        const savedReminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        localStorage.setItem('reminders', JSON.stringify([...savedReminders, reminder]));
        
        // Simulate SMS
        setTimeout(() => {
          if (tg?.showConfirm) {
            tg.showConfirm(`SMS yuborildi: Sizning qabulingiz ${time} ga muvaffaqiyatli belgilandi.`);
          } else {
            alert(`SMS yuborildi: Sizning qabulingiz ${time} ga muvaffaqiyatli belgilandi.`);
          }
        }, 1500);
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
      <div className="fixed inset-0 flex flex-col max-w-md mx-auto bg-[#F1F5F9] z-[60] overflow-hidden">
        {/* Chat Header */}
        <header className="bg-white/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10 shadow-sm pt-[calc(env(safe-area-inset-top,44px)+10px)]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedExpert(null)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 active:scale-90 transition-all"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-md", selectedExpert.bgColor)}>
                <img 
                  src={`https://emojicdn.elk.sh/${selectedExpert.icon}?style=apple`} 
                  alt={selectedExpert.name}
                  className="w-6 h-6 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-slate-900 leading-tight text-sm tracking-tight">{selectedExpert.name}</h3>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">ONLAYN</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={clearChat}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-rose-500 transition-all active:scale-90"
          >
            <Trash2 size={18} />
          </button>
        </header>

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-6 no-scrollbar"
        >
          {messages.map((msg, idx) => (
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
                  : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
              )}>
                <div className="prose prose-sm max-w-none prose-slate">
                  <ReactMarkdown 
                    components={{
                      p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed font-medium" {...props} />,
                      ul: ({node, ...props}) => <ul className="space-y-1.5 mb-4 list-none" {...props} />,
                      li: ({node, ...props}) => (
                        <li className="flex items-start gap-2 font-semibold text-slate-700">
                          <span className="text-blue-600 font-black text-base">•</span>
                          <span>{props.children}</span>
                        </li>
                      ),
                      em: ({node, ...props}) => <em className="text-slate-400 italic block mt-3 text-[10px] font-bold uppercase tracking-tight" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-black text-slate-900" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
                
                {msg.role === 'assistant' && (
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px]", selectedExpert.bgColor)}>
                        {selectedExpert.icon}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        {selectedExpert.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-[8px] font-bold uppercase tracking-widest text-slate-300">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    </div>
                  </div>
                )}

                {msg.role === 'user' && (
                  <div className="text-[8px] font-bold uppercase tracking-widest mt-2 text-blue-200">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex gap-1.5 p-4 bg-white rounded-2xl border border-slate-100 w-20 items-center justify-center shadow-sm rounded-tl-none">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="fixed bottom-4 left-0 right-0 px-6 z-40">
          <div className="max-w-md mx-auto bg-white/80 backdrop-blur-2xl p-3 rounded-[2.5rem] border border-white shadow-2xl flex items-center gap-3">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Savolingizni yozing..."
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
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              className={cn(
                "w-12 h-12 aspect-square rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 disabled:opacity-50 disabled:scale-100 shrink-0",
                input.trim() ? "bg-blue-600 text-white shadow-blue-200" : "bg-slate-100 text-slate-400 shadow-none"
              )}
            >
              <Send size={22} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32">
      {/* Header */}
      <div className="pt-12 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-slate-400 active:scale-95 transition-all"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] tracking-tight">EKSPERTLAR</h1>
          <p className="text-[#2563EB] font-bold text-[10px] mt-1 uppercase tracking-widest">YORDAMCHINI TANLANG</p>
        </div>
      </div>

      {/* Experts List */}
      <div className="space-y-4">
        {EXPERTS.map((expert) => (
          <motion.button
            key={expert.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelectExpert(expert)}
            className="w-full bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 text-left group relative overflow-hidden transition-all hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/30"
          >
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50/50 rounded-full -mr-8 -mt-8 opacity-40 group-hover:bg-blue-50/50 transition-colors" />
            
            <div className={cn(
              "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-md relative z-10 transition-transform group-hover:scale-105 shrink-0",
              expert.bgColor
            )}>
              <img 
                src={`https://emojicdn.elk.sh/${expert.icon}?style=apple`} 
                alt={expert.name}
                className="w-10 h-10 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="flex-1 relative z-10 space-y-1">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] tracking-tight leading-none mb-1.5">{expert.name}</h3>
                <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest leading-none">{expert.title}</p>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 pr-6">
                {expert.description}
              </p>
            </div>
            
            <div className="text-slate-200 group-hover:text-blue-500 transition-all group-hover:translate-x-1 shrink-0 pr-1">
              <ChevronRight size={20} />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
