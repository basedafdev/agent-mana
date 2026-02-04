import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function GlassCard({ children, className = '', hover = false }: GlassCardProps) {
  return (
    <div
      className={`
        backdrop-blur-2xl
        bg-white/[0.03]
        border border-white/[0.08]
        rounded-2xl
        shadow-2xl shadow-black/50
        transition-all duration-300
        ${hover ? 'hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-0.5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
