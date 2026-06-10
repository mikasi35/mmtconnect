'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const mounted = useRef(false);
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    if (!pathname || pathname === previousPath.current) {
      setVisible(false);
      return;
    }

    previousPath.current = pathname;
    setVisible(true);

    const hideTimer = window.setTimeout(() => setVisible(false), 450);
    return () => window.clearTimeout(hideTimer);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="route-progress-overlay" aria-live="polite">
      <div className="route-progress-toast">Loading page…</div>
      <div className="route-progress-line" />
    </div>
  );
}
