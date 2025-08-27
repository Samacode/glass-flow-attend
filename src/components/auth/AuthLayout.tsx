import React from 'react';
import { GlassCard } from '@/components/ui/glass-card';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Floating Logo/Icon */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 glass rounded-2xl flex items-center justify-center mb-6 animate-float">
            <div className="h-8 w-8 bg-gradient-primary rounded-lg animate-glow-pulse"></div>
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          )}
        </div>

        {/* Auth Form Card */}
        <GlassCard variant="intense" size="lg">
          {children}
        </GlassCard>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 h-20 w-20 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 h-32 w-32 bg-accent/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/4 h-16 w-16 bg-secondary/20 rounded-full blur-lg animate-pulse"></div>
      </div>
    </div>
  );
};