import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Users, School, Settings, BarChart3, Shield, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/database';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    activeCourses: 0,
    sessionsToday: 0,
    pendingApprovals: 0
  });

  React.useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const totalUsers = await db.users.where('role').anyOf(['student', 'instructor']).count();
      const activeCourses = await db.courses.count();
      
      const today = new Date().toISOString().split('T')[0];
      const sessionsToday = await db.classSessions.where('date').equals(today).count();
      
      const pendingApprovals = await db.users
        .where('role').equals('instructor')
        .and(user => !user.isApproved)
        .count();

      setStats({
        totalUsers,
        activeCourses,
        sessionsToday,
        pendingApprovals
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const statsDisplay = [
    { label: 'Total Users', value: stats.totalUsers.toString(), icon: Users, color: 'text-primary' },
    { label: 'Active Courses', value: stats.activeCourses.toString(), icon: School, color: 'text-accent' },
    { label: 'Sessions Today', value: stats.sessionsToday.toString(), icon: BarChart3, color: 'text-success' },
    { label: 'Pending Approvals', value: stats.pendingApprovals.toString(), icon: Bell, color: 'text-warning' },
  ];

  const quickActions = [
    { label: 'User Management', icon: Users, href: '/user-management' },
    { label: 'System Settings', icon: Settings, href: '/system-settings' },
    { label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
    { label: 'Security', icon: Shield, href: '/security' },
  ];

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.firstName} {user?.lastName}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/admin-profile">
            <Button variant="outline">Profile</Button>
          </Link>
          <Button variant="destructive" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsDisplay.map((stat, index) => (
          <GlassCard key={index} variant="intense" className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className={`p-3 rounded-xl glass ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-glass-foreground mb-1">
              {stat.value}
            </h3>
            <p className="text-muted-foreground text-sm">{stat.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {quickActions.map((action, index) => (
          <Link key={index} to={action.href}>
            <GlassCard variant="glow" className="glass-hover cursor-pointer">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-4 rounded-2xl bg-gradient-primary text-primary-foreground">
                    <action.icon size={28} />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-glass-foreground">
                  {action.label}
                </h3>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard variant="intense">
          <h2 className="text-xl font-semibold text-glass-foreground mb-4">
            Recent User Activity
          </h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center space-x-3 p-3 glass rounded-lg">
                <div className="h-8 w-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Users size={16} className="text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-glass-foreground">
                    New instructor registration
                  </p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard variant="intense">
          <h2 className="text-xl font-semibold text-glass-foreground mb-4">
            System Health
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-glass-foreground">Database</span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-success text-sm">Healthy</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-glass-foreground">Storage</span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-success text-sm">85% Available</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-glass-foreground">Active Sessions</span>
              <span className="text-glass-foreground text-sm">{stats.totalUsers}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Floating Decorative Elements */}
      <div className="fixed top-20 right-20 h-32 w-32 bg-primary/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-20 left-20 h-24 w-24 bg-accent/10 rounded-full blur-2xl animate-float pointer-events-none"></div>
    </div>
  );
};