import { useState, useEffect, useRef, useCallback } from 'react';

export function useResizableColumns<T extends Record<string, number>>(
  storageKey: string,
  defaults: T,
) {
  const [widths, setWidths] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch {}
    return { ...defaults };
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(widths));
  }, [storageKey, widths]);

  const dragging = useRef<{ col: keyof T; startX: number; startWidth: number } | null>(null);

  /**
   * @param col - column key to resize
   * @param startWidth - current width of the column
   * @param maxWidth - optional max width the column can grow to
   */
  const onResizeStart = useCallback(
    (col: keyof T, startWidth: number, maxWidth?: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = { col, startX: e.clientX, startWidth };

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - dragging.current.startX;
        let newWidth = Math.max(60, dragging.current.startWidth + delta);
        if (maxWidth !== undefined) newWidth = Math.min(newWidth, maxWidth);
        setWidths(prev => ({ ...prev, [dragging.current!.col]: newWidth }));
      };
      const onUp = () => {
        dragging.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [],
  );

  return { widths, setWidths, onResizeStart };
}
