import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3, Users, GraduationCap, BookOpen, Calendar, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/database';

interface UserStats {
  totalStudents: number;
  totalInstructors: number;
  approvedInstructors: number;
  pendingInstructors: number;
  activeUsers: number;
}

interface CourseStats {
  totalCourses: number;
  coursesPerDepartment: { [key: string]: number };
  averageEnrollment: number;
  mostPopularCourse: string;
}

interface AttendanceStats {
  overallAttendanceRate: number;
  attendanceByDepartment: { [key: string]: number };
  attendanceTrends: { date: string; rate: number }[];
}

interface QuizStats {
  totalQuizzes: number;
  completedSubmissions: number;
  averageScore: number;
  scoreDistribution: { range: string; count: number }[];
}

export const AdminAnalytics: React.FC = () => {
  const [userStats, setUserStats] = useState<UserStats>({
    totalStudents: 0,
    totalInstructors: 0,
    approvedInstructors: 0,
    pendingInstructors: 0,
    activeUsers: 0
  });

  const [courseStats, setCourseStats] = useState<CourseStats>({
    totalCourses: 0,
    coursesPerDepartment: {},
    averageEnrollment: 0,
    mostPopularCourse: ''
  });

  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    overallAttendanceRate: 0,
    attendanceByDepartment: {},
    attendanceTrends: []
  });

  const [quizStats, setQuizStats] = useState<QuizStats>({
    totalQuizzes: 0,
    completedSubmissions: 0,
    averageScore: 0,
    scoreDistribution: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadUserStats(),
        loadCourseStats(),
        loadAttendanceStats(),
        loadQuizStats()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    const allUsers = await db.users.toArray();
    const students = allUsers.filter(u => u.role === 'student');
    const instructors = allUsers.filter(u => u.role === 'instructor');
    const approvedInstructors = instructors.filter(i => i.isApproved);
    const pendingInstructors = instructors.filter(i => !i.isApproved);

    // Simulate active users (in real app, this would track login sessions)
    const activeUsers = Math.floor(allUsers.length * 0.3);

    setUserStats({
      totalStudents: students.length,
      totalInstructors: instructors.length,
      approvedInstructors: approvedInstructors.length,
      pendingInstructors: pendingInstructors.length,
      activeUsers
    });
  };

  const loadCourseStats = async () => {
    const allCourses = await db.courses.toArray();
    const allEnrollments = await db.courseEnrollments.toArray();
    
    // Group courses by department
    const coursesPerDepartment: { [key: string]: number } = {};
    for (const course of allCourses) {
      const instructor = await db.users.get(course.instructorId);
      const dept = instructor?.department || 'Unknown';
      coursesPerDepartment[dept] = (coursesPerDepartment[dept] || 0) + 1;
    }

    // Calculate average enrollment
    const averageEnrollment = allCourses.length > 0 ? 
      Math.round(allEnrollments.length / allCourses.length) : 0;

    // Find most popular course
    const enrollmentCounts: { [key: number]: number } = {};
    allEnrollments.forEach(enrollment => {
      enrollmentCounts[enrollment.courseId] = (enrollmentCounts[enrollment.courseId] || 0) + 1;
    });

    const mostPopularCourseId = Object.keys(enrollmentCounts).reduce((a, b) => 
      enrollmentCounts[parseInt(a)] > enrollmentCounts[parseInt(b)] ? a : b, '0'
    );

    const mostPopularCourse = mostPopularCourseId !== '0' ? 
      (await db.courses.get(parseInt(mostPopularCourseId)))?.name || 'N/A' : 'N/A';

    setCourseStats({
      totalCourses: allCourses.length,
      coursesPerDepartment,
      averageEnrollment,
      mostPopularCourse
    });
  };

  const loadAttendanceStats = async () => {
    const allRecords = await db.attendanceRecords.toArray();
    const presentRecords = allRecords.filter(r => r.status === 'present');
    const overallAttendanceRate = allRecords.length > 0 ? 
      Math.round((presentRecords.length / allRecords.length) * 100) : 0;

    // Calculate attendance by department
    const attendanceByDepartment: { [key: string]: number } = {};
    const departmentCounts: { [key: string]: { present: number; total: number } } = {};

    for (const record of allRecords) {
      const student = await db.users.get(record.studentId);
      const dept = student?.department || 'Unknown';
      
      if (!departmentCounts[dept]) {
        departmentCounts[dept] = { present: 0, total: 0 };
      }
      
      departmentCounts[dept].total++;
      if (record.status === 'present') {
        departmentCounts[dept].present++;
      }
    }

    Object.keys(departmentCounts).forEach(dept => {
      const counts = departmentCounts[dept];
      attendanceByDepartment[dept] = counts.total > 0 ? 
        Math.round((counts.present / counts.total) * 100) : 0;
    });

    // Generate attendance trends (last 7 days)
    const attendanceTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRecords = allRecords.filter(r => r.createdAt.startsWith(dateStr));
      const dayPresent = dayRecords.filter(r => r.status === 'present');
      const rate = dayRecords.length > 0 ? Math.round((dayPresent.length / dayRecords.length) * 100) : 0;
      
      attendanceTrends.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        rate
      });
    }

    setAttendanceStats({
      overallAttendanceRate,
      attendanceByDepartment,
      attendanceTrends
    });
  };

  const loadQuizStats = async () => {
    const allQuizzes = await db.quizzes.toArray();
    const allSubmissions = await db.quizSubmissions.toArray();
    const completedSubmissions = allSubmissions.filter(s => s.isCompleted);

    const averageScore = completedSubmissions.length > 0 ?
      Math.round(completedSubmissions.reduce((sum, submission) => 
        sum + ((submission.totalScore || 0) / submission.maxScore * 100), 0) / completedSubmissions.length) : 0;

    // Score distribution
    const scoreDistribution = [
      { range: '90-100%', count: 0 },
      { range: '80-89%', count: 0 },
      { range: '70-79%', count: 0 },
      { range: '60-69%', count: 0 },
      { range: 'Below 60%', count: 0 }
    ];

    completedSubmissions.forEach(submission => {
      const percentage = (submission.totalScore || 0) / submission.maxScore * 100;
      if (percentage >= 90) scoreDistribution[0].count++;
      else if (percentage >= 80) scoreDistribution[1].count++;
      else if (percentage >= 70) scoreDistribution[2].count++;
      else if (percentage >= 60) scoreDistribution[3].count++;
      else scoreDistribution[4].count++;
    });

    setQuizStats({
      totalQuizzes: allQuizzes.length,
      completedSubmissions: completedSubmissions.length,
      averageScore,
      scoreDistribution
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8 flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <span className="text-glass-foreground">Loading analytics...</span>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-gradient">System Analytics</h1>
            <p className="text-muted-foreground mt-1">Comprehensive insights into system performance and user engagement</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard variant="intense" className="text-center">
              <Users size={32} className="text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-glass-foreground mb-1">
                {userStats.totalStudents + userStats.totalInstructors}
              </h3>
              <p className="text-muted-foreground text-sm">Total Users</p>
            </GlassCard>

            <GlassCard variant="intense" className="text-center">
              <BookOpen size={32} className="text-accent mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-glass-foreground mb-1">
                {courseStats.totalCourses}
              </h3>
              <p className="text-muted-foreground text-sm">Active Courses</p>
            </GlassCard>

            <GlassCard variant="intense" className="text-center">
              <BarChart3 size={32} className="text-success mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-glass-foreground mb-1">
                {attendanceStats.overallAttendanceRate}%
              </h3>
              <p className="text-muted-foreground text-sm">Attendance Rate</p>
            </GlassCard>

            <GlassCard variant="intense" className="text-center">
              <Trophy size={32} className="text-warning mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-glass-foreground mb-1">
                {quizStats.averageScore}%
              </h3>
              <p className="text-muted-foreground text-sm">Avg Quiz Score</p>
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-4">User Distribution</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 glass rounded-lg">
                  <span className="text-glass-foreground">Students</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-glass rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(userStats.totalStudents / (userStats.totalStudents + userStats.totalInstructors)) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-glass-foreground text-sm font-medium">
                      {userStats.totalStudents}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 glass rounded-lg">
                  <span className="text-glass-foreground">Approved Instructors</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-glass rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success rounded-full"
                        style={{ width: `${userStats.totalInstructors > 0 ? (userStats.approvedInstructors / userStats.totalInstructors) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-glass-foreground text-sm font-medium">
                      {userStats.approvedInstructors}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 glass rounded-lg">
                  <span className="text-glass-foreground">Pending Instructors</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 h-2 bg-glass rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-warning rounded-full"
                        style={{ width: `${userStats.totalInstructors > 0 ? (userStats.pendingInstructors / userStats.totalInstructors) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-glass-foreground text-sm font-medium">
                      {userStats.pendingInstructors}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-4">Activity Metrics</h2>
              <div className="space-y-4">
                <div className="text-center p-4 glass rounded-lg">
                  <div className="text-2xl font-bold text-success mb-1">
                    {userStats.activeUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Users Today</div>
                </div>

                <div className="text-center p-4 glass rounded-lg">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {Math.round((userStats.activeUsers / (userStats.totalStudents + userStats.totalInstructors)) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Engagement Rate</div>
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-4">Courses by Department</h2>
              <div className="space-y-3">
                {Object.entries(courseStats.coursesPerDepartment).map(([dept, count]) => (
                  <div key={dept} className="flex items-center justify-between p-3 glass rounded-lg">
                    <span className="text-glass-foreground">{dept}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-glass rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${(count / Math.max(...Object.values(courseStats.coursesPerDepartment))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-glass-foreground text-sm font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-4">Course Metrics</h2>
              <div className="space-y-4">
                <div className="text-center p-4 glass rounded-lg">
                  <div className="text-2xl font-bold text-accent mb-1">
                    {courseStats.averageEnrollment}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Students per Course</div>
                </div>

                <div className="p-4 glass rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Most Popular Course</div>
                  <div className="text-lg font-semibold text-glass-foreground">
                    {courseStats.mostPopularCourse}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-4">Attendance by Department</h2>
              <div className="space-y-3">
                {Object.entries(attendanceStats.attendanceByDepartment).map(([dept, rate]) => (
                  <div key={dept} className="flex items-center justify-between p-3 glass rounded-lg">
                    <span className="text-glass-foreground">{dept}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-glass rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-primary rounded-full"
                          style={{ width: `${rate}%` }}
                        ></div>
                      </div>
                      <span className="text-glass-foreground text-sm font-medium">{rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-4">Weekly Attendance Trend</h2>
              <div className="space-y-3">
                {attendanceStats.attendanceTrends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                    <span className="text-glass-foreground">{trend.date}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-glass rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success rounded-full"
                          style={{ width: `${trend.rate}%` }}
                        ></div>
                      </div>
                      <span className="text-glass-foreground text-sm font-medium">{trend.rate}%</span>
                      {index > 0 && (
                        <div className="ml-2">
                          {trend.rate > attendanceStats.attendanceTrends[index - 1].rate ? (
                            <TrendingUp size={14} className="text-success" />
                          ) : trend.rate < attendanceStats.attendanceTrends[index - 1].rate ? (
                            <TrendingDown size={14} className="text-destructive" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="quizzes">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-4">Quiz Performance</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 glass rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {quizStats.totalQuizzes}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Quizzes</div>
                  </div>

                  <div className="text-center p-4 glass rounded-lg">
                    <div className="text-2xl font-bold text-accent mb-1">
                      {quizStats.completedSubmissions}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                </div>

                <div className="text-center p-4 glass rounded-lg">
                  <div className="text-3xl font-bold text-success mb-1">
                    {quizStats.averageScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">Average Score</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-4">Score Distribution</h2>
              <div className="space-y-3">
                {quizStats.scoreDistribution.map((dist, index) => (
                  <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                    <span className="text-glass-foreground">{dist.range}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 h-2 bg-glass rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-secondary rounded-full"
                          style={{ 
                            width: `${quizStats.completedSubmissions > 0 ? (dist.count / quizStats.completedSubmissions) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-glass-foreground text-sm font-medium">{dist.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};