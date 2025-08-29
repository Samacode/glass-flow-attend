import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Settings, Save, Shield, Clock, Users, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

interface SystemSetting {
  key: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  label: string;
  description: string;
  options?: string[];
}

export const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const systemSettings: SystemSetting[] = [
    {
      key: 'attendance_grace_period',
      value: '15',
      type: 'number',
      label: 'Attendance Grace Period (minutes)',
      description: 'How long after class starts students can still check in as present'
    },
    {
      key: 'late_threshold',
      value: '30',
      type: 'number',
      label: 'Late Threshold (minutes)',
      description: 'Maximum minutes after start time to mark as late instead of absent'
    },
    {
      key: 'qr_rotation_interval',
      value: '30',
      type: 'number',
      label: 'QR Code Rotation (seconds)',
      description: 'How often QR codes refresh for security'
    },
    {
      key: 'auto_approve_instructors',
      value: 'false',
      type: 'boolean',
      label: 'Auto-approve Instructors',
      description: 'Automatically approve new instructor registrations'
    },
    {
      key: 'require_location_verification',
      value: 'true',
      type: 'boolean',
      label: 'Require Location Verification',
      description: 'Enforce GPS location checking for attendance'
    },
    {
      key: 'max_courses_per_instructor',
      value: '10',
      type: 'number',
      label: 'Max Courses per Instructor',
      description: 'Maximum number of courses an instructor can create'
    },
    {
      key: 'session_timeout',
      value: '120',
      type: 'number',
      label: 'Session Timeout (minutes)',
      description: 'How long user sessions remain active'
    },
    {
      key: 'backup_frequency',
      value: 'daily',
      type: 'select',
      label: 'Backup Frequency',
      description: 'How often to backup the database',
      options: ['hourly', 'daily', 'weekly', 'monthly']
    }
  ];

  const securitySettings: SystemSetting[] = [
    {
      key: 'password_min_length',
      value: '8',
      type: 'number',
      label: 'Minimum Password Length',
      description: 'Minimum characters required for passwords'
    },
    {
      key: 'require_password_complexity',
      value: 'true',
      type: 'boolean',
      label: 'Require Password Complexity',
      description: 'Enforce uppercase, lowercase, numbers, and symbols'
    },
    {
      key: 'max_login_attempts',
      value: '5',
      type: 'number',
      label: 'Max Login Attempts',
      description: 'Maximum failed login attempts before account lockout'
    },
    {
      key: 'account_lockout_duration',
      value: '30',
      type: 'number',
      label: 'Account Lockout Duration (minutes)',
      description: 'How long accounts remain locked after max attempts'
    },
    {
      key: 'enable_two_factor',
      value: 'false',
      type: 'boolean',
      label: 'Enable Two-Factor Authentication',
      description: 'Require 2FA for all user accounts'
    },
    {
      key: 'ip_whitelist_enabled',
      value: 'false',
      type: 'boolean',
      label: 'Enable IP Whitelist',
      description: 'Only allow access from approved IP addresses'
    }
  ];

  const notificationSettings: SystemSetting[] = [
    {
      key: 'email_notifications',
      value: 'true',
      type: 'boolean',
      label: 'Email Notifications',
      description: 'Send email notifications for important events'
    },
    {
      key: 'attendance_reminders',
      value: 'true',
      type: 'boolean',
      label: 'Attendance Reminders',
      description: 'Send reminders to students about upcoming classes'
    },
    {
      key: 'grade_notifications',
      value: 'true',
      type: 'boolean',
      label: 'Grade Notifications',
      description: 'Notify students when grades are posted'
    },
    {
      key: 'system_maintenance_alerts',
      value: 'true',
      type: 'boolean',
      label: 'Maintenance Alerts',
      description: 'Alert users about scheduled system maintenance'
    }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const allSettings = await db.settings.toArray();
      const settingsMap: { [key: string]: string } = {};
      
      allSettings.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });

      // Set defaults for missing settings
      [...systemSettings, ...securitySettings, ...notificationSettings].forEach(setting => {
        if (!(setting.key in settingsMap)) {
          settingsMap[setting.key] = setting.value;
        }
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Update or create each setting
      for (const [key, value] of Object.entries(settings)) {
        const existingSetting = await db.settings.where('key').equals(key).first();
        
        if (existingSetting) {
          await db.settings.update(existingSetting.id!, {
            value,
            updatedAt: new Date().toISOString()
          });
        } else {
          await db.settings.add({
            key,
            value,
            updatedAt: new Date().toISOString()
          });
        }
      }

      toast({
        title: "Settings Saved",
        description: "All system settings have been updated successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSetting = (setting: SystemSetting) => {
    const currentValue = settings[setting.key] || setting.value;

    return (
      <div key={setting.key} className="p-4 glass rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-4">
            <Label className="text-glass-foreground font-medium">{setting.label}</Label>
            <p className="text-sm text-muted-foreground mt-1">{setting.description}</p>
          </div>
          <div className="w-48">
            {setting.type === 'boolean' ? (
              <Switch
                checked={currentValue === 'true'}
                onCheckedChange={(checked) => updateSetting(setting.key, checked.toString())}
              />
            ) : setting.type === 'select' ? (
              <Select value={currentValue} onValueChange={(value) => updateSetting(setting.key, value)}>
                <SelectTrigger className="glass border-glass-border/30 bg-glass/5 text-glass-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass border-glass-border/30 bg-glass text-glass-foreground">
                  {setting.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={setting.type}
                value={currentValue}
                onChange={(e) => updateSetting(setting.key, e.target.value)}
                className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
              />
            )}
          </div>
        </div>
      </div>
    );
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
            <h1 className="text-3xl font-bold text-gradient">System Settings</h1>
            <p className="text-muted-foreground mt-1">Configure system-wide preferences and policies</p>
          </div>
        </div>
        <Button variant="primary" onClick={saveSettings} disabled={isLoading}>
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <>
              <Save size={16} />
              Save All Settings
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings size={16} />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield size={16} />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Users size={16} />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center space-x-2">
            <Database size={16} />
            <span>Database</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GlassCard variant="intense">
            <h2 className="text-xl font-semibold text-glass-foreground mb-6">General Settings</h2>
            <div className="space-y-4">
              {systemSettings.map(renderSetting)}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="security">
          <GlassCard variant="intense">
            <h2 className="text-xl font-semibold text-glass-foreground mb-6">Security Settings</h2>
            <div className="space-y-4">
              {securitySettings.map(renderSetting)}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="notifications">
          <GlassCard variant="intense">
            <h2 className="text-xl font-semibold text-glass-foreground mb-6">Notification Settings</h2>
            <div className="space-y-4">
              {notificationSettings.map(renderSetting)}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="database">
          <GlassCard variant="intense">
            <h2 className="text-xl font-semibold text-glass-foreground mb-6">Database Management</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 glass rounded-lg">
                  <Database size={32} className="text-primary mx-auto mb-2" />
                  <h3 className="font-semibold text-glass-foreground">Database Size</h3>
                  <p className="text-sm text-muted-foreground">~2.4 MB</p>
                </div>
                <div className="text-center p-4 glass rounded-lg">
                  <Clock size={32} className="text-success mx-auto mb-2" />
                  <h3 className="font-semibold text-glass-foreground">Last Backup</h3>
                  <p className="text-sm text-muted-foreground">2 hours ago</p>
                </div>
                <div className="text-center p-4 glass rounded-lg">
                  <Users size={32} className="text-accent mx-auto mb-2" />
                  <h3 className="font-semibold text-glass-foreground">Active Users</h3>
                  <p className="text-sm text-muted-foreground">24 online</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 glass rounded-lg">
                  <div>
                    <h3 className="font-semibold text-glass-foreground">Manual Backup</h3>
                    <p className="text-sm text-muted-foreground">Create an immediate backup of all data</p>
                  </div>
                  <Button variant="primary">Create Backup</Button>
                </div>

                <div className="flex items-center justify-between p-4 glass rounded-lg">
                  <div>
                    <h3 className="font-semibold text-glass-foreground">Clear Cache</h3>
                    <p className="text-sm text-muted-foreground">Clear system cache to improve performance</p>
                  </div>
                  <Button variant="outline">Clear Cache</Button>
                </div>

                <div className="flex items-center justify-between p-4 glass rounded-lg">
                  <div>
                    <h3 className="font-semibold text-glass-foreground">Database Optimization</h3>
                    <p className="text-sm text-muted-foreground">Optimize database for better performance</p>
                  </div>
                  <Button variant="accent">Optimize</Button>
                </div>
              </div>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};