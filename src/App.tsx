import React, { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Navbar } from './components/layout/Navbar';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { CertificateEditorPage } from './pages/CertificateEditorPage';
import { IssuedCertificatesPage } from './pages/IssuedCertificatesPage';
import { ExamsListPage } from './pages/ExamsListPage';
import { ExamEditorPage } from './pages/ExamEditorPage';
import { ExamResultsPage } from './pages/ExamResultsPage';
import { SettingsPage } from './pages/SettingsPage';

// Public Standalone Pages
import { PublicVerifyPage } from './pages/PublicVerifyPage';
import { PublicRegisterPage } from './pages/PublicRegisterPage';
import { PublicExamTakePage } from './pages/PublicExamTakePage';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeParam, setActiveParam] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Path routing detection (supports both HTML5 pathname and hash routing)
  const [routeInfo, setRouteInfo] = useState<{
    type: 'admin' | 'verify' | 'register' | 'exam';
    param?: string;
  }>({ type: 'admin' });

  useEffect(() => {
    const parseRoute = () => {
      const path = window.location.pathname;

      if (path.startsWith('/verify/')) {
        const id = path.replace('/verify/', '').trim();
        setRouteInfo({ type: 'verify', param: id });
        return;
      }
      if (path.startsWith('/register/')) {
        const slug = path.replace('/register/', '').trim();
        setRouteInfo({ type: 'register', param: slug });
        return;
      }
      if (path.startsWith('/exam/')) {
        const id = path.replace('/exam/', '').trim();
        setRouteInfo({ type: 'exam', param: id });
        return;
      }

      // Default to admin app
      setRouteInfo({ type: 'admin' });
    };

    parseRoute();
    window.addEventListener('popstate', parseRoute);
    return () => window.removeEventListener('popstate', parseRoute);
  }, []);

  const handleNavigate = (tab: string, param?: string) => {
    setCurrentTab(tab);
    setActiveParam(param || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Standalone Public QR Verification
  if (routeInfo.type === 'verify' && routeInfo.param) {
    return (
      <ToastProvider>
        <PublicVerifyPage certificateId={routeInfo.param} />
      </ToastProvider>
    );
  }

  // 2. Standalone Public Event Registration Form
  if (routeInfo.type === 'register' && routeInfo.param) {
    return (
      <ToastProvider>
        <PublicRegisterPage slug={routeInfo.param} />
      </ToastProvider>
    );
  }

  // 3. Standalone Public Online Exam
  if (routeInfo.type === 'exam' && routeInfo.param) {
    return (
      <ToastProvider>
        <PublicExamTakePage examId={routeInfo.param} />
      </ToastProvider>
    );
  }

  // 4. Main Admin SaaS Application
  return (
    <ToastProvider>
      <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
        {/* Desktop Collapsible Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={handleNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-hidden">
          {/* Top Bar */}
          <Navbar currentTab={currentTab} onNavigate={handleNavigate} />

          {/* Page Body */}
          <main className="flex-1 overflow-y-auto w-full pb-20 md:pb-0 flex flex-col">
            {currentTab === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
            {currentTab === 'templates' && <TemplatesPage onNavigate={handleNavigate} />}
            {currentTab === 'editor' && (
              <CertificateEditorPage templateId={activeParam} onNavigate={handleNavigate} />
            )}
            {currentTab === 'certificates' && <IssuedCertificatesPage />}
            {currentTab === 'exams' && <ExamsListPage onNavigate={handleNavigate} />}
            {currentTab === 'exam_editor' && (
              <ExamEditorPage examId={activeParam} onNavigate={handleNavigate} />
            )}
            {currentTab === 'results' && (
              <ExamResultsPage examId={activeParam} onNavigate={handleNavigate} />
            )}
            {currentTab === 'settings' && <SettingsPage />}
          </main>
        </div>

        {/* Mobile Glassmorphic Bottom Navigation Bar */}
        <MobileBottomNav currentTab={currentTab} onNavigate={handleNavigate} />
      </div>
    </ToastProvider>
  );
}
export default App;
