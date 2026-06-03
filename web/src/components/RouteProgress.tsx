'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  useEffect(() => {
    if (!pathname || pathname === lastPath) return;

    setVisible(true);
    setLastPath(pathname);
    const hideTimer = window.setTimeout(() => setVisible(false), 450);

    return () => window.clearTimeout(hideTimer);
  }, [pathname, lastPath]);

  if (!visible) return null;

  return (
    <div className="route-progress-overlay" aria-live="polite">
      <div className="route-progress-toast">Loading page…</div>
      <div className="route-progress-line" />
    </div>
  );
}
