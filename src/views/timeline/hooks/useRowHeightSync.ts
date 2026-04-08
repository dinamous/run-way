import { useRef, useEffect, useCallback } from 'react';

export function useRowHeightSync(count: number) {
  const infoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const calRefs = useRef<(HTMLDivElement | null)[]>([]);

  const syncRow = useCallback((index: number) => {
    const infoEl = infoRefs.current[index];
    const calEl = calRefs.current[index];
    if (!infoEl || !calEl) return;

    infoEl.style.minHeight = '';
    calEl.style.minHeight = '';

    const infoH = infoEl.getBoundingClientRect().height;
    const calH = calEl.getBoundingClientRect().height;
    const maxH = Math.max(infoH, calH);

    infoEl.style.minHeight = `${maxH}px`;
    calEl.style.minHeight = `${maxH}px`;
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      for (let i = 0; i < count; i++) syncRow(i);
    });

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        for (let i = 0; i < count; i++) syncRow(i);
      });
    });

    infoRefs.current.forEach(el => { if (el) observer.observe(el); });
    calRefs.current.forEach(el => { if (el) observer.observe(el); });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [count, syncRow]);

  const setInfoRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    infoRefs.current[index] = el;
  }, []);

  const setCalRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    calRefs.current[index] = el;
  }, []);

  return { setInfoRef, setCalRef };
}
