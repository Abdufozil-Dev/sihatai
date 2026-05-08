import { useState, useEffect } from 'react';

const tg = window.Telegram?.WebApp;

/**
 * Telegram Mini App Native Keyboard Detection
 * Uses Telegram's viewportHeight and viewportStableHeight for maximum accuracy and smoothness.
 */
export function useKeyboardHeight() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!tg) return;

    const handleViewportChanged = () => {
      // In TMA, when keyboard opens, viewportHeight becomes significantly smaller 
      // than the viewportStableHeight (the height without keyboard).
      const currentHeight = tg.viewportHeight;
      const stableHeight = tg.viewportStableHeight;
      
      // If height difference is more than 120px, keyboard is definitely open
      const isShowing = currentHeight < stableHeight - 120;
      setIsKeyboardVisible(isShowing);
    };

    // We don't check for isStateStable here because we want real-time reaction
    tg.onEvent('viewportChanged', handleViewportChanged);
    
    // Initial check
    handleViewportChanged();

    return () => {
      tg.offEvent('viewportChanged', handleViewportChanged);
    };
  }, []);

  return isKeyboardVisible;
}
