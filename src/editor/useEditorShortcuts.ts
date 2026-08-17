import { useEffect } from 'react';
import { useEditorStore } from './useEditorStore';

function isTyping(t: EventTarget | null): boolean {
  return (
    t instanceof HTMLElement &&
    (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
  );
}

export function useEditorShortcuts(): void {
  const dispatch = useEditorStore((s) => s.dispatch);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const { selectedId } = useEditorStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'undo' });
      } else if ((mod && e.key.toLowerCase() === 'z' && e.shiftKey) || (mod && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        dispatch({ type: 'redo' });
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        dispatch({ type: 'deletePoi', id: selectedId });
      } else if (e.key === 'Escape') {
        dispatch({ type: 'setTool', tool: { kind: 'select' } });
        dispatch({ type: 'select', id: null });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);
}
