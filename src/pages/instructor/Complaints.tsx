import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MessageSquare, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, Message, User } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

interface ComplaintWithUser extends Message {
  senderName: string;
  senderRole: string;
}

export const Complaints: React.FC = () => {
  const { user } = useAuth();
  const [studentComplaints, setStudentComplaints] = useState<ComplaintWithUser[]>([]);
  const [adminComplaints, setAdminComplaints] = useState<ComplaintWithUser[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintWithUser | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadComplaints();
  }, [user]);

  const loadComplaints = async () => {
    if (!user?.id) return;

    try {
      // Get all complaints sent to this instructor
      const complaints = await db.messages
        .where('receiverId').equals(user.id)
        .and(msg => msg.type === 'complaint')
        .toArray();

      // Get sender information for each complaint
      const complaintsWithUsers: ComplaintWithUser[] = [];
      for (const complaint of complaints) {
        const sender = await db.users.get(complaint.senderId);
        if (sender) {
          complaintsWithUsers.push({
            ...complaint,
            senderName: `${sender.firstName} ${sender.lastName}`,
            senderRole: sender.role
          });
        }
      }

      // Separate by sender role
      const studentComps = complaintsWithUsers.filter(c => c.senderRole === 'student');
      const adminComps = complaintsWithUsers.filter(c => c.senderRole === 'admin');

      setStudentComplaints(studentComps);
      setAdminComplaints(adminComps);
    } catch (error) {
      console.error('Error loading complaints:', error);
    }
  };

  const handleViewComplaint = (complaint: ComplaintWithUser) => {
    setSelectedComplaint(complaint);
    setResponse('');
    setShowDetailsDialog(true);

    // Mark as read if it's pending
    if (complaint.status === 'pending') {
      markAsRead(complaint.id!);
    }
  };

  const markAsRead = async (complaintId: number) => {
    try {
      await db.messages.update(complaintId, {
        status: 'read',
        updatedAt: new Date().toISOString()
      });
      loadComplaints();
    } catch (error) {
      console.error('Error marking complaint as read:', error);
    }
  };

  const resolveComplaint = async () => {
    if (!selectedComplaint) return;

    setIsLoading(true);
    try {
      // Update complaint status
      await db.messages.update(selectedComplaint.id!, {
        status: 'resolved',
        updatedAt: new Date().toISOString()
      });

      // Send response if provided
      if (response.trim()) {
        await db.messages.add({
          senderId: user!.id!,
          receiverId: selectedComplaint.senderId,
          type: 'general',
          subject: `Re: ${selectedComplaint.subject}`,
          content: response,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      toast({
        title: "Complaint Resolved",
        description: "The complaint has been marked as resolved",
      });

      setShowDetailsDialog(false);
      loadComplaints();
    } catch (error) {
      console.error('Error resolving complaint:', error);
      toast({
        title: "Error",
        description: "Failed to resolve complaint",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'read':
        return <Badge variant="default">Read</Badge>;
      case 'resolved':
        return <Badge variant="default">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const ComplaintsList = ({ complaints, title }: { complaints: ComplaintWithUser[], title: string }) => (
    <GlassCard variant="intense">
      <h2 className="text-xl font-semibold text-glass-foreground mb-4 flex items-center">
        <MessageSquare className="mr-2" size={20} />
        {title} ({complaints.length})
      </h2>
      <div className="space-y-3">
        {complaints.map((complaint) => (
          <div key={complaint.id} className="p-4 glass rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-glass-foreground text-sm">
                    {complaint.subject}
                  </h3>
                  {getStatusBadge(complaint.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  From: {complaint.senderName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(complaint.createdAt).toLocaleDateString()} at{' '}
                  {new Date(complaint.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewComplaint(complaint)}
              >
                <Eye size={14} />
                View
              </Button>
            </div>
            <p className="text-sm text-glass-foreground line-clamp-2">
              {complaint.content}
            </p>
          </div>
        ))}
        {complaints.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare size={48} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No complaints in this category</p>
          </div>
        )}
      </div>
    </GlassCard>
  );

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
            <h1 className="text-3xl font-bold text-gradient">Complaints</h1>
            <p className="text-muted-foreground mt-1">Manage complaints from students and admin</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="students" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="students" className="flex items-center space-x-2">
            <MessageSquare size={16} />
            <span>Student Complaints ({studentComplaints.length})</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center space-x-2">
            <MessageSquare size={16} />
            <span>Admin Complaints ({adminComplaints.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <ComplaintsList complaints={studentComplaints} title="Student Complaints" />
        </TabsContent>

        <TabsContent value="admin">
          <ComplaintsList complaints={adminComplaints} title="Admin Complaints" />
        </TabsContent>
      </Tabs>

      {/* Complaint Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="glass border-glass-border/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-glass-foreground">
              Complaint Details
            </DialogTitle>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-glass-foreground">From</label>
                  <p className="text-muted-foreground">{selectedComplaint.senderName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedComplaint.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Subject</label>
                  <p className="text-muted-foreground">{selectedComplaint.subject}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Date</label>
                  <p className="text-muted-foreground">
                    {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-glass-foreground">Message</label>
                <div className="mt-2 p-3 glass rounded-lg">
                  <p className="text-glass-foreground whitespace-pre-wrap">
                    {selectedComplaint.content}
                  </p>
                </div>
              </div>

              {selectedComplaint.status !== 'resolved' && (
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Response (Optional)</label>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Type your response here..."
                    className="glass border-glass-border/30 bg-glass/5 text-glass-foreground mt-2"
                    rows={4}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                {selectedComplaint.status !== 'resolved' && (
                  <Button
                    variant="primary"
                    onClick={resolveComplaint}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Mark as Resolved
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};