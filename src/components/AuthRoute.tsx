import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useNexus } from '@/contexts';

const AuthRoute: React.FC = () => {
  const { user, isLoading } = useNexus();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default AuthRoute;
