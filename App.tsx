import React from 'react';
import { NexusProvider } from './store/NexusContext';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <NexusProvider>
      <Layout />
    </NexusProvider>
  );
};

export default App;
