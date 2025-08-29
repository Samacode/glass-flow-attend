import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3, Users, Calendar, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/database';

export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    totalSessions: 0,
    averageAttendance: 0,
    completedQuizzes: 0,
    averageQuizScore: 0
  });

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    if (!user?.id) return;

    try {
      // Get instructor's courses
      const courses = await db.courses.where('instructorId').equals(user.id).toArray();
      const courseIds = courses.map(c => c.id!);

      // Get total enrolled students
      const totalStudents = await db.courseEnrollments.where('courseId').anyOf(courseIds).count();

      // Get total sessions
      const totalSessions = await db.classSessions.where('instructorId').equals(user.id).count();

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

      const averageAttendance = sessionCount > 0 ? Math.round(totalAttendanceRate / sessionCount) : 0;

      // Get quiz statistics
      const quizzes = await db.quizzes.where('instructorId').equals(user.id).toArray();
      const completedQuizzes = await db.quizSubmissions
        .where('quizId').anyOf(quizzes.map(q => q.id!))
        .and(submission => submission.isCompleted)
        .count();

      const allSubmissions = await db.quizSubmissions
        .where('quizId').anyOf(quizzes.map(q => q.id!))
        .and(submission => submission.isCompleted)
        .toArray();

      const averageQuizScore = allSubmissions.length > 0 ?
        Math.round(allSubmissions.reduce((sum, submission) => 
          sum + ((submission.totalScore || 0) / submission.maxScore * 100), 0) / allSubmissions.length) : 0;

      setStats({
        totalStudents,
        activeCourses: courses.length,
        totalSessions,
        averageAttendance,
        completedQuizzes,
        averageQuizScore
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const analyticsCards = [
    { label: 'Total Students', value: stats.totalStudents.toString(), icon: Users, color: 'text-primary' },
    { label: 'Active Courses', value: stats.activeCourses.toString(), icon: BarChart3, color: 'text-accent' },
    { label: 'Total Sessions', value: stats.totalSessions.toString(), icon: Calendar, color: 'text-success' },
    { label: 'Avg. Attendance', value: `${stats.averageAttendance}%`, icon: Users, color: 'text-warning' },
    { label: 'Completed Quizzes', value: stats.completedQuizzes.toString(), icon: Trophy, color: 'text-secondary' },
    { label: 'Avg. Quiz Score', value: `${stats.averageQuizScore}%`, icon: Trophy, color: 'text-destructive' },
  ];

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Analytics</h1>
            <p className="text-muted-foreground mt-1">Comprehensive insights into your teaching performance</p>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {analyticsCards.map((card, index) => (
          <GlassCard key={index} variant="intense" className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className={`p-3 rounded-xl glass ${card.color}`}>
                <card.icon size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-glass-foreground mb-1">
              {card.value}
            </h3>
            <p className="text-muted-foreground text-sm">{card.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard variant="intense">
          <h2 className="text-xl font-semibold text-glass-foreground mb-4">
            Performance Overview
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 glass rounded-lg">
              <span className="text-glass-foreground">Student Engagement</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-glass rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                    style={{ width: `${stats.averageAttendance}%` }}
                  ></div>
                </div>
                <span className="text-glass-foreground text-sm font-medium">
                  {stats.averageAttendance}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 glass rounded-lg">
              <span className="text-glass-foreground">Quiz Performance</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-glass rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-secondary rounded-full transition-all duration-500"
                    style={{ width: `${stats.averageQuizScore}%` }}
                  ></div>
                </div>
                <span className="text-glass-foreground text-sm font-medium">
                  {stats.averageQuizScore}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 glass rounded-lg">
              <span className="text-glass-foreground">Course Activity</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-glass rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((stats.totalSessions / 50) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-glass-foreground text-sm font-medium">
                  {stats.totalSessions} sessions
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="intense">
          <h2 className="text-xl font-semibold text-glass-foreground mb-4">
            Recent Trends
          </h2>
          <div className="space-y-3">
            {[
              { metric: 'Attendance Rate', trend: '+5%', period: 'vs last month', positive: true },
              { metric: 'Quiz Scores', trend: '+12%', period: 'vs last month', positive: true },
              { metric: 'Student Engagement', trend: '-2%', period: 'vs last week', positive: false },
              { metric: 'Course Completion', trend: '+8%', period: 'vs last month', positive: true }
            ].map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                <div>
                  <p className="text-sm font-medium text-glass-foreground">{trend.metric}</p>
                  <p className="text-xs text-muted-foreground">{trend.period}</p>
                </div>
                <div className={`text-sm font-bold ${trend.positive ? 'text-success' : 'text-warning'}`}>
                  {trend.trend}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};