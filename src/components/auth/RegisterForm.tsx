import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { validateEmail } from '@/lib/emailValidation';
import { db } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

export const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'student' as 'student' | 'instructor',
    department: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Load departments on component mount
  React.useEffect(() => {
    const loadDepartments = async () => {
      try {
        const depts = await db.departments.toArray();
        setDepartments(depts.map(d => d.name));
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };
    loadDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email domain
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      toast({
        title: "Invalid Email",
        description: emailValidation.message,
        variant: "destructive"
      });
      return;
    }

    // Validate required department
    if (!formData.department) {
      toast({
        title: "Department Required",
        description: "Please select a department",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const success = await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      department: formData.department,
      isApproved: formData.role !== 'instructor'
    });

    if (success) {
      if (formData.role === 'instructor') {
        navigate('/login');
      } else {
        navigate('/dashboard');
      }
    }

    setIsLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-glass-foreground font-medium">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="John"
            required
            className="glass border-glass-border/30 bg-glass/5 text-glass-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-glass-foreground font-medium">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Doe"
            required
            className="glass border-glass-border/30 bg-glass/5 text-glass-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-glass-foreground font-medium">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="your@email.com"
          required
          className="glass border-glass-border/30 bg-glass/5 text-glass-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role" className="text-glass-foreground font-medium">Role</Label>
        <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
          <SelectTrigger className="glass border-glass-border/30 bg-glass/5 text-glass-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass border-glass-border/30 bg-glass text-glass-foreground">
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="instructor">Instructor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department" className="text-glass-foreground font-medium">Department *</Label>
        <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)} required>
          <SelectTrigger className="glass border-glass-border/30 bg-glass/5 text-glass-foreground">
            <SelectValue placeholder="Select your department" />
          </SelectTrigger>
          <SelectContent className="glass border-glass-border/30 bg-glass text-glass-foreground">
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-glass-foreground font-medium">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="••••••••"
              required
              className="glass border-glass-border/30 bg-glass/5 text-glass-foreground placeholder:text-muted-foreground pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-glass-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-glass-foreground font-medium">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="••••••••"
              required
              className={`glass border-glass-border/30 bg-glass/5 text-glass-foreground placeholder:text-muted-foreground pr-10 ${
                formData.confirmPassword && formData.password !== formData.confirmPassword 
                  ? 'border-destructive/50' 
                  : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-glass-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isLoading || formData.password !== formData.confirmPassword || !formData.department}
        className="w-full"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
        ) : (
          <>
            <UserPlus size={16} />
            Create Account
          </>
        )}
      </Button>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="text-primary hover:text-primary-glow font-medium transition-colors hover:underline"
          >
            Sign in
          </Link>
        </p>
        
        {formData.role === 'instructor' && (
          <div className="mt-4 p-3 glass rounded-lg">
            <p className="text-xs text-warning">
              Note: Instructor accounts require admin approval before activation.
            </p>
          </div>
        )}
      </div>
    </form>
  );
};