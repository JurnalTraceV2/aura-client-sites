import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught UI error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-slate-50 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-zinc-900/80 border border-red-500/30 rounded-3xl p-8 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <AlertCircle className="w-8 h-8" />
              <h1 className="text-2xl font-display font-bold">Оплата не прошла</h1>
            </div>

            <p className="text-zinc-300 mb-6 text-base">
              Попробуйте еще раз. Если ошибка повторится, обновите страницу и повторите попытку оплаты.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
