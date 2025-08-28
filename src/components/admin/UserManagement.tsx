import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db, User, Message, Ban } from '@/lib/database';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Ban as BanIcon, 
  Eye, 
  Trash2,
  ArrowLeft,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserWithDetails extends User {
  coursesCreated?: number;
  sessionsHeld?: number;
}

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [students, setStudents] = useState<UserWithDetails[]>([]);
  const [instructors, setInstructors] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await db.users.toArray();
      
      const studentList = allUsers.filter(u => u.role === 'student');
      const instructorList = allUsers.filter(u => u.role === 'instructor');

      // Add additional details for instructors
      const instructorsWithDetails = await Promise.all(
        instructorList.map(async (instructor) => {
          const coursesCreated = await db.courses.where('instructorId').equals(instructor.id!).count();
          const sessionsHeld = await db.classSessions
            .where('instructorId')
            .equals(instructor.id!)
            .and(session => {
              const sessionDate = new Date(session.date);
              const threeMonthsAgo = new Date();
              threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
              return sessionDate >= threeMonthsAgo;
            })
            .count();

          return {
            ...instructor,
            coursesCreated,
            sessionsHeld
          };
        })
      );

      setStudents(studentList);
      setInstructors(instructorsWithDetails);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const approveInstructor = async (instructorId: number) => {
    try {
      await db.users.update(instructorId, { 
        isApproved: true,
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: "Instructor Approved",
        description: "The instructor has been approved successfully",
      });
      
      loadUsers();
    } catch (error) {
      console.error('Error approving instructor:', error);
      toast({
        title: "Error",
        description: "Failed to approve instructor",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedUser || !messageContent.trim()) return;

    try {
      await db.messages.add({
        senderId: currentUser!.id!,
        receiverId: selectedUser.id!,
        type: 'general',
        subject: 'Message from Admin',
        content: messageContent,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Message Sent",
        description: `Message sent to ${selectedUser.firstName} ${selectedUser.lastName}`,
      });

      setMessageContent('');
      setShowMessageDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const banUser = async (userId: number, userName: string) => {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6); // 6 hour ban

      await db.bans.add({
        userId,
        bannedBy: currentUser!.id!,
        reason: 'Administrative action',
        expiresAt: expiresAt.toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "User Banned",
        description: `${userName} has been banned for 6 hours`,
      });
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await db.transaction('rw', [
        db.users, 
        db.attendanceRecords, 
        db.quizSubmissions, 
        db.messages, 
        db.courseEnrollments, 
        db.bans,
        db.courses,
        db.classSessions
      ], async () => {
        // Delete related records
        await db.attendanceRecords.where('studentId').equals(userId).delete();
        await db.quizSubmissions.where('studentId').equals(userId).delete();
        await db.messages.where('senderId').equals(userId).delete();
        await db.messages.where('receiverId').equals(userId).delete();
        await db.courseEnrollments.where('studentId').equals(userId).delete();
        await db.bans.where('userId').equals(userId).delete();
        
        // For instructors, also delete their courses and sessions
        await db.courses.where('instructorId').equals(userId).delete();
        await db.classSessions.where('instructorId').equals(userId).delete();
        
        // Delete user
        await db.users.delete(userId);
      });

      toast({
        title: "User Deleted",
        description: `${userName} has been deleted successfully`,
      });

      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName} ${student.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInstructors = instructors.filter(instructor =>
    `${instructor.firstName} ${instructor.lastName} ${instructor.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingInstructors = filteredInstructors.filter(i => !i.isApproved);
  const approvedInstructors = filteredInstructors.filter(i => i.isApproved);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8 flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <span className="text-glass-foreground">Loading users...</span>
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
            <h1 className="text-3xl font-bold text-gradient">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage students and instructors</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass border-glass-border/30 bg-glass/5"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="instructors" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="instructors" className="flex items-center space-x-2">
            <GraduationCap size={16} />
            <span>Instructors ({instructors.length})</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center space-x-2">
            <Users size={16} />
            <span>Students ({students.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Instructors Tab */}
        <TabsContent value="instructors" className="space-y-6">
          {/* Pending Instructors */}
          <GlassCard variant="intense">
            <h2 className="text-xl font-semibold text-glass-foreground mb-4 flex items-center">
              <XCircle className="mr-2 text-warning" size={20} />
              Pending Approval ({pendingInstructors.length})
            </h2>
            <div className="space-y-3">
              {pendingInstructors.map((instructor) => (
                <div key={instructor.id} className="flex items-center justify-between p-4 glass rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-glass-foreground">
                      {instructor.firstName} {instructor.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{instructor.email}</p>
                    <p className="text-sm text-muted-foreground">Department: {instructor.department}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => approveInstructor(instructor.id!)}
                    >
                      <CheckCircle size={14} />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(instructor);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <Eye size={14} />
                      Details
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteUser(instructor.id!, `${instructor.firstName} ${instructor.lastName}`)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {pendingInstructors.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No pending instructors</p>
              )}
            </div>
          </GlassCard>

          {/* Approved Instructors */}
          <GlassCard variant="intense">
            <h2 className="text-xl font-semibold text-glass-foreground mb-4 flex items-center">
              <CheckCircle className="mr-2 text-success" size={20} />
              Approved Instructors ({approvedInstructors.length})
            </h2>
            <div className="space-y-3">
              {approvedInstructors.map((instructor) => (
                <div key={instructor.id} className="flex items-center justify-between p-4 glass rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-glass-foreground">
                        {instructor.firstName} {instructor.lastName}
                      </h3>
                      <Badge variant="default">Approved</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{instructor.email}</p>
                    <p className="text-sm text-muted-foreground">Department: {instructor.department}</p>
                    <div className="flex space-x-4 mt-2">
                      <span className="text-xs text-muted-foreground">
                        Courses: {instructor.coursesCreated || 0}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Sessions (3mo): {instructor.sessionsHeld || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(instructor);
                        setShowMessageDialog(true);
                      }}
                    >
                      <MessageSquare size={14} />
                      Message
                    </Button>
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => banUser(instructor.id!, `${instructor.firstName} ${instructor.lastName}`)}
                    >
                      <BanIcon size={14} />
                      Ban 6h
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(instructor);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <Eye size={14} />
                      Details
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteUser(instructor.id!, `${instructor.firstName} ${instructor.lastName}`)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {approvedInstructors.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No approved instructors</p>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <GlassCard variant="intense">
            <h2 className="text-xl font-semibold text-glass-foreground mb-4 flex items-center">
              <Users className="mr-2 text-primary" size={20} />
              All Students ({filteredStudents.length})
            </h2>
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 glass rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-glass-foreground">
                      {student.firstName} {student.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                    <p className="text-sm text-muted-foreground">Department: {student.department}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(student);
                        setShowMessageDialog(true);
                      }}
                    >
                      <MessageSquare size={14} />
                      Message
                    </Button>
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => banUser(student.id!, `${student.firstName} ${student.lastName}`)}
                    >
                      <BanIcon size={14} />
                      Ban 6h
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(student);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <Eye size={14} />
                      Details
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteUser(student.id!, `${student.firstName} ${student.lastName}`)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {filteredStudents.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No students found</p>
              )}
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="glass border-glass-border/30">
          <DialogHeader>
            <DialogTitle className="text-glass-foreground">
              Send Message to {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Type your message here..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
              rows={4}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={sendMessage} disabled={!messageContent.trim()}>
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="glass border-glass-border/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-glass-foreground">
              User Details - {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Name</label>
                  <p className="text-muted-foreground">{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Email</label>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Role</label>
                  <p className="text-muted-foreground capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Department</label>
                  <p className="text-muted-foreground">{selectedUser.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Status</label>
                  <Badge variant={selectedUser.isApproved ? "default" : "secondary"}>
                    {selectedUser.isApproved ? "Approved" : "Pending"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Joined</label>
                  <p className="text-muted-foreground">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {selectedUser.role === 'instructor' && (
                <div className="border-t border-glass-border/20 pt-4">
                  <h3 className="text-lg font-semibold text-glass-foreground mb-2">Instructor Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-glass-foreground">Courses Created</label>
                      <p className="text-muted-foreground">{selectedUser.coursesCreated || 0}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-glass-foreground">Sessions (Last 3 Months)</label>
                      <p className="text-muted-foreground">{selectedUser.sessionsHeld || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};