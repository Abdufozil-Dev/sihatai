import { useState, useEffect } from 'react';

const tg = window.Telegram?.WebApp;

/**
 * Telegram Mini App native viewport detection.
 * visualViewport causes bounces in TMA, so we use Telegram's internal height tracking.
 */
export function useKeyboardHeight() {
  const [isExpanded, setIsExpanded] = useState(tg?.isExpanded || false);

  useEffect(() => {
    if (!tg) return;

    const handleViewportChanged = (eventData: { isStateStable: boolean }) => {
      // Telegram triggers viewportChanged when keyboard opens/closes
      // We check the stable state to update our layout
      if (eventData.isStateStable) {
        setIsExpanded(tg.isExpanded);
      }
    };

    tg.onEvent('viewportChanged', handleViewportChanged);
    return () => {
      tg.offEvent('viewportChanged', handleViewportChanged);
    };
  }, []);

  // Return a boolean or a relative value since TMA handles the actual height
  return !isExpanded;
}
