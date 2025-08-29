import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, Key, Users, AlertTriangle, Save, Eye, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, Ban as BanRecord } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

interface SecuritySetting {
  key: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'textarea';
  label: string;
  description: string;
}

interface ActiveBan extends BanRecord {
  userName: string;
  userEmail: string;
  bannedByName: string;
}

export const SecuritySettings: React.FC = () => {
  const [securitySettings, setSecuritySettings] = useState<{ [key: string]: string }>({});
  const [activeBans, setActiveBans] = useState<ActiveBan[]>([]);
  const [ipWhitelist, setIpWhitelist] = useState<string[]>([]);
  const [newIpAddress, setNewIpAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const defaultSecuritySettings: SecuritySetting[] = [
    {
      key: 'password_min_length',
      value: '8',
      type: 'number',
      label: 'Minimum Password Length',
      description: 'Minimum characters required for user passwords'
    },
    {
      key: 'require_password_complexity',
      value: 'true',
      type: 'boolean',
      label: 'Require Password Complexity',
      description: 'Enforce uppercase, lowercase, numbers, and special characters'
    },
    {
      key: 'max_login_attempts',
      value: '5',
      type: 'number',
      label: 'Maximum Login Attempts',
      description: 'Number of failed attempts before account lockout'
    },
    {
      key: 'account_lockout_duration',
      value: '30',
      type: 'number',
      label: 'Account Lockout Duration (minutes)',
      description: 'How long accounts remain locked after max attempts'
    },
    {
      key: 'session_timeout',
      value: '120',
      type: 'number',
      label: 'Session Timeout (minutes)',
      description: 'Automatic logout after inactivity'
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
    },
    {
      key: 'audit_log_retention',
      value: '90',
      type: 'number',
      label: 'Audit Log Retention (days)',
      description: 'How long to keep security audit logs'
    },
    {
      key: 'force_password_change',
      value: 'false',
      type: 'boolean',
      label: 'Force Password Change',
      description: 'Require users to change passwords periodically'
    },
    {
      key: 'password_change_interval',
      value: '90',
      type: 'number',
      label: 'Password Change Interval (days)',
      description: 'How often users must change passwords'
    }
  ];

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      // Load security settings
      const settings = await db.settings.toArray();
      const settingsMap: { [key: string]: string } = {};
      
      settings.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });

      // Set defaults for missing settings
      defaultSecuritySettings.forEach(setting => {
        if (!(setting.key in settingsMap)) {
          settingsMap[setting.key] = setting.value;
        }
      });

      setSecuritySettings(settingsMap);

      // Load active bans
      const bans = await db.bans
        .where('isActive').equals(true)
        .and(ban => new Date(ban.expiresAt) > new Date())
        .toArray();

      const bansWithUsers: ActiveBan[] = [];
      for (const ban of bans) {
        const user = await db.users.get(ban.userId);
        const bannedBy = await db.users.get(ban.bannedBy);
        
        if (user && bannedBy) {
          bansWithUsers.push({
            ...ban,
            userName: `${user.firstName} ${user.lastName}`,
            userEmail: user.email,
            bannedByName: `${bannedBy.firstName} ${bannedBy.lastName}`
          });
        }
      }

      setActiveBans(bansWithUsers);

      // Load IP whitelist (stored as a setting)
      const ipWhitelistSetting = await db.settings.where('key').equals('ip_whitelist').first();
      if (ipWhitelistSetting) {
        try {
          const ips = JSON.parse(ipWhitelistSetting.value);
          setIpWhitelist(Array.isArray(ips) ? ips : []);
        } catch {
          setIpWhitelist([]);
        }
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSecuritySettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSecuritySettings = async () => {
    setIsLoading(true);
    try {
      for (const [key, value] of Object.entries(securitySettings)) {
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
        title: "Security Settings Saved",
        description: "All security settings have been updated successfully",
      });
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save security settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addIpToWhitelist = async () => {
    if (!newIpAddress.trim()) return;

    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newIpAddress)) {
      toast({
        title: "Invalid IP Address",
        description: "Please enter a valid IP address",
        variant: "destructive"
      });
      return;
    }

    const updatedList = [...ipWhitelist, newIpAddress];
    setIpWhitelist(updatedList);
    setNewIpAddress('');

    try {
      const existingSetting = await db.settings.where('key').equals('ip_whitelist').first();
      const ipListJson = JSON.stringify(updatedList);

      if (existingSetting) {
        await db.settings.update(existingSetting.id!, {
          value: ipListJson,
          updatedAt: new Date().toISOString()
        });
      } else {
        await db.settings.add({
          key: 'ip_whitelist',
          value: ipListJson,
          updatedAt: new Date().toISOString()
        });
      }

      toast({
        title: "IP Added",
        description: "IP address added to whitelist",
      });
    } catch (error) {
      console.error('Error adding IP to whitelist:', error);
    }
  };

  const removeIpFromWhitelist = async (ipToRemove: string) => {
    const updatedList = ipWhitelist.filter(ip => ip !== ipToRemove);
    setIpWhitelist(updatedList);

    try {
      const existingSetting = await db.settings.where('key').equals('ip_whitelist').first();
      if (existingSetting) {
        await db.settings.update(existingSetting.id!, {
          value: JSON.stringify(updatedList),
          updatedAt: new Date().toISOString()
        });
      }

      toast({
        title: "IP Removed",
        description: "IP address removed from whitelist",
      });
    } catch (error) {
      console.error('Error removing IP from whitelist:', error);
    }
  };

  const liftBan = async (banId: number, userName: string) => {
    try {
      await db.bans.update(banId, {
        isActive: false,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Ban Lifted",
        description: `Ban has been lifted for ${userName}`,
      });

      loadSecurityData();
    } catch (error) {
      console.error('Error lifting ban:', error);
      toast({
        title: "Error",
        description: "Failed to lift ban",
        variant: "destructive"
      });
    }
  };

  const renderSetting = (setting: SecuritySetting) => {
    const currentValue = securitySettings[setting.key] || setting.value;

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
            ) : setting.type === 'textarea' ? (
              <Textarea
                value={currentValue}
                onChange={(e) => updateSetting(setting.key, e.target.value)}
                className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                rows={3}
              />
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
            <h1 className="text-3xl font-bold text-gradient">Security Settings</h1>
            <p className="text-muted-foreground mt-1">Configure system security policies and access controls</p>
          </div>
        </div>
        <Button variant="primary" onClick={saveSecuritySettings} disabled={isLoading}>
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <>
              <Save size={16} />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="authentication" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="authentication" className="flex items-center space-x-2">
            <Key size={16} />
            <span>Authentication</span>
          </TabsTrigger>
          <TabsTrigger value="access-control" className="flex items-center space-x-2">
            <Shield size={16} />
            <span>Access Control</span>
          </TabsTrigger>
          <TabsTrigger value="user-management" className="flex items-center space-x-2">
            <Users size={16} />
            <span>User Management</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center space-x-2">
            <Eye size={16} />
            <span>Monitoring</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="authentication">
          <GlassCard variant="intense">
            <h2 className="text-xl font-semibold text-glass-foreground mb-6">Authentication Security</h2>
            <div className="space-y-4">
              {defaultSecuritySettings.slice(0, 5).map(renderSetting)}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="access-control">
          <div className="space-y-6">
            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-6">Access Control Settings</h2>
              <div className="space-y-4">
                {defaultSecuritySettings.slice(5, 7).map(renderSetting)}
              </div>
            </GlassCard>

            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-6">IP Whitelist Management</h2>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={newIpAddress}
                    onChange={(e) => setNewIpAddress(e.target.value)}
                    placeholder="Enter IP address (e.g., 192.168.1.1)"
                    className="glass border-glass-border/30 bg-glass/5 text-glass-foreground"
                  />
                  <Button variant="primary" onClick={addIpToWhitelist}>
                    Add IP
                  </Button>
                </div>

                <div className="space-y-2">
                  {ipWhitelist.map((ip, index) => (
                    <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                      <span className="text-glass-foreground font-mono">{ip}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeIpFromWhitelist(ip)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {ipWhitelist.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No IP addresses in whitelist</p>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="user-management">
          <div className="space-y-6">
            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-6">Password & Account Settings</h2>
              <div className="space-y-4">
                {defaultSecuritySettings.slice(7).map(renderSetting)}
              </div>
            </GlassCard>

            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-6">Active Bans</h2>
              <div className="space-y-3">
                {activeBans.map((ban) => (
                  <div key={ban.id} className="p-4 glass rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-glass-foreground">{ban.userName}</h3>
                          <Badge variant="destructive">Banned</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{ban.userEmail}</p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Reason:</strong> {ban.reason}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Banned by:</strong> {ban.bannedByName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Expires:</strong> {new Date(ban.expiresAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => liftBan(ban.id!, ban.userName)}
                      >
                        Lift Ban
                      </Button>
                    </div>
                  </div>
                ))}
                {activeBans.length === 0 && (
                  <div className="text-center py-8">
                    <Ban size={48} className="text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No active bans</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="space-y-6">
            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-6">Security Monitoring</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 glass rounded-lg">
                  <AlertTriangle size={32} className="text-warning mx-auto mb-2" />
                  <h3 className="font-semibold text-glass-foreground">Security Alerts</h3>
                  <p className="text-2xl font-bold text-warning">0</p>
                  <p className="text-sm text-muted-foreground">Last 24 hours</p>
                </div>

                <div className="text-center p-4 glass rounded-lg">
                  <Shield size={32} className="text-success mx-auto mb-2" />
                  <h3 className="font-semibold text-glass-foreground">Failed Logins</h3>
                  <p className="text-2xl font-bold text-success">3</p>
                  <p className="text-sm text-muted-foreground">Last 24 hours</p>
                </div>

                <div className="text-center p-4 glass rounded-lg">
                  <Users size={32} className="text-primary mx-auto mb-2" />
                  <h3 className="font-semibold text-glass-foreground">Active Sessions</h3>
                  <p className="text-2xl font-bold text-primary">{activeBans.length}</p>
                  <p className="text-sm text-muted-foreground">Current</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="intense">
              <h2 className="text-xl font-semibold text-glass-foreground mb-6">Recent Security Events</h2>
              <div className="space-y-3">
                {[
                  { event: 'Failed login attempt', user: 'john.doe@email.com', time: '2 minutes ago', severity: 'low' },
                  { event: 'Password changed', user: 'jane.smith@email.com', time: '1 hour ago', severity: 'info' },
                  { event: 'Multiple failed attempts', user: 'suspicious@email.com', time: '3 hours ago', severity: 'high' },
                  { event: 'New instructor approved', user: 'prof.wilson@email.com', time: '5 hours ago', severity: 'info' }
                ].map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-glass-foreground">{event.event}</p>
                      <p className="text-xs text-muted-foreground">{event.user} • {event.time}</p>
                    </div>
                    <Badge 
                      variant={event.severity === 'high' ? 'destructive' : event.severity === 'low' ? 'secondary' : 'default'}
                    >
                      {event.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};