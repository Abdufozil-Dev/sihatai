import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }[];
}

export default function CustomModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  children,
  actions 
}: CustomModalProps) {
  const isKeyboardVisible = useKeyboardHeight();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const firstInput = modalRef.current?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
        if (firstInput) {
          firstInput.focus();
          firstInput.click();
        }
      }, 300); // Modals need a bit more time for animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[101] pointer-events-none">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden pointer-events-auto keyboard-safe-transition"
              style={{ transform: isKeyboardVisible ? 'translateY(-100px)' : 'translateY(0px)' }}
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  {title && (
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight uppercase">
                      {title}
                    </h3>
                  )}
                  <button 
                    onClick={onClose}
                    className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {message && (
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    {message}
                  </p>
                )}

                {children}

                {actions && actions.length > 0 && (
                  <div className="flex flex-col gap-3 pt-2">
                    {actions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          action.onClick();
                          onClose();
                        }}
                        className={cn(
                          "w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95",
                          action.variant === 'danger' 
                            ? "bg-rose-50 text-rose-600 border border-rose-100" 
                            : action.variant === 'secondary'
                            ? "bg-slate-50 text-slate-500 border border-slate-100"
                            : "bg-blue-600 text-white shadow-lg shadow-blue-200"
                        )}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
