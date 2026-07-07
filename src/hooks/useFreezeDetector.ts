/**
 * Freeze Detector Hook
 *
 * Monitors for UI freeze conditions where:
 * - The game loop is still running (ticks continue)
 * - But user input stops being processed
 *
 * Logs diagnostic info to console when freeze is detected.
 */

import { useEffect, useRef } from 'react';

const FREEZE_THRESHOLD_MS = 3000; // Consider frozen if no clicks for 3s after clicking

interface FreezeState {
  lastClickTime: number;
  lastClickProcessed: boolean;
  clickCount: number;
  processedCount: number;
}

const globalState: FreezeState = {
  lastClickTime: 0,
  lastClickProcessed: true,
  clickCount: 0,
  processedCount: 0,
};

// Track all click events at document level
function handleDocumentClick(e: MouseEvent) {
  globalState.lastClickTime = Date.now();
  globalState.lastClickProcessed = false;
  globalState.clickCount++;

  // Log click target for debugging
  const target = e.target as HTMLElement;
  console.log('[FreezeDetector] Click detected:', {
    target: target.tagName,
    className: target.className?.slice?.(0, 50),
    id: target.id,
    clickCount: globalState.clickCount,
  });
}

// Call this from any click handler to mark click as processed
export function markClickProcessed() {
  globalState.lastClickProcessed = true;
  globalState.processedCount++;
}

export function useFreezeDetector() {
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Add document-level click listener
    document.addEventListener('click', handleDocumentClick, true);

    // Periodically check for freeze condition
    checkIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastClick = now - globalState.lastClickTime;

      // If we had a click that wasn't processed within threshold
      if (
        globalState.lastClickTime > 0 &&
        !globalState.lastClickProcessed &&
        timeSinceLastClick > FREEZE_THRESHOLD_MS
      ) {
        console.error('[FreezeDetector] POTENTIAL FREEZE DETECTED!', {
          timeSinceLastClick,
          clickCount: globalState.clickCount,
          processedCount: globalState.processedCount,
          unprocessedClicks: globalState.clickCount - globalState.processedCount,
        });

        // Dump diagnostic info
        dumpDiagnostics();

        // Reset to avoid spam
        globalState.lastClickProcessed = true;
      }
    }, 1000);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);
}

function dumpDiagnostics() {
  // Check for elements that might be blocking clicks
  const fixedElements = document.querySelectorAll('[style*="position: fixed"], .fixed');
  const potentialBlockers: string[] = [];

  fixedElements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const styles = window.getComputedStyle(el);
    const pointerEvents = styles.pointerEvents;
    const zIndex = styles.zIndex;
    const opacity = styles.opacity;

    // Check if element covers significant area and could block clicks
    if (
      rect.width > 100 &&
      rect.height > 100 &&
      pointerEvents !== 'none' &&
      opacity !== '0'
    ) {
      potentialBlockers.push(
        `${el.tagName}.${el.className?.slice?.(0, 30)} z:${zIndex} ptr:${pointerEvents}`
      );
    }
  });

  console.log('[FreezeDetector] Fixed elements that could block:', potentialBlockers);

  // Check active element
  console.log('[FreezeDetector] Active element:', document.activeElement?.tagName, document.activeElement?.className);

  // Check for any modals/dialogs
  const dialogs = document.querySelectorAll('[role="dialog"]');
  console.log('[FreezeDetector] Open dialogs:', dialogs.length);

  // Check event listeners on document
  // Note: Can't enumerate listeners directly, but we can check some patterns

  // Log scroll position (sometimes scroll lock can affect interaction)
  console.log('[FreezeDetector] Scroll position:', {
    x: window.scrollX,
    y: window.scrollY,
    overflow: document.body.style.overflow,
  });
}

// Expose for console debugging
if (typeof window !== 'undefined') {
  (window as unknown as { __freezeDetector: FreezeState }).__freezeDetector = globalState;
}
