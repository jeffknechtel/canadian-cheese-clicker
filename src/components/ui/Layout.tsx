import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-cheddar-50 to-cheddar-100 overflow-hidden">
      {/* Subtle decorative background pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #8b7355 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Main content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}
