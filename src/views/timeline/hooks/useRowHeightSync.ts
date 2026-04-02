import { useRef, useEffect, useCallback } from 'react';

export function useRowHeightSync(count: number) {
  const infoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const calRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Garante que os arrays têm o tamanho certo
  infoRefs.current = Array(count).fill(null).map((_, i) => infoRefs.current[i] ?? null);
  calRefs.current = Array(count).fill(null).map((_, i) => calRefs.current[i] ?? null);

  const syncRow = useCallback((index: number) => {
    const infoEl = infoRefs.current[index];
    const calEl = calRefs.current[index];
    if (!infoEl || !calEl) return;

    // Reset para medir altura natural antes de aplicar minHeight
    infoEl.style.minHeight = '';
    calEl.style.minHeight = '';

    const infoH = infoEl.getBoundingClientRect().height;
    const calH = calEl.getBoundingClientRect().height;
    const maxH = Math.max(infoH, calH);

    infoEl.style.minHeight = `${maxH}px`;
    calEl.style.minHeight = `${maxH}px`;
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLDivElement;
        const infoIdx = infoRefs.current.indexOf(el);
        const calIdx = calRefs.current.indexOf(el);
        const index = infoIdx !== -1 ? infoIdx : calIdx;
        if (index !== -1) syncRow(index);
      }
    });

    infoRefs.current.forEach(el => { if (el) observer.observe(el); });
    calRefs.current.forEach(el => { if (el) observer.observe(el); });

    // Sync inicial
    for (let i = 0; i < count; i++) syncRow(i);

    return () => observer.disconnect();
  }, [count, syncRow]);

  const setInfoRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    infoRefs.current[index] = el;
  }, []);

  const setCalRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    calRefs.current[index] = el;
  }, []);

  return { setInfoRef, setCalRef };
}
