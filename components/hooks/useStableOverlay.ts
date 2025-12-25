import { useEffect, useRef, useState } from "react";

export function useStableOverlay(
  active: boolean,
  hideDelayMs = 200
): boolean {
  const [visible, setVisible] = useState<boolean>(active);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (active) {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (!visible) {
        setVisible(true);
      }
      return;
    }

    if (hideTimerRef.current != null) {
      return;
    }
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, hideDelayMs);
  }, [active, hideDelayMs, visible]);

  // Never allow a frame where `active === true` but `visible === false`,
  // otherwise content can flash before the overlay effect runs.
  return active ? true : visible;
}
