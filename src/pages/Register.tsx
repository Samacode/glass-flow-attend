import React from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { RegisterForm } from '@/components/auth/RegisterForm';

const Register: React.FC = () => {
  return (
    <AuthLayout 
      title="Join Us"
      subtitle="Create your attendance system account"
    >
      <RegisterForm />
    </AuthLayout>
  );
};

export default Register;