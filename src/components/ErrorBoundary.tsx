import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || 'Unknown error occurred';
      let errorDetails = null;

      try {
        // Try to parse if it's our custom Firestore error JSON
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) {
          errorMessage = parsed.error;
          errorDetails = parsed;
        }
      } catch (e) {
        // Not JSON, keep original message
      }

      return (
        <div className="min-h-screen bg-zinc-950 text-slate-50 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-zinc-900/80 border border-red-500/30 rounded-3xl p-8 backdrop-blur-xl">
            <div className="flex items-center gap-4 mb-6 text-red-500">
              <ShieldAlert className="w-10 h-10" />
              <h1 className="text-3xl font-display font-bold">Системная ошибка</h1>
            </div>
            
            <p className="text-zinc-300 mb-6 text-lg">
              Произошла непредвиденная ошибка при работе с базой данных или приложением.
            </p>

            <div className="bg-black/50 rounded-xl p-4 font-mono text-sm text-red-400 overflow-x-auto border border-red-500/20">
              <p className="font-bold mb-2">Error Message:</p>
              <p>{errorMessage}</p>
              
              {errorDetails && (
                <div className="mt-4 pt-4 border-t border-red-500/20">
                  <p className="font-bold mb-2">Details:</p>
                  <pre className="text-xs text-zinc-400">
                    {JSON.stringify(errorDetails, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="mt-8 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
