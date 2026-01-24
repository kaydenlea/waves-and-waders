"use client";

import * as React from "react";

export function useIsTouchOnlyDevice() {
  const [isTouchOnlyDevice, setIsTouchOnlyDevice] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function")
      return;

    let media: MediaQueryList;
    try {
      media = window.matchMedia("(hover: none) and (pointer: coarse)");
    } catch {
      return;
    }

    const update = () => {
      const isTouch = media.matches;
      setIsTouchOnlyDevice(isTouch);
      // Add/remove body class for CSS-based tooltip hiding
      if (isTouch) {
        document.body.classList.add("ww-touch-device");
      } else {
        document.body.classList.remove("ww-touch-device");
      }
    };
    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    // Safari < 14
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return isTouchOnlyDevice;
}
