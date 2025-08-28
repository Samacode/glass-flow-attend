import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, BarChart3, MessageSquare, Trophy, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

interface CourseProgress {
  courseId: number;
  courseName: string;
  courseCode: string;
  instructorName: string;
  instructorId: number;
  grade: string;
  attendanceRate: number;
  quizzesCompleted: number;
  totalQuizzes: number;
  averageQuizScore: number;
}

export const Progress: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseProgress | null>(null);
  const [showComplaintDialog, setShowComplaintDialog] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintContent, setComplaintContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadProgressData();
  }, [user]);

  const loadProgressData = async () => {
    if (!user?.id) return;

    try {
      const enrollments = await db.courseEnrollments.where('studentId').equals(user.id).toArray();
      
      const progressData: CourseProgress[] = [];
      
      for (const enrollment of enrollments) {
        const course = await db.courses.get(enrollment.courseId);
        const instructor = course ? await db.users.get(course.instructorId) : null;
        
        if (!course || !instructor) continue;

        // Calculate attendance rate
        const sessions = await db.classSessions.where('courseId').equals(course.id!).toArray();
        const sessionIds = sessions.map(s => s.id!);
        
        const attendanceRecords = await db.attendanceRecords
          .where('studentId').equals(user.id)
          .and(record => sessionIds.includes(record.sessionId))
          .toArray();
        
        const presentRecords = attendanceRecords.filter(record => record.status === 'present');
        const attendanceRate = attendanceRecords.length > 0 ? 
          Math.round((presentRecords.length / attendanceRecords.length) * 100) : 0;

        // Get quiz data
        const quizzes = await db.quizzes.where('instructorId').equals(instructor.id!).toArray();
        const courseQuizzes = quizzes.filter(quiz => {
          const session = sessions.find(s => s.id === quiz.sessionId);
          return session && session.courseId === course.id;
        });

        const quizSubmissions = await db.quizSubmissions
          .where('studentId').equals(user.id)
          .and(submission => {
            return courseQuizzes.some(quiz => quiz.id === submission.quizId);
          })
          .toArray();

        const completedQuizzes = quizSubmissions.filter(sub => sub.isCompleted);
        const averageScore = completedQuizzes.length > 0 ?
          Math.round(completedQuizzes.reduce((sum, quiz) => 
            sum + ((quiz.totalScore || 0) / quiz.maxScore * 100), 0) / completedQuizzes.length) : 0;

        progressData.push({
          courseId: course.id!,
          courseName: course.name,
          courseCode: course.code,
          instructorName: `${instructor.firstName} ${instructor.lastName}`,
          instructorId: instructor.id!,
          grade: enrollment.grade || 'N/A',
          attendanceRate,
          quizzesCompleted: completedQuizzes.length,
          totalQuizzes: courseQuizzes.length,
          averageQuizScore: averageScore
        });
      }

      setCourses(progressData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  };

  const handleComplaint = (course: CourseProgress) => {
    setSelectedCourse(course);
    setComplaintSubject(`Grade Complaint - ${course.courseName}`);
    setComplaintContent('');
    setShowComplaintDialog(true);
  };

  const submitComplaint = async () => {
    if (!selectedCourse || !complaintContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for your complaint",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Send complaint to instructor
      await db.messages.add({
        senderId: user!.id!,
        receiverId: selectedCourse.instructorId,
        type: 'complaint',
        subject: complaintSubject,
        content: complaintContent,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Also send to admin (assuming admin has ID 1)
      const admin = await db.users.where('role').equals('admin').first();
      if (admin) {
        await db.messages.add({
          senderId: user!.id!,
          receiverId: admin.id!,
          type: 'complaint',
          subject: `Student Complaint - ${complaintSubject}`,
          content: `Student: ${user!.firstName} ${user!.lastName}\nCourse: ${selectedCourse.courseName}\nInstructor: ${selectedCourse.instructorName}\n\nComplaint:\n${complaintContent}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      toast({
        title: "Complaint Submitted",
        description: "Your complaint has been sent to the instructor and admin",
      });

      setShowComplaintDialog(false);
      setSelectedCourse(null);
      setComplaintContent('');
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast({
        title: "Error",
        description: "Failed to submit complaint",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeBadge = (grade: string) => {
    if (grade === 'N/A') return <Badge variant="outline">Not Graded</Badge>;
    
    const gradeValue = grade.charAt(0);
    switch (gradeValue) {
      case 'A':
        return <Badge variant="default" className="bg-success text-success-foreground">A</Badge>;
      case 'B':
        return <Badge variant="default" className="bg-primary text-primary-foreground">B</Badge>;
      case 'C':
        return <Badge variant="default" className="bg-warning text-warning-foreground">C</Badge>;
      case 'D':
        return <Badge variant="default" className="bg-destructive text-destructive-foreground">D</Badge>;
      case 'F':
        return <Badge variant="destructive">F</Badge>;
      default:
        return <Badge variant="outline">{grade}</Badge>;
    }
  };

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
            <h1 className="text-3xl font-bold text-gradient">My Progress</h1>
            <p className="text-muted-foreground mt-1">Track your academic performance and grades</p>
          </div>
        </div>
      </div>

      <GlassCard variant="intense">
        <h2 className="text-xl font-semibold text-glass-foreground mb-4 flex items-center">
          <BarChart3 className="mr-2" size={20} />
          Course Progress ({courses.length})
        </h2>
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.courseId} className="p-6 glass rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-glass-foreground">
                      {course.courseName}
                    </h3>
                    <Badge variant="outline">{course.courseCode}</Badge>
                    {getGradeBadge(course.grade)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Instructor: {course.instructorName}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 glass rounded-lg">
                      <div className="text-2xl font-bold text-glass-foreground mb-1">
                        {course.attendanceRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">Attendance Rate</div>
                    </div>
                    
                    <div className="text-center p-3 glass rounded-lg">
                      <div className="text-2xl font-bold text-glass-foreground mb-1">
                        {course.quizzesCompleted}/{course.totalQuizzes}
                      </div>
                      <div className="text-xs text-muted-foreground">Quizzes Completed</div>
                    </div>
                    
                    <div className="text-center p-3 glass rounded-lg">
                      <div className="text-2xl font-bold text-glass-foreground mb-1">
                        {course.averageQuizScore}%
                      </div>
                      <div className="text-xs text-muted-foreground">Quiz Average</div>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => handleComplaint(course)}
                >
                  <MessageSquare size={14} />
                  Complaint
                </Button>
              </div>
            </div>
          ))}
          
          {courses.length === 0 && (
            <div className="text-center py-12">
              <BookOpen size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No enrolled courses found</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Complaint Dialog */}
      <Dialog open={showComplaintDialog} onOpenChange={setShowComplaintDialog}>
        <DialogContent className="glass border-glass-border/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-glass-foreground">
              Submit Grade Complaint
            </DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              <div className="p-4 glass rounded-lg">
                <h3 className="font-semibold text-glass-foreground mb-2">Course Details</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Course:</strong> {selectedCourse.courseName} ({selectedCourse.courseCode})
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Instructor:</strong> {selectedCourse.instructorName}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Current Grade:</strong> {selectedCourse.grade}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="complaintReason" className="text-glass-foreground font-medium">
                  Reason for Complaint *
                </Label>
                <Textarea
                  id="complaintReason"
                  value={complaintContent}
                  onChange={(e) => setComplaintContent(e.target.value)}
                  placeholder="Please explain your concern about the grade. Include specific details about assignments, exams, or other factors you believe should be reconsidered..."
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                  rows={6}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowComplaintDialog(false);
                    setSelectedCourse(null);
                    setComplaintContent('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={submitComplaint}
                  disabled={isLoading || !complaintContent.trim()}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <>
                      <MessageSquare size={16} />
                      Submit Complaint
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};