import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Edit, User, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

export const StudentProfile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [instructors, setInstructors] = useState<any[]>([]);

  useEffect(() => {
    loadInstructors();
  }, [user]);

  const loadInstructors = async () => {
    if (!user?.id) return;

    try {
      // Get instructors from enrolled courses
      const enrollments = await db.courseEnrollments.where('studentId').equals(user.id).toArray();
      const instructorIds = new Set<number>();
      
      for (const enrollment of enrollments) {
        const course = await db.courses.get(enrollment.courseId);
        if (course) {
          instructorIds.add(course.instructorId);
        }
      }

      const instructorList = await Promise.all(
        Array.from(instructorIds).map(id => db.users.get(id))
      );

      setInstructors(instructorList.filter(Boolean));
    } catch (error) {
      console.error('Error loading instructors:', error);
    }
  };

  const handleEditRequest = () => {
    setEditReason('');
    setShowEditRequestDialog(true);
  };

  const submitEditRequest = async () => {
    if (!editReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for editing your profile",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Send edit request to all instructors
      for (const instructor of instructors) {
        await db.messages.add({
          senderId: user!.id!,
          receiverId: instructor.id!,
          type: 'profile_edit_request',
          subject: 'Profile Edit Request',
          content: editReason,
          status: 'pending',
          metadata: {
            studentId: user!.id,
            requestedAt: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // Also send to admin
      const admin = await db.users.where('role').equals('admin').first();
      if (admin) {
        await db.messages.add({
          senderId: user!.id!,
          receiverId: admin.id!,
          type: 'profile_edit_request',
          subject: 'Student Profile Edit Request',
          content: `Student: ${user!.firstName} ${user!.lastName} (${user!.email})\n\nReason for edit request:\n${editReason}`,
          status: 'pending',
          metadata: {
            studentId: user!.id,
            requestedAt: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      toast({
        title: "Edit Request Sent",
        description: "Your profile edit request has been sent to your instructors for approval",
      });

      setShowEditRequestDialog(false);
      setEditReason('');
    } catch (error) {
      console.error('Error submitting edit request:', error);
      toast({
        title: "Error",
        description: "Failed to submit edit request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8 flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <span className="text-glass-foreground">Loading...</span>
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
            <h1 className="text-3xl font-bold text-gradient">My Profile</h1>
            <p className="text-muted-foreground mt-1">View and manage your account information</p>
          </div>
        </div>
        <Button variant="primary" onClick={handleEditRequest}>
          <Edit size={16} />
          Request Edit
        </Button>
      </div>

      {/* Profile Card */}
      <div className="max-w-2xl mx-auto">
        <GlassCard variant="intense" size="lg">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-16 w-16 bg-gradient-primary rounded-2xl flex items-center justify-center">
              <User size={32} className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-glass-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-muted-foreground">Student</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-glass-foreground font-medium">First Name</Label>
                <Input
                  value={user.firstName}
                  disabled
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-glass-foreground font-medium">Last Name</Label>
                <Input
                  value={user.lastName}
                  disabled
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-glass-foreground font-medium">Email Address</Label>
              <Input
                value={user.email}
                disabled
                className="glass border-glass-border/30 bg-glass/5 text-glass-foreground disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-glass-foreground font-medium">Department</Label>
              <Input
                value={user.department || 'Not specified'}
                disabled
                className="glass border-glass-border/30 bg-glass/5 text-glass-foreground disabled:opacity-60"
              />
            </div>

            <div className="border-t border-glass-border/20 pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-glass-foreground font-medium">Account Created</label>
                  <p className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-glass-foreground font-medium">Last Updated</label>
                  <p className="text-muted-foreground">
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <p className="text-sm text-warning">
                <strong>Note:</strong> To edit your profile information, you need approval from your instructors. 
                Click "Request Edit" to send a request with your reason for the changes.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Edit Request Dialog */}
      <Dialog open={showEditRequestDialog} onOpenChange={setShowEditRequestDialog}>
        <DialogContent className="glass border-glass-border/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-glass-foreground">
              Request Profile Edit Permission
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 glass rounded-lg">
              <h3 className="font-semibold text-glass-foreground mb-2">Current Profile</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="text-glass-foreground">{user.firstName} {user.lastName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="text-glass-foreground">{user.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <p className="text-glass-foreground">{user.department}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editReason" className="text-glass-foreground font-medium">
                Reason for Edit Request *
              </Label>
              <Textarea
                id="editReason"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Please explain why you need to edit your profile. Include specific details about what information needs to be changed and why..."
                className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                rows={5}
              />
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-primary">
                Your request will be sent to all your course instructors and the admin for approval.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditRequestDialog(false);
                  setEditReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={submitEditRequest}
                disabled={isLoading || !editReason.trim()}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    <MessageSquare size={16} />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};