import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, QrCode, Camera, MapPin, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

export const QuickCheckIn: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<'qr-generate' | 'qr-scan' | 'location' | null>(null);
  const [studentQR, setStudentQR] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    // Get session ID from navigation state if available
    if (location.state?.sessionId) {
      setSessionId(location.state.sessionId);
    }
  }, [location.state]);

  const generateStudentQR = () => {
    if (!user?.id) return;
    
    // Generate a unique QR token for the student
    const qrToken = `STUDENT_${user.id}_${Date.now()}`;
    setStudentQR(qrToken);
    setSelectedMethod('qr-generate');
  };

  const startQRScan = () => {
    setSelectedMethod('qr-scan');
    setIsScanning(true);
    
    // Simulate QR scanning (in a real app, this would use camera API)
    setTimeout(() => {
      const mockInstructorQR = `INSTRUCTOR_QR_${Date.now()}`;
      handleQRScanResult(mockInstructorQR);
    }, 3000);
  };

  const handleQRScanResult = async (scannedCode: string) => {
    setIsScanning(false);
    
    try {
      // In a real implementation, validate the QR code against active sessions
      // For demo purposes, we'll simulate a successful scan
      await recordAttendance('qr', { qrCode: scannedCode });
    } catch (error) {
      console.error('Error processing QR scan:', error);
      toast({
        title: "Scan Failed",
        description: "Invalid QR code or session not found",
        variant: "destructive"
      });
    }
  };

  const checkLocation = async () => {
    setSelectedMethod('location');
    setIsCheckingLocation(true);

    try {
      // Get user's current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      // Find active sessions within location range
      const activeSessions = await db.classSessions
        .where('isActive').equals(true)
        .and(session => {
          const sessionDate = new Date(session.date);
          const today = new Date();
          return sessionDate.toDateString() === today.toDateString();
        })
        .toArray();

      // Check if user is enrolled in any of these sessions
      const enrollments = await db.courseEnrollments.where('studentId').equals(user!.id!).toArray();
      const enrolledCourseIds = enrollments.map(e => e.courseId);
      
      const validSessions = activeSessions.filter(session => 
        enrolledCourseIds.includes(session.courseId)
      );

      if (validSessions.length === 0) {
        throw new Error('No active sessions found for your location');
      }

      // For demo purposes, assume location is valid
      await recordAttendance('gps', { location: userLocation });
    } catch (error) {
      console.error('Error checking location:', error);
      toast({
        title: "Location Check Failed",
        description: error instanceof Error ? error.message : "Unable to verify location",
        variant: "destructive"
      });
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const recordAttendance = async (method: 'qr' | 'gps', data: any) => {
    if (!user?.id) return;

    try {
      // Find the most recent active session for the student
      const enrollments = await db.courseEnrollments.where('studentId').equals(user.id).toArray();
      const enrolledCourseIds = enrollments.map(e => e.courseId);
      
      const today = new Date().toISOString().split('T')[0];
      const activeSessions = await db.classSessions
        .where('date').equals(today)
        .and(session => session.isActive && enrolledCourseIds.includes(session.courseId))
        .toArray();

      if (activeSessions.length === 0) {
        throw new Error('No active sessions found for today');
      }

      // Use the provided sessionId or the first active session
      const targetSession = sessionId ? 
        activeSessions.find(s => s.id === sessionId) || activeSessions[0] : 
        activeSessions[0];

      // Check if already checked in
      const existingRecord = await db.attendanceRecords
        .where('sessionId').equals(targetSession.id!)
        .and(record => record.studentId === user.id)
        .first();

      if (existingRecord) {
        toast({
          title: "Already Checked In",
          description: "You have already checked in for this session",
          variant: "destructive"
        });
        return;
      }

      // Record attendance
      await db.attendanceRecords.add({
        sessionId: targetSession.id!,
        studentId: user.id,
        status: 'present',
        checkInTime: new Date().toISOString(),
        checkInMethod: method,
        location: data.location,
        ipAddress: method === 'gps' ? undefined : '192.168.1.1',
        isManualOverride: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast({
        title: "Check-In Successful",
        description: "Your attendance has been recorded",
      });

      // Navigate back to dashboard after successful check-in
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error recording attendance:', error);
      toast({
        title: "Check-In Failed",
        description: error instanceof Error ? error.message : "Failed to record attendance",
        variant: "destructive"
      });
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
            <h1 className="text-3xl font-bold text-gradient">Quick Check In</h1>
            <p className="text-muted-foreground mt-1">Choose your preferred check-in method</p>
          </div>
        </div>
      </div>

      {!selectedMethod ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Generate QR Code */}
          <GlassCard variant="glow" className="glass-hover cursor-pointer" onClick={generateStudentQR}>
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-6 rounded-2xl bg-gradient-primary text-primary-foreground">
                  <QrCode size={32} />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-glass-foreground mb-2">
                Generate QR Code
              </h3>
              <p className="text-sm text-muted-foreground">
                Generate your unique QR code for instructor to scan
              </p>
            </div>
          </GlassCard>

          {/* Scan QR Code */}
          <GlassCard variant="glow" className="glass-hover cursor-pointer" onClick={startQRScan}>
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-6 rounded-2xl bg-gradient-secondary text-secondary-foreground">
                  <Camera size={32} />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-glass-foreground mb-2">
                Scan QR Code
              </h3>
              <p className="text-sm text-muted-foreground">
                Scan instructor's QR code to check in
              </p>
            </div>
          </GlassCard>

          {/* Location Check */}
          <GlassCard variant="glow" className="glass-hover cursor-pointer" onClick={checkLocation}>
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="p-6 rounded-2xl bg-accent text-accent-foreground">
                  <MapPin size={32} />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-glass-foreground mb-2">
                Location Check
              </h3>
              <p className="text-sm text-muted-foreground">
                Verify your location matches the classroom
              </p>
            </div>
          </GlassCard>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {selectedMethod === 'qr-generate' && (
            <GlassCard variant="intense" size="lg">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-glass-foreground mb-6">Your QR Code</h2>
                <div className="bg-white p-8 rounded-2xl mx-auto w-fit mb-6">
                  <div className="w-48 h-48 bg-gray-900 rounded-lg flex items-center justify-center">
                    <div className="text-white text-xs text-center">
                      <QrCode size={120} />
                      <p className="mt-2">QR Code</p>
                      <p className="text-xs opacity-70">{studentQR}</p>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  Show this QR code to your instructor for attendance verification
                </p>
                <div className="flex justify-center space-x-4">
                  <Button variant="outline" onClick={() => setSelectedMethod(null)}>
                    Back
                  </Button>
                  <Button variant="primary" onClick={() => recordAttendance('qr', { qrCode: studentQR })}>
                    <CheckCircle size={16} />
                    Confirm Check-In
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {selectedMethod === 'qr-scan' && (
            <GlassCard variant="intense" size="lg">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-glass-foreground mb-6">Scan QR Code</h2>
                <div className="bg-gray-900 p-8 rounded-2xl mx-auto w-fit mb-6">
                  <div className="w-48 h-48 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
                    {isScanning ? (
                      <div className="text-center text-white">
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent mx-auto mb-4"></div>
                        <p>Scanning...</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <Camera size={48} className="mx-auto mb-2" />
                        <p>Camera View</p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground mb-6">
                  Point your camera at the instructor's QR code
                </p>
                <Button variant="outline" onClick={() => setSelectedMethod(null)}>
                  Back
                </Button>
              </div>
            </GlassCard>
          )}

          {selectedMethod === 'location' && (
            <GlassCard variant="intense" size="lg">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-glass-foreground mb-6">Location Verification</h2>
                <div className="p-8 mb-6">
                  {isCheckingLocation ? (
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
                      <p className="text-glass-foreground">Checking your location...</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <MapPin size={64} className="text-primary mx-auto mb-4" />
                      <p className="text-glass-foreground">Location verified successfully!</p>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground mb-6">
                  We're verifying that you're in the correct classroom location
                </p>
                <Button variant="outline" onClick={() => setSelectedMethod(null)}>
                  Back
                </Button>
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
};