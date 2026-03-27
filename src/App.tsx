import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { NexusProvider } from '@/contexts';
import AppRoutes from '@/router';

const App: React.FC = () => (
  <BrowserRouter>
    <NexusProvider>
      <AppRoutes />
    </NexusProvider>
  </BrowserRouter>
);

export default App;
