import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Users, BarChart3, Smartphone } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  // Redirect to dashboard if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: Shield,
      title: 'Secure Authentication',
      description: 'Multi-role system with admin approval for instructors'
    },
    {
      icon: Smartphone,
      title: 'Smart Check-in',
      description: 'QR codes, GPS, and IP-based attendance tracking'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Real-time insights and comprehensive reporting'
    },
    {
      icon: Users,
      title: 'Multi-Role Support',
      description: 'Purpose-built dashboards for admins, instructors, and students'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center p-6">
        <div className="max-w-6xl mx-auto text-center">
          {/* Floating Logo */}
          <div className="mx-auto h-20 w-20 glass rounded-3xl flex items-center justify-center mb-8 animate-float">
            <div className="h-10 w-10 bg-gradient-primary rounded-xl animate-glow-pulse"></div>
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl font-bold text-gradient mb-6">
            Glass Flow Attend
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            The future of attendance management with stunning glassmorphism design, 
            smart automation, and comprehensive learning analytics.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/register">
              <Button variant="hero" size="xl">
                Get Started
                <ArrowRight size={20} />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="xl">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {features.map((feature, index) => (
              <GlassCard key={index} variant="intense" className="text-center group">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-4 rounded-2xl bg-gradient-primary text-primary-foreground group-hover:scale-110 transition-transform duration-300">
                    <feature.icon size={28} />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-glass-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Floating Decorative Elements */}
        <div className="absolute top-20 left-20 h-32 w-32 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 h-40 w-40 bg-accent/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 right-1/4 h-24 w-24 bg-secondary/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/4 h-28 w-28 bg-success/20 rounded-full blur-2xl animate-float"></div>
      </section>

      {/* Demo Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <GlassCard variant="glow" size="xl">
            <h2 className="text-3xl font-bold text-gradient mb-4">
              Ready to Experience the Future?
            </h2>
            <p className="text-muted-foreground mb-8">
              Try our demo with the default admin account or create your own student/instructor profile.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="glass p-4 rounded-lg">
                <h3 className="font-semibold text-glass-foreground mb-2">Demo Admin Access</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Email: admin@attendance.local
                </p>
                <p className="text-sm text-muted-foreground">
                  Password: admin123
                </p>
              </div>
              <div className="glass p-4 rounded-lg">
                <h3 className="font-semibold text-glass-foreground mb-2">Create Your Account</h3>
                <p className="text-sm text-muted-foreground">
                  Sign up as a student for instant access, or as an instructor for admin-approved access.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default Index;
