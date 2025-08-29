import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, BookOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

interface CourseTemplate {
  id: string;
  name: string;
  code: string;
  description: string;
  credits: number;
  department: string;
}

export const CreateCourse: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [availableCourses, setAvailableCourses] = useState<CourseTemplate[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseTemplate | null>(null);
  const [customDetails, setCustomDetails] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAvailableCourses();
  }, [user]);

  const loadAvailableCourses = async () => {
    if (!user?.department) {
      // If no department is set, show a generic message
      setAvailableCourses([]);
      return;
    }

    // Generate standard university courses based on instructor's department
    const courseTemplates: CourseTemplate[] = [];
    
    switch (user.department) {
      case 'Computer Science':
        courseTemplates.push(
          { id: 'cs101', name: 'Introduction to Programming', code: 'CS-101', description: 'Basic programming concepts and problem-solving techniques', credits: 3, department: 'Computer Science' },
          { id: 'cs201', name: 'Data Structures and Algorithms', code: 'CS-201', description: 'Fundamental data structures and algorithmic techniques', credits: 4, department: 'Computer Science' },
          { id: 'cs301', name: 'Database Systems', code: 'CS-301', description: 'Database design, implementation, and management', credits: 3, department: 'Computer Science' },
          { id: 'cs401', name: 'Software Engineering', code: 'CS-401', description: 'Software development methodologies and project management', credits: 4, department: 'Computer Science' },
          { id: 'cs501', name: 'Machine Learning', code: 'CS-501', description: 'Introduction to machine learning algorithms and applications', credits: 3, department: 'Computer Science' }
        );
        break;
      case 'Engineering':
        courseTemplates.push(
          { id: 'eng101', name: 'Engineering Mathematics I', code: 'ENG-101', description: 'Calculus and linear algebra for engineers', credits: 4, department: 'Engineering' },
          { id: 'eng201', name: 'Thermodynamics', code: 'ENG-201', description: 'Principles of thermodynamics and heat transfer', credits: 3, department: 'Engineering' },
          { id: 'eng301', name: 'Fluid Mechanics', code: 'ENG-301', description: 'Fluid statics and dynamics', credits: 3, department: 'Engineering' },
          { id: 'eng401', name: 'Control Systems', code: 'ENG-401', description: 'Analysis and design of control systems', credits: 4, department: 'Engineering' }
        );
        break;
      case 'Business Administration':
        courseTemplates.push(
          { id: 'bus101', name: 'Principles of Management', code: 'BUS-101', description: 'Fundamentals of business management', credits: 3, department: 'Business Administration' },
          { id: 'bus201', name: 'Marketing Fundamentals', code: 'BUS-201', description: 'Basic marketing concepts and strategies', credits: 3, department: 'Business Administration' },
          { id: 'bus301', name: 'Financial Management', code: 'BUS-301', description: 'Corporate finance and investment decisions', credits: 4, department: 'Business Administration' },
          { id: 'bus401', name: 'Strategic Management', code: 'BUS-401', description: 'Strategic planning and competitive analysis', credits: 3, department: 'Business Administration' }
        );
        break;
      default:
        courseTemplates.push(
          { id: 'gen101', name: 'Introduction to ' + user.department, code: 'GEN-101', description: 'Foundational concepts in ' + user.department, credits: 3, department: user.department },
          { id: 'gen201', name: 'Intermediate ' + user.department, code: 'GEN-201', description: 'Intermediate level concepts and applications', credits: 3, department: user.department },
          { id: 'gen301', name: 'Advanced ' + user.department, code: 'GEN-301', description: 'Advanced topics and research methods', credits: 4, department: user.department }
        );
    }

    setAvailableCourses(courseTemplates);
  };

  const handleCourseSelect = (course: CourseTemplate) => {
    setSelectedCourse(course);
    setCustomDetails({
      name: course.name,
      code: course.code,
      description: course.description
    });
  };

  const handleCreateCourse = async () => {
    if (!customDetails.name || !customDetails.code || !user?.id) {
      toast({
        title: "Missing Information",
        description: "Please fill in course name and code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Check if course already exists
      const existingCourse = await db.courses
        .where('code').equals(customDetails.code)
        .first();

      if (existingCourse) {
        toast({
          title: "Course Exists",
          description: "A course with this code already exists",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Create the course
      await db.courses.add({
        name: customDetails.name,
        code: customDetails.code,
        description: customDetails.description,
        instructorId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Course Created",
        description: `${customDetails.name} has been created successfully`,
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: "Failed to create course",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
            <h1 className="text-3xl font-bold text-gradient">Create Course</h1>
            <p className="text-muted-foreground mt-1">Select from available courses for your department</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Courses */}
        <GlassCard variant="intense">
          <h2 className="text-xl font-semibold text-glass-foreground mb-4">
            Available Courses - {user?.department}
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availableCourses.map((course) => (
              <div
                key={course.id}
                className={`p-4 glass rounded-lg cursor-pointer transition-all ${
                  selectedCourse?.id === course.id ? 'border-primary border-2' : ''
                }`}
                onClick={() => handleCourseSelect(course)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-glass-foreground">{course.name}</h3>
                    <p className="text-sm text-primary font-medium">{course.code}</p>
                    <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">Credits: {course.credits}</p>
                  </div>
                  <BookOpen size={20} className="text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Course Details */}
        <GlassCard variant="intense">
          <h2 className="text-xl font-semibold text-glass-foreground mb-4">
            Course Details
          </h2>
          {selectedCourse ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="courseName" className="text-glass-foreground font-medium">
                  Course Name
                </Label>
                <Input
                  id="courseName"
                  value={customDetails.name}
                  onChange={(e) => setCustomDetails(prev => ({ ...prev, name: e.target.value }))}
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseCode" className="text-glass-foreground font-medium">
                  Course Code
                </Label>
                <Input
                  id="courseCode"
                  value={customDetails.code}
                  onChange={(e) => setCustomDetails(prev => ({ ...prev, code: e.target.value }))}
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseDescription" className="text-glass-foreground font-medium">
                  Description
                </Label>
                <Textarea
                  id="courseDescription"
                  value={customDetails.description}
                  onChange={(e) => setCustomDetails(prev => ({ ...prev, description: e.target.value }))}
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                  rows={4}
                />
              </div>

              <Button
                variant="primary"
                onClick={handleCreateCourse}
                disabled={isLoading || !customDetails.name || !customDetails.code}
                className="w-full"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    <Plus size={16} />
                    Create Course
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select a course from the list to customize and create</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};