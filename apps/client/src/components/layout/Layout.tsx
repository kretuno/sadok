import React from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-warm-50">
      <Sidebar />
      <main className="relative z-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-6 xl:p-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
