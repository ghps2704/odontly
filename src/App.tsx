
import React from 'react';
import { NexusProvider, useNexus } from '@/contexts';
import { Layout } from '@/components';
import { Login } from '@/pages';

const Main: React.FC = () => {
  const { user, isLoading } = useNexus();

  if (isLoading) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-slate-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
          </div>
      )
  }

  return user ? <Layout /> : <Login />;
}

const App: React.FC = () => {
  return (
    <NexusProvider>
      <Main />
    </NexusProvider>
  );
};

export default App;
