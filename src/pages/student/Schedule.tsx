import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, MapPin, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/database';

interface ScheduleItem {
  id: number;
  courseName: string;
  courseCode: string;
  instructorName: string;
  day: string;
  startTime: string;
  endTime: string;
  location: string;
  type: 'lecture' | 'lab' | 'tutorial';
}

export const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [weeklySchedule, setWeeklySchedule] = useState<{ [key: string]: ScheduleItem[] }>({});
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    generateWeeklySchedule();
  }, [user, currentWeek]);

  const generateWeeklySchedule = async () => {
    if (!user?.id) return;

    try {
      const enrollments = await db.courseEnrollments.where('studentId').equals(user.id).toArray();
      const schedule: { [key: string]: ScheduleItem[] } = {
        'Monday': [],
        'Tuesday': [],
        'Wednesday': [],
        'Thursday': [],
        'Friday': [],
        'Saturday': [],
        'Sunday': []
      };

      for (const enrollment of enrollments) {
        const course = await db.courses.get(enrollment.courseId);
        const instructor = course ? await db.users.get(course.instructorId) : null;
        
        if (!course || !instructor) continue;

        // Generate standard university schedule for each course
        const scheduleItems = generateCourseSchedule(course, instructor);
        
        scheduleItems.forEach(item => {
          if (schedule[item.day]) {
            schedule[item.day].push(item);
          }
        });
      }

      // Sort each day's schedule by time
      Object.keys(schedule).forEach(day => {
        schedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
      });

      setWeeklySchedule(schedule);
    } catch (error) {
      console.error('Error generating schedule:', error);
    }
  };

  const generateCourseSchedule = (course: any, instructor: any): ScheduleItem[] => {
    const items: ScheduleItem[] = [];
    const courseLevel = parseInt(course.code.match(/\d+/)?.[0] || '100');
    
    // Generate realistic university schedule based on course level and type
    const timeSlots = [
      { start: '08:00', end: '09:30' },
      { start: '10:00', end: '11:30' },
      { start: '12:00', end: '13:30' },
      { start: '14:00', end: '15:30' },
      { start: '16:00', end: '17:30' }
    ];

    const rooms = ['A-101', 'B-205', 'C-312', 'Lab-1', 'Lab-2', 'Tutorial-A'];
    
    // Most courses have 2-3 sessions per week
    const sessionCount = courseLevel >= 300 ? 2 : 3;
    const days = ['Monday', 'Wednesday', 'Friday', 'Tuesday', 'Thursday'];
    
    for (let i = 0; i < sessionCount; i++) {
      const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      const day = days[i % days.length];
      
      let type: 'lecture' | 'lab' | 'tutorial' = 'lecture';
      if (course.name.toLowerCase().includes('lab') || room.includes('Lab')) {
        type = 'lab';
      } else if (i === sessionCount - 1 && sessionCount > 2) {
        type = 'tutorial';
      }

      items.push({
        id: course.id * 100 + i,
        courseName: course.name,
        courseCode: course.code,
        instructorName: `${instructor.firstName} ${instructor.lastName}`,
        day,
        startTime: timeSlot.start,
        endTime: timeSlot.end,
        location: room,
        type
      });
    }

    return items;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture':
        return 'bg-primary text-primary-foreground';
      case 'lab':
        return 'bg-accent text-accent-foreground';
      case 'tutorial':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
            <h1 className="text-3xl font-bold text-gradient">My Schedule</h1>
            <p className="text-muted-foreground mt-1">Your weekly class timetable</p>
          </div>
        </div>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {daysOfWeek.map((day) => (
          <GlassCard key={day} variant="intense" className="min-h-[400px]">
            <div className="text-center mb-4">
              <h3 className="font-semibold text-glass-foreground">{day}</h3>
              <div className="h-1 w-12 bg-gradient-primary rounded-full mx-auto mt-2"></div>
            </div>
            
            <div className="space-y-3">
              {weeklySchedule[day]?.map((item) => (
                <div key={item.id} className="p-3 glass rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getTypeColor(item.type)} variant="outline">
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.startTime} - {item.endTime}
                    </span>
                  </div>
                  
                  <h4 className="font-medium text-glass-foreground text-sm mb-1">
                    {item.courseCode}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {item.courseName}
                  </p>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <User size={12} className="mr-1" />
                      {item.instructorName}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <MapPin size={12} className="mr-1" />
                      {item.location}
                    </div>
                  </div>
                </div>
              ))}
              
              {(!weeklySchedule[day] || weeklySchedule[day].length === 0) && (
                <div className="text-center py-8">
                  <Calendar size={32} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No classes</p>
                </div>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Schedule Summary */}
      <div className="mt-8">
        <GlassCard variant="intense">
          <h2 className="text-xl font-semibold text-glass-foreground mb-4">
            Weekly Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 glass rounded-lg">
              <div className="text-2xl font-bold text-primary mb-1">
                {Object.values(weeklySchedule).flat().filter(item => item.type === 'lecture').length}
              </div>
              <div className="text-sm text-muted-foreground">Lectures</div>
            </div>
            
            <div className="text-center p-4 glass rounded-lg">
              <div className="text-2xl font-bold text-accent mb-1">
                {Object.values(weeklySchedule).flat().filter(item => item.type === 'lab').length}
              </div>
              <div className="text-sm text-muted-foreground">Labs</div>
            </div>
            
            <div className="text-center p-4 glass rounded-lg">
              <div className="text-2xl font-bold text-secondary mb-1">
                {Object.values(weeklySchedule).flat().filter(item => item.type === 'tutorial').length}
              </div>
              <div className="text-sm text-muted-foreground">Tutorials</div>
            </div>
            
            <div className="text-center p-4 glass rounded-lg">
              <div className="text-2xl font-bold text-success mb-1">
                {Object.values(weeklySchedule).flat().length}
              </div>
              <div className="text-sm text-muted-foreground">Total Classes</div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};