import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, BookOpen, Plus, BarChart3, Clock, MessageSquare, UserCheck, ClipboardList, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/database';

export const InstructorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = React.useState({
    activeCourses: 0,
    totalStudents: 0,
    sessionsThisWeek: 0,
    avgAttendance: 0,
    pendingComplaints: 0,
    pendingEditRequests: 0
  });

  React.useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user?.id) return;
    
    try {
      const activeCourses = await db.courses.where('instructorId').equals(user.id).count();
      
      // Get enrolled students count across all instructor's courses
      const instructorCourses = await db.courses.where('instructorId').equals(user.id).toArray();
      const courseIds = instructorCourses.map(c => c.id!);
      const totalStudents = await db.courseEnrollments.where('courseId').anyOf(courseIds).count();
      
      // Get sessions this week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const sessionsThisWeek = await db.classSessions
        .where('instructorId').equals(user.id)
        .and(session => {
          const sessionDate = new Date(session.date);
          return sessionDate >= weekStart && sessionDate <= weekEnd;
        })
        .count();

      // Calculate average attendance
      const allSessions = await db.classSessions.where('instructorId').equals(user.id).toArray();
      let totalAttendanceRate = 0;
      let sessionCount = 0;

      for (const session of allSessions) {
        const totalRecords = await db.attendanceRecords.where('sessionId').equals(session.id!).count();
        const presentRecords = await db.attendanceRecords
          .where('sessionId').equals(session.id!)
          .and(record => record.status === 'present')
          .count();
        
        if (totalRecords > 0) {
          totalAttendanceRate += (presentRecords / totalRecords) * 100;
          sessionCount++;
        }
      }

      const avgAttendance = sessionCount > 0 ? Math.round(totalAttendanceRate / sessionCount) : 0;

      // Get pending complaints
      const pendingComplaints = await db.messages
        .where('receiverId').equals(user.id)
        .and(msg => msg.status === 'pending' && msg.type === 'complaint')
        .count();

      // Get pending edit requests
      const pendingEditRequests = await db.messages
        .where('receiverId').equals(user.id)
        .and(msg => msg.status === 'pending' && msg.type === 'profile_edit_request')
        .count();

      setStats({
        activeCourses,
        totalStudents,
        sessionsThisWeek,
        avgAttendance,
        pendingComplaints,
        pendingEditRequests
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const statsDisplay = [
    { label: 'Active Courses', value: stats.activeCourses.toString(), icon: BookOpen, color: 'text-primary' },
    { label: 'Total Students', value: stats.totalStudents.toString(), icon: Users, color: 'text-accent' },
    { label: 'Sessions This Week', value: stats.sessionsThisWeek.toString(), icon: Calendar, color: 'text-success' },
    { label: 'Avg. Attendance', value: `${stats.avgAttendance}%`, icon: BarChart3, color: 'text-warning' },
  ];

  const quickActions = [
    { label: 'Create Course', icon: Plus, href: '/instructor/create-course', color: 'bg-gradient-primary' },
    { label: 'Set Quiz', icon: ClipboardList, href: '/instructor/set-quiz', color: 'bg-gradient-secondary' },
    { label: 'Schedule Course', icon: Calendar, href: '/instructor/schedule-course', color: 'bg-accent' },
    { label: 'Analytics', icon: BarChart3, href: '/instructor/analytics', color: 'bg-success' },
    { label: 'Complaints', icon: MessageSquare, href: '/instructor/complaints', color: 'bg-warning', badge: stats.pendingComplaints },
    { label: 'Approve Edits', icon: UserCheck, href: '/instructor/approve-edits', color: 'bg-destructive', badge: stats.pendingEditRequests },
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
          <Link to="/instructor/profile">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {quickActions.map((action, index) => (
          <Link key={index} to={action.href}>
            <GlassCard variant="glow" className="glass-hover cursor-pointer relative">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className={`p-4 rounded-2xl ${action.color} text-white relative`}>
                    <action.icon size={28} />
                    {action.badge && action.badge > 0 && (
                      <div className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        {action.badge}
                      </div>
                    )}
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