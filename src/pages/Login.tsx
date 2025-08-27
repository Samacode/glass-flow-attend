import React from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

const Login: React.FC = () => {
  return (
    <AuthLayout 
      title="Welcome Back"
      subtitle="Sign in to your attendance dashboard"
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default Login;