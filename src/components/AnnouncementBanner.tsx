import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, X } from 'lucide-react';

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const checkAnnouncement = () => {
      try {
        const saved = localStorage.getItem('admin_broadcast');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.text) {
            setAnnouncement(data.text);
            setIsVisible(true);
          } else {
            setAnnouncement(null);
          }
        }
      } catch (e) {
        console.error("Error reading announcement:", e);
      }
    };

    checkAnnouncement();
    
    // Listen for local changes
    window.addEventListener('storage', checkAnnouncement);
    return () => window.removeEventListener('storage', checkAnnouncement);
  }, []);

  if (!announcement || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-4 right-4 z-[100] max-w-md mx-auto"
      >
        <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-2xl shadow-blue-200 flex items-center gap-4 border border-blue-500/50 backdrop-blur-md">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Megaphone size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] opacity-80 mb-0.5">E'lon</p>
            <p className="text-xs font-semibold leading-relaxed">{announcement}</p>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
