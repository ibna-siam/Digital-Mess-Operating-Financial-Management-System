import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { MobileBottomNav } from './MobileBottomNav.js';
import { MobileMoreSheet } from './MobileMoreSheet.js';
import { QuickActionSheet } from './QuickActionSheet.js';
import { OfflineStatusBar } from '../pwa/OfflineStatusBar.js';
import { InstallPromptBanner } from '../pwa/InstallPromptBanner.js';
import { UpdatePromptModal } from '../pwa/UpdatePromptModal.js';
import { NotificationPreferencesModal } from '../pwa/NotificationPreferencesModal.js';
import { AppViewSkeleton } from '../ui/StateComponents.js';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [notifPreferencesOpen, setNotifPreferencesOpen] = useState(false);

  return (
    <div className="app-container">
      {/* PWA Update Banner */}
      <UpdatePromptModal />

      {/* Sidebar */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 35,
          }}
        />
      )}

      {/* Main Content Area */}
      <div className="main-wrapper">
        <OfflineStatusBar />
        <Header
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onOpenNotificationPreferences={() => setNotifPreferencesOpen(true)}
        />

        <main className="page-content">
          <React.Suspense fallback={<AppViewSkeleton />}>
            <Outlet />
          </React.Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar with Center Primary Action FAB */}
      <MobileBottomNav
        onOpenMobileMenu={() => setMoreSheetOpen(true)}
        onOpenQuickAction={() => setQuickActionOpen(true)}
      />

      {/* Primary Quick Log Action Sheet */}
      <QuickActionSheet
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
      />

      {/* Dedicated Native-Feel Mobile More Menu Sheet */}
      <MobileMoreSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        onOpenNotificationPreferences={() => setNotifPreferencesOpen(true)}
      />

      {/* PWA Install Promotion Banner */}
      <InstallPromptBanner />

      {/* Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={notifPreferencesOpen}
        onClose={() => setNotifPreferencesOpen(false)}
      />
    </div>
  );
};
