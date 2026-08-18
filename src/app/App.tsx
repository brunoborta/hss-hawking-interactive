import { lazy, Suspense } from 'react';
import { isEditMode } from './useEditShortcut';
import { ViewerApp } from './ViewerApp';

const EditorApp = lazy(() => import('../editor/EditorApp'));

export function App() {
  if (isEditMode(window.location.search)) {
    return (
      <Suspense fallback={<div className="p-4 text-sm text-cyan-line">Loading editor…</div>}>
        <EditorApp />
      </Suspense>
    );
  }
  return <ViewerApp />;
}
