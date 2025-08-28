import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, User } from '@/lib/database';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  loading: boolean;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  deleteAccount: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored session on mount
  useEffect(() => {
    const checkStoredSession = async () => {
      try {
        const storedUserId = localStorage.getItem('attendanceUserId');
        if (storedUserId) {
          const storedUser = await db.users.get(parseInt(storedUserId));
          if (storedUser) {
            setUser(storedUser);
          } else {
            localStorage.removeItem('attendanceUserId');
          }
        }
      } catch (error) {
        console.error('Error checking stored session:', error);
        localStorage.removeItem('attendanceUserId');
      } finally {
        setLoading(false);
      }
    };

    checkStoredSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const foundUser = await db.users.where('email').equals(email).first();
      
      if (!foundUser) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive"
        });
        return false;
      }

      // Simple password check (in production, use proper hashing)
      if (foundUser.password !== password) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive"
        });
        return false;
      }

      // Check if instructor is approved
      if (foundUser.role === 'instructor' && !foundUser.isApproved) {
        toast({
          title: "Account Pending",
          description: "Your instructor account is pending admin approval",
          variant: "destructive"
        });
        return false;
      }

      setUser(foundUser);
      localStorage.setItem('attendanceUserId', foundUser.id!.toString());
      
      toast({
        title: "Welcome back!",
        description: `Logged in as ${foundUser.firstName} ${foundUser.lastName}`,
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An error occurred during login",
        variant: "destructive"
      });
      return false;
    }
  };

  const register = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      // Check if email already exists
      const existingUser = await db.users.where('email').equals(userData.email).first();
      if (existingUser) {
        toast({
          title: "Registration Failed",
          description: "An account with this email already exists",
          variant: "destructive"
        });
        return false;
      }

      // For instructors, require admin approval
      const isApproved = userData.role !== 'instructor';

      const newUser: Omit<User, 'id'> = {
        ...userData,
        isApproved,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const userId = await db.users.add(newUser);
      
      if (userData.role === 'instructor') {
        toast({
          title: "Registration Successful",
          description: "Your instructor account has been created and is pending admin approval",
        });
      } else {
        const createdUser = await db.users.get(userId);
        if (createdUser) {
          setUser(createdUser);
          localStorage.setItem('attendanceUserId', createdUser.id!.toString());
        }
        
        toast({
          title: "Welcome!",
          description: "Your account has been created successfully",
        });
      }

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Error",
        description: "An error occurred during registration",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      await db.users.update(user.id, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      const updatedUser = await db.users.get(user.id);
      if (updatedUser) {
        setUser(updatedUser);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update Error",
        description: "An error occurred while updating your profile",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteAccount = async (password: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Verify password
      if (user.password !== password) {
        toast({
          title: "Delete Failed",
          description: "Incorrect password",
          variant: "destructive"
        });
        return false;
      }

      // Delete user and related data
      await db.transaction('rw', [db.users, db.attendanceRecords, db.quizSubmissions], async () => {
        // Delete related records
        await db.attendanceRecords.where('studentId').equals(user.id!).delete();
        await db.quizSubmissions.where('studentId').equals(user.id!).delete();
        
        // Delete user
        await db.users.delete(user.id!);
      });

      logout();
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });

      return true;
    } catch (error) {
      console.error('Account deletion error:', error);
      toast({
        title: "Deletion Error",
        description: "An error occurred while deleting your account",
        variant: "destructive"
      });
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('attendanceUserId');
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  const value = {
    user,
    login,
    logout,
    register,
    loading,
    updateProfile,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};