import React from 'react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ContextHelpButton from './ContextHelpButton';

interface LayoutProps {
  children: React.ReactNode;
  showNotifications?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showNotifications = true }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-warm-50 print:block print:h-auto print:overflow-visible print:bg-white">
      <Sidebar />
      <main className="relative z-0 min-w-0 flex-1 overflow-y-auto print:block print:overflow-visible">
        {showNotifications && (
          <div className="sticky top-0 z-40 flex h-14 items-center justify-end border-b border-warm-100/80 bg-warm-50/95 px-4 backdrop-blur md:px-6 xl:px-8 print:hidden">
            <ContextHelpButton />
            <NotificationBell />
          </div>
        )}
        <div className="p-4 print:p-0 md:p-6 xl:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
