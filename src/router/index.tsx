import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthRoute from '@/components/AuthRoute';
import PinRoute from '@/components/PinRoute';
import Layout from '@/components/Layout';
import { Login, Dashboard, Catalog, Calendar, Contacts, Finance, Fiscal, Settings, Professionals } from '@/pages';
import { useNexus } from '@/contexts';

const GuestRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { user, isLoading } = useNexus();
  if (isLoading) return null;
  return user ? <Navigate to="/dashboard" replace /> : element;
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<GuestRoute element={<Login />} />} />

    <Route element={<AuthRoute />}>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/catalog"   element={<Catalog />} />
        <Route path="/contacts"  element={<Contacts />} />
        <Route path="/calendar"       element={<Calendar />} />
        <Route path="/professionals"  element={<Professionals />} />
        <Route path="/fiscal"         element={<Fiscal />} />

        <Route element={<PinRoute />}>
          <Route path="/finance"  element={<Finance />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default AppRoutes;
