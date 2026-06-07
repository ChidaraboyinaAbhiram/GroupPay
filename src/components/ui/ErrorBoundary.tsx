import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { GlassCard } from './GlassCard';

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
    console.error('Uncaught error in boundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#070a13] text-slate-100">
          <GlassCard glowColor="rose" hoverGlow={false} className="max-w-md w-full text-center p-8 space-y-6">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Something went wrong</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                A rendering exception occurred inside this workspace. Don't worry, your Supabase databases and sharing assets are safe.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/30 rounded-xl border border-white/5 text-[10px] text-rose-300 font-mono text-left max-h-24 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <Button
              variant="primary"
              onClick={this.handleReload}
              className="w-full"
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Reload Workspace
            </Button>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
