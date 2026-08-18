import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { EDITOR_STORAGE_KEY } from '../lib/editorStorageKey';
import { isEditMode } from './useEditShortcut';
import { ViewerApp } from './ViewerApp';

const EditorApp = lazy(() => import('../editor/EditorApp'));

class EditorErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[editor] crashed', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="m-6 max-w-xl rounded border border-red-400/50 bg-red-950/40 p-4 text-sm text-red-100">
        <h2 className="mb-2 font-semibold">The editor crashed</h2>
        <p className="mb-3 break-words text-red-200/80">{this.state.error.message}</p>
        <p className="mb-3 text-red-200/80">
          This is usually a saved draft the current version cannot read. You can discard the local draft and reload; the
          published data is not affected.
        </p>
        <button
          type="button"
          className="rounded border border-red-300/60 px-3 py-1 uppercase tracking-[0.15em] hover:bg-red-900/40"
          onClick={() => {
            window.localStorage.removeItem(EDITOR_STORAGE_KEY);
            window.location.reload();
          }}
        >
          Discard local draft and reload
        </button>
      </div>
    );
  }
}

export function App() {
  if (isEditMode(window.location.search)) {
    return (
      <EditorErrorBoundary>
        <Suspense fallback={<div className="p-4 text-sm text-cyan-line">Loading editor…</div>}>
          <EditorApp />
        </Suspense>
      </EditorErrorBoundary>
    );
  }
  return <ViewerApp />;
}
