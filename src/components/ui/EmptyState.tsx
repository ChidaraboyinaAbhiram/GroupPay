import { ReactNode } from 'react';
import { Ghost } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = <Ghost className="w-12 h-12 text-slate-500" />,
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <div className="glass-card py-16 px-6 text-center max-w-lg mx-auto flex flex-col items-center justify-center border-dashed border-white/10">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-6 relative">
        <div className="absolute w-8 h-8 rounded-full bg-purple-500/10 blur-lg" />
        <span className="relative z-10">{icon}</span>
      </div>
      
      <h3 className="text-lg font-bold text-white tracking-tight mb-2">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>
      
      {actionLabel && onAction && (
        <Button variant="glass" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
export default EmptyState;
