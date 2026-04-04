import { useRef, useEffect } from 'react';

export function useHeaderHeightSync() {
  const infoHeaderRef = useRef<HTMLDivElement>(null);
  const calHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      const infoEl = infoHeaderRef.current;
      const calEl = calHeaderRef.current;
      if (!infoEl || !calEl) return;

      infoEl.style.minHeight = '';
      const calH = calEl.getBoundingClientRect().height;
      infoEl.style.minHeight = `${calH}px`;
    };

    const observer = new ResizeObserver(sync);
    if (calHeaderRef.current) observer.observe(calHeaderRef.current);

    sync();
    return () => observer.disconnect();
  }, []);

  return { infoHeaderRef, calHeaderRef };
}
