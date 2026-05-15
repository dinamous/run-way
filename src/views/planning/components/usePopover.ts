import { useState, useRef, useEffect, useCallback } from 'react';

export interface PopoverPosition {
  top: number;
  left: number;
  width: number;
}

interface UsePopoverOptions {
  align?: 'start' | 'end';
  contentWidth?: number;
}

const VIEWPORT_PADDING = 8;

export function usePopover({ align = 'start', contentWidth = 0 }: UsePopoverOptions = {}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPosition>({ top: 0, left: 0, width: 0 });
  const anchorRef = useRef<HTMLElement>(null);

  const recalc = useCallback(() => {
    if (!anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const rawLeft = align === 'end' && contentWidth > 0
      ? r.right + window.scrollX - contentWidth
      : r.left + window.scrollX;
    const maxLeft = window.scrollX + window.innerWidth - contentWidth - VIEWPORT_PADDING;
    const left = contentWidth > 0
      ? Math.min(Math.max(rawLeft, window.scrollX + VIEWPORT_PADDING), maxLeft)
      : rawLeft;

    setPos({ top: r.bottom + window.scrollY + 4, left, width: r.width });
  }, [align, contentWidth]);

  useEffect(() => {
    if (!open) return;
    recalc();
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      // portal content has data-popover attribute
      const portal = document.querySelector('[data-popover]');
      if (portal && portal.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, recalc]);

  return { open, setOpen, pos, anchorRef };
}
