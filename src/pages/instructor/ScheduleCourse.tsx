import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, Save } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db, Course } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

export const ScheduleCourse: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    lecturerName: `${user?.firstName} ${user?.lastName}` || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    if (!user?.id) return;
    
    try {
      // Only load courses created by this instructor
      const instructorCourses = await db.courses
        .where('instructorId')
        .equals(user.id)
        .toArray();
      setCourses(instructorCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCourseChange = (courseId: string) => {
    const selectedCourse = courses.find(c => c.id?.toString() === courseId);
    setFormData(prev => ({
      ...prev,
      courseId,
      title: selectedCourse ? `${selectedCourse.name} - Class Session` : ''
    }));
  };

  const handleSchedule = async () => {
    if (!formData.courseId || !formData.title || !formData.date || !formData.startTime || !formData.endTime || !formData.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate time
    if (formData.startTime >= formData.endTime) {
      toast({
        title: "Invalid Time",
        description: "End time must be after start time",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create class session
      await db.classSessions.add({
        courseId: parseInt(formData.courseId),
        instructorId: user!.id!,
        title: formData.title,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        checkInMethod: 'qr',
        attendanceZone: {
          // Default attendance zone - can be customized later
          latitude: 0,
          longitude: 0,
          radius: 100
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Get enrolled students for this course
      const enrolledStudents = await db.courseEnrollments
        .where('courseId').equals(parseInt(formData.courseId))
        .toArray();

      // Send notification to all enrolled students (via messages)
      const course = courses.find(c => c.id?.toString() === formData.courseId);
      for (const enrollment of enrolledStudents) {
        await db.messages.add({
          senderId: user!.id!,
          receiverId: enrollment.studentId,
          type: 'general',
          subject: 'New Class Scheduled',
          content: `A new class has been scheduled for ${course?.name}.\n\nDetails:\nDate: ${formData.date}\nTime: ${formData.startTime} - ${formData.endTime}\nLocation: ${formData.location}\nInstructor: ${formData.lecturerName}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      toast({
        title: "Class Scheduled",
        description: `${formData.title} has been scheduled successfully and students have been notified`,
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error scheduling class:', error);
      toast({
        title: "Error",
        description: "Failed to schedule class",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate time options
  const timeOptions = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
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
            <h1 className="text-3xl font-bold text-gradient">Schedule Course</h1>
            <p className="text-muted-foreground mt-1">Schedule a new class session for your students</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <GlassCard variant="intense" size="lg">
          <div className="flex items-center mb-6">
            <div className="p-3 rounded-xl bg-gradient-primary text-primary-foreground mr-4">
              <Calendar size={24} />
            </div>
            <h2 className="text-xl font-semibold text-glass-foreground">Class Details</h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course" className="text-glass-foreground font-medium">Course *</Label>
                <Select value={formData.courseId} onValueChange={handleCourseChange}>
                  <SelectTrigger className="glass border-glass-border/30 bg-glass/5 text-glass-foreground">
                    <SelectValue placeholder={courses.length > 0 ? "Select course" : "No courses available - Create a course first"} />
                  </SelectTrigger>
                  <SelectContent className="glass border-glass-border/30 bg-glass text-glass-foreground">
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id!.toString()}>
                        {course.name} ({course.code})
                      </SelectItem>
                    ))}
                    {courses.length === 0 && (
                      <SelectItem value="no-courses" disabled>
                        No courses available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {courses.length === 0 && (
                  <p className="text-sm text-warning mt-1">
                    You need to create a course first before scheduling sessions.{' '}
                    <Link to="/instructor/create-course" className="underline">
                      Create Course
                    </Link>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-glass-foreground font-medium">Session Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter session title"
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-glass-foreground font-medium">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-glass-foreground font-medium">Start Time *</Label>
                <Select value={formData.startTime} onValueChange={(value) => handleInputChange('startTime', value)}>
                  <SelectTrigger className="glass border-glass-border/30 bg-glass/5 text-glass-foreground">
                    <SelectValue placeholder="Start time" />
                  </SelectTrigger>
                  <SelectContent className="glass border-glass-border/30 bg-glass text-glass-foreground">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-glass-foreground font-medium">End Time *</Label>
                <Select value={formData.endTime} onValueChange={(value) => handleInputChange('endTime', value)}>
                  <SelectTrigger className="glass border-glass-border/30 bg-glass/5 text-glass-foreground">
                    <SelectValue placeholder="End time" />
                  </SelectTrigger>
                  <SelectContent className="glass border-glass-border/30 bg-glass text-glass-foreground">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location" className="text-glass-foreground font-medium">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Room A-101, Lab B-205"
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lecturer" className="text-glass-foreground font-medium">Lecturer Name</Label>
                <Input
                  id="lecturer"
                  value={formData.lecturerName}
                  onChange={(e) => handleInputChange('lecturerName', e.target.value)}
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                />
              </div>
            </div>

            <div className="border-t border-glass-border/20 pt-6">
              <div className="flex justify-end space-x-3">
                <Link to="/dashboard">
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button
                  variant="primary"
                  onClick={handleSchedule}
                  disabled={isLoading || courses.length === 0}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <>
                      <Save size={16} />
                      Schedule Class
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};