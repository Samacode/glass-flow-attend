import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Edit, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export const InstructorProfile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department || ''
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const success = await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        department: formData.department || undefined
      });

      if (success) {
        setIsEditing(false);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully",
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department || ''
      });
    }
    setIsEditing(false);
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
            <h1 className="text-3xl font-bold text-gradient">Instructor Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your account information</p>
          </div>
        </div>
        {!isEditing && (
          <Button variant="primary" onClick={() => setIsEditing(true)}>
            <Edit size={16} />
            Edit Profile
          </Button>
        )}
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
              <p className="text-muted-foreground">Instructor</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-glass-foreground font-medium">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  disabled={!isEditing}
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-glass-foreground font-medium">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  disabled={!isEditing}
                  className="glass border-glass-border/30 bg-glass/5 text-glass-foreground disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-glass-foreground font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing}
                className="glass border-glass-border/30 bg-glass/5 text-glass-foreground disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-glass-foreground font-medium">
                Department
              </Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                disabled={!isEditing}
                placeholder="Your Department"
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

            {isEditing && (
              <div className="flex justify-end space-x-3 pt-6 border-t border-glass-border/20">
                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={isLoading}>
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};