import { useState, useEffect, useRef, useCallback } from 'react';

export interface ColWidths {
  title: number;
  project: number;
  due: number;
}

const STORAGE_KEY = 'hierarch-col-widths';
const DEFAULTS: ColWidths = { title: 300, project: 200, due: 120 };

function load(): ColWidths {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

export function useColumnWidths() {
  const [widths, setWidths] = useState<ColWidths>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  }, [widths]);

  const columnTemplate = `40px minmax(0, ${widths.title}px) minmax(0, ${widths.project}px) minmax(0, ${widths.due}px) 64px`;

  const dragging = useRef<{ col: keyof ColWidths; startX: number; startWidth: number } | null>(null);

  const onResizeStart = useCallback((col: keyof ColWidths, startWidth: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = { col, startX: e.clientX, startWidth };

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = ev.clientX - dragging.current.startX;
      const newWidth = Math.max(60, dragging.current.startWidth + delta);
      setWidths(prev => ({ ...prev, [dragging.current!.col]: newWidth }));
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return { widths, columnTemplate, onResizeStart };
}
