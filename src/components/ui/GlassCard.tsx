import { HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverGlow?: boolean;
  glowColor?: 'purple' | 'blue' | 'emerald' | 'rose' | 'none';
}

export function GlassCard({
  children,
  hoverGlow = true,
  glowColor = 'purple',
  className = '',
  ...props
}: GlassCardProps) {
  const glowStyles = {
    purple: 'hover:border-purple-500/30 hover:shadow-purple-500/5',
    blue: 'hover:border-blue-500/30 hover:shadow-blue-500/5',
    emerald: 'hover:border-emerald-500/30 hover:shadow-emerald-500/5',
    rose: 'hover:border-rose-500/30 hover:shadow-rose-500/5',
    none: ''
  };

  return (
    <div
      className={`glass-card p-6 rounded-3xl relative overflow-hidden transition-all duration-300 ${
        hoverGlow ? `hover:scale-[1.01] ${glowStyles[glowColor]}` : ''
      } ${className}`}
      {...props}
    >
      {/* Dynamic ambient background blob when glow is enabled */}
      {hoverGlow && glowColor !== 'none' && (
        <div
          className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-3xl opacity-10 transition-all duration-300 group-hover:opacity-20 ${
            glowColor === 'purple' ? 'bg-purple-500' :
            glowColor === 'blue' ? 'bg-blue-500' :
            glowColor === 'emerald' ? 'bg-emerald-500' :
            glowColor === 'rose' ? 'bg-rose-500' : ''
          }`}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
export default GlassCard;
