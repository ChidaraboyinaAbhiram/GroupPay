import { Loader2 } from 'lucide-react';

interface LoadingProps {
  fullPage?: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ fullPage = false, message = 'Syncing balances...', size = 'md' }: LoadingProps) {
  const sizeStyles = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="relative flex items-center justify-center">
        {/* Glow ambient background behind the spinner */}
        <div className="absolute w-12 h-12 rounded-full bg-purple-500/20 blur-xl animate-pulse" />
        <Loader2 className={`${sizeStyles[size]} text-purple-400 animate-spin relative z-10`} />
      </div>
      {message && <p className="text-xs text-slate-400 font-medium tracking-wide">{message}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        {spinner}
      </div>
    );
  }

  return (
    <div className="w-full py-12 flex items-center justify-center">
      {spinner}
    </div>
  );
}
export default Loading;
