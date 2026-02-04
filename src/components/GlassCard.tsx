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
        bg-[var(--bg-card)]
        border border-[var(--border-primary)]
        rounded-2xl
        shadow-2xl shadow-[var(--shadow-color)]
        transition-all duration-300
        ${hover ? 'hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-secondary)] hover:-translate-y-0.5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
