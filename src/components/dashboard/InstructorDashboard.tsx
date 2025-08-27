import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, BookOpen, Plus, BarChart3, Clock } from 'lucide-react';

export const InstructorDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const stats = [
    { label: 'Active Courses', value: '4', icon: BookOpen, color: 'text-primary' },
    { label: 'Total Students', value: '156', icon: Users, color: 'text-accent' },
    { label: 'Sessions This Week', value: '12', icon: Calendar, color: 'text-success' },
    { label: 'Avg. Attendance', value: '87%', icon: BarChart3, color: 'text-warning' },
  ];

  const upcomingSessions = [
    { course: 'CS 101', time: '09:00 AM', students: 45, room: 'Room A-101' },
    { course: 'CS 201', time: '02:00 PM', students: 38, room: 'Room B-205' },
    { course: 'CS 301', time: '04:30 PM', students: 28, room: 'Room C-312' },
  ];

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Instructor Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, Prof. {user?.firstName} {user?.lastName}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline">Profile</Button>
          <Button variant="destructive" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <GlassCard variant="glow" className="glass-hover cursor-pointer">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 rounded-2xl bg-gradient-primary text-primary-foreground">
                <Plus size={28} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-glass-foreground">
              Create Session
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start a new class session
            </p>
          </div>
        </GlassCard>

        <GlassCard variant="glow" className="glass-hover cursor-pointer">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 rounded-2xl bg-gradient-secondary text-secondary-foreground">
                <BookOpen size={28} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-glass-foreground">
              Question Banks
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manage quiz questions
            </p>
          </div>
        </GlassCard>

        <GlassCard variant="glow" className="glass-hover cursor-pointer">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 rounded-2xl bg-accent text-accent-foreground">
                <BarChart3 size={28} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-glass-foreground">
              Analytics
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              View detailed reports
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Today's Schedule & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard variant="intense">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-glass-foreground">
              Today's Schedule
            </h2>
            <Clock size={20} className="text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {upcomingSessions.map((session, index) => (
              <div key={index} className="flex items-center justify-between p-4 glass rounded-lg">
                <div>
                  <h3 className="font-semibold text-glass-foreground">{session.course}</h3>
                  <p className="text-sm text-muted-foreground">{session.room}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-glass-foreground">{session.time}</p>
                  <p className="text-sm text-muted-foreground">{session.students} students</p>
                </div>
              </div>
            ))}
            {upcomingSessions.length === 0 && (
              <div className="text-center py-8">
                <Calendar size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No sessions scheduled for today</p>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard variant="intense">
          <h2 className="text-xl font-semibold text-glass-foreground mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center space-x-3 p-3 glass rounded-lg">
                <div className="h-8 w-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <Users size={16} className="text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-glass-foreground">
                    CS 101 session completed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    42/45 students attended • 2 hours ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Floating Decorative Elements */}
      <div className="fixed top-20 right-20 h-32 w-32 bg-primary/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-20 left-20 h-24 w-24 bg-accent/10 rounded-full blur-2xl animate-float pointer-events-none"></div>
    </div>
  );
};