import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Calendar, BookOpen, Trophy, CheckCircle, Clock, MapPin, BarChart3, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/database';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = React.useState({
    enrolledCourses: 0,
    attendanceRate: 0,
    completedQuizzes: 0,
    upcomingClasses: 0
  });
  const [upcomingClasses, setUpcomingClasses] = React.useState<any[]>([]);
  const [recentActivity, setRecentActivity] = React.useState<any[]>([]);

  React.useEffect(() => {
    loadStudentData();
  }, [user]);

  const loadStudentData = async () => {
    if (!user?.id) return;
    
    try {
      // Get enrolled courses
      const enrollments = await db.courseEnrollments.where('studentId').equals(user.id).toArray();
      const enrolledCourses = enrollments.length;

      // Get completed quizzes
      const completedQuizzes = await db.quizSubmissions
        .where('studentId').equals(user.id)
        .and(submission => submission.isCompleted)
        .count();

      // Calculate attendance rate
      const attendanceRecords = await db.attendanceRecords.where('studentId').equals(user.id).toArray();
      const presentRecords = attendanceRecords.filter(record => record.status === 'present').length;
      const attendanceRate = attendanceRecords.length > 0 ? Math.round((presentRecords / attendanceRecords.length) * 100) : 0;

      // Get upcoming classes (next 7 days)
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const upcomingSessions = await db.classSessions
        .where('date').between(today.toISOString().split('T')[0], nextWeek.toISOString().split('T')[0])
        .toArray();

      // Filter sessions for enrolled courses
      const enrolledCourseIds = enrollments.map(e => e.courseId);
      const relevantSessions = upcomingSessions.filter(session => 
        enrolledCourseIds.includes(session.courseId)
      );

      // Get course and instructor details for upcoming sessions
      const upcomingWithDetails = await Promise.all(
        relevantSessions.slice(0, 3).map(async (session) => {
          const course = await db.courses.get(session.courseId);
          const instructor = await db.users.get(session.instructorId);
          
          // Check if student can check in (within 30 minutes of start time)
          const sessionDateTime = new Date(`${session.date}T${session.startTime}`);
          const now = new Date();
          const timeDiff = sessionDateTime.getTime() - now.getTime();
          const canCheckIn = timeDiff <= 30 * 60 * 1000 && timeDiff >= -15 * 60 * 1000; // 30 min before to 15 min after

          return {
            ...session,
            courseName: course?.name || 'Unknown Course',
            instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Unknown Instructor',
            canCheckIn
          };
        })
      );

      // Get recent activity
      const recentAttendance = await db.attendanceRecords
        .where('studentId').equals(user.id)
        .reverse()
        .limit(5)
        .toArray();

      const recentQuizzes = await db.quizSubmissions
        .where('studentId').equals(user.id)
        .and(submission => submission.isCompleted)
        .reverse()
        .limit(3)
        .toArray();

      // Combine and format recent activity
      const activityItems = [];
      
      for (const record of recentAttendance) {
        const session = await db.classSessions.get(record.sessionId);
        const course = session ? await db.courses.get(session.courseId) : null;
        activityItems.push({
          type: 'attendance',
          course: course?.name || 'Unknown Course',
          status: record.status === 'present' ? 'Present' : record.status === 'late' ? 'Late' : 'Absent',
          time: new Date(record.createdAt).toLocaleDateString(),
          icon: record.status === 'present' ? CheckCircle : Clock
        });
      }

      for (const quiz of recentQuizzes) {
        const quizData = await db.quizzes.get(quiz.quizId);
        const session = quizData ? await db.classSessions.get(quizData.sessionId) : null;
        const course = session ? await db.courses.get(session.courseId) : null;
        const percentage = quiz.maxScore > 0 ? Math.round((quiz.totalScore || 0) / quiz.maxScore * 100) : 0;
        
        activityItems.push({
          type: 'quiz',
          course: course?.name || 'Unknown Course',
          status: `Completed - ${percentage}%`,
          time: new Date(quiz.createdAt).toLocaleDateString(),
          icon: Trophy
        });
      }

      // Sort by date and take most recent
      activityItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setStats({
        enrolledCourses,
        attendanceRate,
        completedQuizzes,
        upcomingClasses: relevantSessions.length
      });
      setUpcomingClasses(upcomingWithDetails);
      setRecentActivity(activityItems.slice(0, 4));
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  const statsDisplay = [
    { label: 'Enrolled Courses', value: stats.enrolledCourses.toString(), icon: BookOpen, color: 'text-primary' },
    { label: 'Attendance Rate', value: `${stats.attendanceRate}%`, icon: CheckCircle, color: 'text-success' },
    { label: 'Completed Quizzes', value: stats.completedQuizzes.toString(), icon: Trophy, color: 'text-accent' },
    { label: 'Upcoming Classes', value: stats.upcomingClasses.toString(), icon: Calendar, color: 'text-warning' },
  ];

  const quickActions = [
    { label: 'Quick Check In', icon: MapPin, href: '/student/quick-checkin', color: 'bg-gradient-primary' },
    { label: 'My Progress', icon: BarChart3, href: '/student/progress', color: 'bg-gradient-secondary' },
    { label: 'Schedule', icon: Calendar, href: '/student/schedule', color: 'bg-accent' },
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
          <Link to="/student/profile">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {quickActions.map((action, index) => (
          <Link key={index} to={action.href}>
            <GlassCard variant="glow" className="glass-hover cursor-pointer">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className={`p-4 rounded-2xl ${action.color} text-white`}>
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
                      {classItem.courseName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {classItem.instructorName}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-glass-foreground">
                    {classItem.startTime}
                  </span>
                </div>
                {classItem.canCheckIn && (
                  <Link to="/student/quick-checkin" state={{ sessionId: classItem.id }}>
                    <Button variant="primary" size="sm" className="w-full mt-3">
                      <MapPin size={14} />
                      Check In Now
                    </Button>
                  </Link>
                )}
              </div>
            ))}
            {upcomingClasses.length === 0 && (
              <div className="text-center py-8">
                <Calendar size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming classes</p>
              </div>
            )}
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
                  <activity.icon size={16} className="text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-glass-foreground">
                    {activity.course} - {activity.status}
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-center py-8">
                <Users size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Floating Decorative Elements */}
      <div className="fixed top-20 right-20 h-32 w-32 bg-primary/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-20 left-20 h-24 w-24 bg-accent/10 rounded-full blur-2xl animate-float pointer-events-none"></div>
    </div>
  );
};