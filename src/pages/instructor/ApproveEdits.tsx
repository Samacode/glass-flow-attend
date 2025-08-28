import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, UserCheck, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, Message, User } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

interface EditRequestWithUser extends Message {
  senderName: string;
  senderEmail: string;
  requestDetails?: any;
}

export const ApproveEdits: React.FC = () => {
  const { user } = useAuth();
  const [editRequests, setEditRequests] = useState<EditRequestWithUser[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EditRequestWithUser | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadEditRequests();
  }, [user]);

  const loadEditRequests = async () => {
    if (!user?.id) return;

    try {
      // Get all profile edit requests sent to this instructor
      const requests = await db.messages
        .where('receiverId').equals(user.id)
        .and(msg => msg.type === 'profile_edit_request')
        .toArray();

      // Get sender information for each request
      const requestsWithUsers: EditRequestWithUser[] = [];
      for (const request of requests) {
        const sender = await db.users.get(request.senderId);
        if (sender) {
          requestsWithUsers.push({
            ...request,
            senderName: `${sender.firstName} ${sender.lastName}`,
            senderEmail: sender.email,
            requestDetails: request.metadata
          });
        }
      }

      setEditRequests(requestsWithUsers.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error loading edit requests:', error);
    }
  };

  const handleViewRequest = (request: EditRequestWithUser) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);

    // Mark as read if it's pending
    if (request.status === 'pending') {
      markAsRead(request.id!);
    }
  };

  const markAsRead = async (requestId: number) => {
    try {
      await db.messages.update(requestId, {
        status: 'read',
        updatedAt: new Date().toISOString()
      });
      loadEditRequests();
    } catch (error) {
      console.error('Error marking request as read:', error);
    }
  };

  const approveRequest = async () => {
    if (!selectedRequest) return;

    setIsLoading(true);
    try {
      // Update request status to resolved (approved)
      await db.messages.update(selectedRequest.id!, {
        status: 'resolved',
        metadata: { ...selectedRequest.metadata, approved: true },
        updatedAt: new Date().toISOString()
      });

      // Send approval notification to student
      await db.messages.add({
        senderId: user!.id!,
        receiverId: selectedRequest.senderId,
        type: 'general',
        subject: 'Profile Edit Request Approved',
        content: `Your profile edit request has been approved. You can now edit your profile once. After saving or canceling, you will need to request approval again for future edits.`,
        status: 'pending',
        metadata: { editApproved: true, oneTimeEdit: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Request Approved",
        description: "The profile edit request has been approved and the student has been notified",
      });

      setShowDetailsDialog(false);
      loadEditRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const denyRequest = async () => {
    if (!selectedRequest) return;

    setIsLoading(true);
    try {
      // Update request status to resolved (denied)
      await db.messages.update(selectedRequest.id!, {
        status: 'resolved',
        metadata: { ...selectedRequest.metadata, approved: false },
        updatedAt: new Date().toISOString()
      });

      // Send denial notification to student
      await db.messages.add({
        senderId: user!.id!,
        receiverId: selectedRequest.senderId,
        type: 'general',
        subject: 'Profile Edit Request Denied',
        content: `Your profile edit request has been denied. If you believe this is an error, please contact your instructor or submit a new request with more details.`,
        status: 'pending',
        metadata: { editApproved: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Request Denied",
        description: "The profile edit request has been denied and the student has been notified",
      });

      setShowDetailsDialog(false);
      loadEditRequests();
    } catch (error) {
      console.error('Error denying request:', error);
      toast({
        title: "Error",
        description: "Failed to deny request",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string, metadata?: any) => {
    if (status === 'resolved') {
      if (metadata?.approved === true) {
        return <Badge variant="default">Approved</Badge>;
      } else if (metadata?.approved === false) {
        return <Badge variant="destructive">Denied</Badge>;
      }
      return <Badge variant="default">Resolved</Badge>;
    }
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'read':
        return <Badge variant="default">Under Review</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
            <h1 className="text-3xl font-bold text-gradient">Approve Profile Edits</h1>
            <p className="text-muted-foreground mt-1">Review and approve student profile edit requests</p>
          </div>
        </div>
      </div>

      <GlassCard variant="intense">
        <h2 className="text-xl font-semibold text-glass-foreground mb-4 flex items-center">
          <UserCheck className="mr-2" size={20} />
          Profile Edit Requests ({editRequests.length})
        </h2>
        <div className="space-y-3">
          {editRequests.map((request) => (
            <div key={request.id} className="p-4 glass rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-glass-foreground text-sm">
                      Profile Edit Request
                    </h3>
                    {getStatusBadge(request.status, request.metadata)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    From: {request.senderName} ({request.senderEmail})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.createdAt).toLocaleDateString()} at{' '}
                    {new Date(request.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewRequest(request)}
                  >
                    <Eye size={14} />
                    View
                  </Button>
                  {request.status === 'pending' || request.status === 'read' ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          approveRequest();
                        }}
                        disabled={isLoading}
                      >
                        <CheckCircle size={14} />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          denyRequest();
                        }}
                        disabled={isLoading}
                      >
                        <XCircle size={14} />
                        Deny
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              <p className="text-sm text-glass-foreground line-clamp-2">
                {request.content}
              </p>
            </div>
          ))}
          {editRequests.length === 0 && (
            <div className="text-center py-8">
              <UserCheck size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No profile edit requests</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Request Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="glass border-glass-border/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-glass-foreground">
              Profile Edit Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Student</label>
                  <p className="text-muted-foreground">{selectedRequest.senderName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Email</label>
                  <p className="text-muted-foreground">{selectedRequest.senderEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status, selectedRequest.metadata)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-glass-foreground">Request Date</label>
                  <p className="text-muted-foreground">
                    {new Date(selectedRequest.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-glass-foreground">Reason for Edit</label>
                <div className="mt-2 p-3 glass rounded-lg">
                  <p className="text-glass-foreground whitespace-pre-wrap">
                    {selectedRequest.content}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                {(selectedRequest.status === 'pending' || selectedRequest.status === 'read') && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={denyRequest}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-destructive-foreground border-t-transparent" />
                      ) : (
                        <>
                          <XCircle size={16} />
                          Deny
                        </>
                      )}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={approveRequest}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Approve
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};