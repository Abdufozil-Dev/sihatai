import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Reminder } from './types';
import { Home, User as UserIcon, Briefcase, Pill, Sparkles, Ban } from 'lucide-react';
import { cn, isPlaceholderName } from './lib/utils';
import { userService } from './services/userService';
import { AuthProvider, useAuth } from './context/AuthContext';
import AnnouncementBanner from './components/AnnouncementBanner';

// Pages
import HomePage from './pages/Home';
import ProfilePage from './pages/Profile';
import ClinicsPage from './pages/Clinics';
import RemindersPage from './pages/Reminders';
import AdminPage from './pages/Admin';
import ConsultationPage from './pages/Consultation';
import RegistrationPage from './pages/Registration';

declare global {
  interface Window {
    Telegram: any;
  }
}

const tg = window.Telegram?.WebApp;
const adminIdsFromEnv = String((import.meta as any).env?.VITE_ADMIN_IDS || '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);
const ADMIN_IDS = new Set(['6413273899', '7820708813', ...adminIdsFromEnv]);

const isRegistrationComplete = (user: User | null) => {
  if (!user) return false;
  const displayName = (user.displayName || '').trim().toLowerCase();
  const age = Number(user.age);
  const weight = Number(user.weight);
  const height = Number(user.height);
  const hasName = !!displayName && !isPlaceholderName(displayName);
  const hasGender = !!user.gender;
  return hasName && Number.isFinite(age) && age > 0 && Number.isFinite(weight) && weight > 0 && Number.isFinite(height) && height > 0;
};

const ReminderChecker = () => {
  const { user } = useAuth();
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      const now = new Date();
      const currentHourMin = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      if (currentHourMin === lastCheck) return;
      setLastCheck(currentHourMin);

      const savedReminders: Reminder[] = JSON.parse(localStorage.getItem('reminders') || '[]');
      
      for (const reminder of savedReminders) {
        if (!reminder.isActive) continue;

        // Calculate time difference
        const [remHour, remMin] = reminder.time.split(':').map(Number);
        const reminderDate = new Date();
        reminderDate.setHours(remHour, remMin, 0, 0);

        const diffMs = reminderDate.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 60000);

        // Notify 30 minutes before
        if (diffMins === 30) {
          const message = `🔔 <b>Eslatma:</b> 30 daqiqadan so'ng sizda tadbir bor: <i>${reminder.title}</i>\n\nIltimos, tayyor bo'ling!`;
          
          // Show in Mini App
          if (tg?.showPopup) {
            tg.showPopup({
              title: 'Eslatma',
              message: `${reminder.title} ga 30 daqiqa qoldi!`,
              buttons: [{ type: 'ok' }]
            });
          }

          // Send to Telegram Bot
          fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: user.telegramId, message }),
          });
        }
      }
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user, lastCheck]);

  return null;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = () => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light');
    }
  };

  // Bottom Nav items
  const navItems = [
    { path: '/', icon: Home, label: 'ASOSIY' },
    { path: '/clinics', icon: Briefcase, label: 'KLINIKA' },
    { path: '/consult', icon: Sparkles, label: 'SALOMATLIK MARKAZI', isCenter: true },
    { path: '/reminders', icon: Pill, label: 'ESLATMA' },
    { path: '/profile', icon: UserIcon, label: 'PROFIL' },
  ];

  // Hide bottom nav on registration flow
  const showNav = location.pathname !== '/register';

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center overflow-x-hidden">
      <div className="w-full max-w-md bg-[#F8FAFC] min-h-screen flex flex-col relative shadow-2xl">
        <ReminderChecker />
        {/* Main Content */}
        <main className={cn("flex-1 w-full px-4 pt-12", showNav ? "pb-40" : "pb-12")}>
          {children}
        </main>

        {/* Bottom Nav */}
        {showNav && (
          <nav className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="px-6 h-24 flex items-center justify-between relative">
              {navItems.map((item) => (
                item.isCenter ? (
                  <div key={item.path} className="relative -top-6 flex flex-col items-center">
                    <Link
                      to={item.path}
                      onClick={handleNavClick}
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all border-4 border-white group",
                        location.pathname === item.path 
                          ? "bg-blue-600 text-white scale-105 shadow-blue-200" 
                          : "bg-blue-500 text-white hover:scale-105 shadow-blue-100"
                      )}
                    >
                      <item.icon size={28} className="group-active:scale-90 transition-transform" />
                    </Link>
                    <span className={cn(
                      "text-[8px] font-black mt-2 text-center w-20 leading-tight uppercase tracking-wider",
                      location.pathname === item.path ? "text-blue-600" : "text-slate-400"
                    )}>
                      {item.label}
                    </span>
                  </div>
                ) : (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleNavClick}
                      className={cn(
                        "flex flex-col items-center gap-2 transition-all flex-1 py-3 rounded-2xl group",
                        location.pathname === item.path ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all group-active:scale-90",
                        location.pathname === item.path ? "bg-blue-50" : "bg-transparent"
                      )}>
                        <item.icon size={22} strokeWidth={location.pathname === item.path ? 3 : 2} />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                    </Link>
                )
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In production, log to an error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
            <Ban size={40} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2 uppercase">Xatolik yuz berdi</h1>
          <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
            Ilova ishida kutilmagan xatolik yuz berdi. Iltimos, sahifani yangilang.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs tracking-widest uppercase shadow-lg shadow-blue-100"
          >
            Yangilash
          </button>
          <pre className="mt-8 p-4 bg-slate-50 rounded-lg text-[10px] text-left overflow-auto max-w-full text-rose-600 border border-rose-100">
            {this.state.error?.message}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const { user, setUser, loading, setLoading } = useAuth();

  useEffect(() => {
    // Initialize Telegram WebApp
    if (tg) {
      tg.ready();
      if (tg.expand) tg.expand();
      // Try to request full screen if supported (newer Telegram versions)
      if (tg.requestFullscreen) {
        tg.requestFullscreen();
      }
      if (tg.setHeaderColor) tg.setHeaderColor('#ffffff');
    }

    // Get user from Telegram
    const tgUser = tg?.initDataUnsafe?.user;
    
    let effectiveTgUser = tgUser;
    if (!tgUser && tg?.initData) {
      try {
        const params = new URLSearchParams(tg.initData);
        const userStr = params.get('user');
        if (userStr) effectiveTgUser = JSON.parse(userStr);
      } catch (e) {
        // Silent fail for initData parsing
      }
    }
    
    const syncUserStatus = async () => {
      const tgUserId = effectiveTgUser?.id?.toString();
      if (!tgUserId) {
        setLoading(false);
        return;
      }
      
      const fallbackDisplayName = effectiveTgUser
        ? `${effectiveTgUser.first_name || ''} ${effectiveTgUser.last_name || ''}`.trim() || effectiveTgUser.username || 'Foydalanuvchi'
        : 'Mehmon';
      
      try {
        // Fetch profile from our local API
        let profile = await userService.getProfile(tgUserId);
        
        if (!profile) {
          profile = {
            uid: tgUserId,
            displayName: fallbackDisplayName,
            username: effectiveTgUser?.username || null,
            email: effectiveTgUser?.username ? `${effectiveTgUser.username}@telegram.com` : null,
            photoURL: effectiveTgUser?.photo_url || '',
            createdAt: Date.now(),
          };
          await userService.updateProfile(tgUserId, profile);
        }
        
        // Map to internal User type
        const userData: User = {
          ...profile,
          telegramId: tgUserId,
          username: (profile as any).username || effectiveTgUser?.username || undefined,
          displayName: !isPlaceholderName(profile.displayName)
            ? profile.displayName!
            : fallbackDisplayName,
          role: ADMIN_IDS.has(tgUserId) ? 'admin' : 'user',
          dailyRequestCount: (profile as any).dailyRequestCount || 0,
          lastRequestDate: (profile as any).lastRequestDate || new Date().toISOString().split('T')[0],
          isBlocked: (profile as any).isBlocked || false,
          createdAt: new Date(profile.createdAt),
          gender: profile.gender || '',
          age: profile.age || 0,
          weight: profile.weight || 0,
          height: profile.height || 0,
        };

        setUser(userData);
        localStorage.setItem(`user_profile_${tgUserId}`, JSON.stringify(userData));
      } catch (err) {
        // Keep app usable even if profile backend is temporarily unavailable.
        const fallbackUser: User = {
          uid: tgUserId,
          telegramId: tgUserId,
          displayName: fallbackDisplayName,
          username: effectiveTgUser?.username || undefined,
          photoURL: effectiveTgUser?.photo_url || '',
          role: ADMIN_IDS.has(tgUserId) ? 'admin' : 'user',
          dailyRequestCount: 0,
          lastRequestDate: new Date().toISOString().split('T')[0],
          isBlocked: false,
          createdAt: new Date(),
        };
        setUser(fallbackUser);
        localStorage.setItem(`user_profile_${tgUserId}`, JSON.stringify(fallbackUser));
      } finally {
        setLoading(false);
      }
    };

    syncUserStatus();

    // Ensure hash is set for HashRouter
    if (!window.location.hash) {
      window.location.hash = '#/';
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (user?.isBlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center">
        <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-rose-100">
          <Ban size={48} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight">KIRISH TAQIQLANGAN</h1>
        <p className="text-slate-500 font-medium leading-relaxed mb-8">
          Sizning hisobingiz administrator tomonidan bloklangan. Iltimos, qo'llab-quvvatlash xizmati bilan bog'laning.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold text-sm tracking-widest uppercase"
        >
          QAYTA URINISH
        </button>
      </div>
    );
  }

  const needsRegistration = !isRegistrationComplete(user);

  return (
    <ErrorBoundary>
      <HashRouter>
        <AnnouncementBanner />
        <Layout>
          <Routes>
            <Route path="/" element={needsRegistration ? <Navigate to="/register" replace /> : <HomePage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/consult" element={needsRegistration ? <Navigate to="/register" replace /> : <ConsultationPage />} />
            <Route path="/profile" element={needsRegistration ? <Navigate to="/register" replace /> : <ProfilePage />} />
            <Route path="/clinics" element={needsRegistration ? <Navigate to="/register" replace /> : <ClinicsPage />} />
            <Route path="/reminders" element={needsRegistration ? <Navigate to="/register" replace /> : <RemindersPage />} />
            <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </ErrorBoundary>
  );
}
