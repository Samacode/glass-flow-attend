import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Calendar, BookOpen, Trophy, CheckCircle, Clock, MapPin } from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const stats = [
    { label: 'Enrolled Courses', value: '6', icon: BookOpen, color: 'text-primary' },
    { label: 'Attendance Rate', value: '94%', icon: CheckCircle, color: 'text-success' },
    { label: 'Completed Quizzes', value: '23', icon: Trophy, color: 'text-accent' },
    { label: 'Upcoming Classes', value: '4', icon: Calendar, color: 'text-warning' },
  ];

  const upcomingClasses = [
    { 
      course: 'CS 101 - Introduction to Programming', 
      time: '09:00 AM', 
      instructor: 'Dr. Smith',
      room: 'Room A-101',
      canCheckIn: true
    },
    { 
      course: 'MATH 201 - Calculus II', 
      time: '11:30 AM', 
      instructor: 'Prof. Johnson',
      room: 'Room B-205',
      canCheckIn: false
    },
    { 
      course: 'ENG 301 - Technical Writing', 
      time: '02:00 PM', 
      instructor: 'Dr. Williams',
      room: 'Room C-312',
      canCheckIn: false
    },
  ];

  const recentActivity = [
    { type: 'attendance', course: 'CS 101', status: 'Present', time: '2 hours ago' },
    { type: 'quiz', course: 'MATH 201', status: 'Completed - 85%', time: '1 day ago' },
    { type: 'attendance', course: 'ENG 301', status: 'Present', time: '2 days ago' },
    { type: 'quiz', course: 'CS 101', status: 'Completed - 92%', time: '3 days ago' },
  ];

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.firstName} {user?.lastName}
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
                <MapPin size={28} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-glass-foreground">
              Quick Check-In
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Scan QR or use location
            </p>
          </div>
        </GlassCard>

        <GlassCard variant="glow" className="glass-hover cursor-pointer">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 rounded-2xl bg-gradient-secondary text-secondary-foreground">
                <Trophy size={28} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-glass-foreground">
              My Progress
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              View grades & attendance
            </p>
          </div>
        </GlassCard>

        <GlassCard variant="glow" className="glass-hover cursor-pointer">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 rounded-2xl bg-accent text-accent-foreground">
                <Calendar size={28} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-glass-foreground">
              Schedule
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              View full timetable
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Upcoming Classes & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard variant="intense">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-glass-foreground">
              Upcoming Classes
            </h2>
            <Clock size={20} className="text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {upcomingClasses.map((classItem, index) => (
              <div key={index} className="p-4 glass rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-glass-foreground text-sm">
                      {classItem.course}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {classItem.instructor} • {classItem.room}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-glass-foreground">
                    {classItem.time}
                  </span>
                </div>
                {classItem.canCheckIn && (
                  <Button variant="primary" size="sm" className="w-full mt-3">
                    <MapPin size={14} />
                    Check In Now
                  </Button>
                )}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard variant="intense">
          <h2 className="text-xl font-semibold text-glass-foreground mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 glass rounded-lg">
                <div className="h-8 w-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  {activity.type === 'attendance' ? (
                    <CheckCircle size={16} className="text-primary-foreground" />
                  ) : (
                    <Trophy size={16} className="text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-glass-foreground">
                    {activity.course} - {activity.status}
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
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