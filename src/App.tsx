import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Parents from './pages/Parents';
import Attendance from './pages/Attendance';
import Fees from './pages/Fees';
import CollectFees from './pages/Fees/CollectFees';
import DueStudents from './pages/Fees/DueStudents';
import FeeStructure from './pages/Fees/FeeStructure';
import Receipts from './pages/Fees/Receipts';
import Reports from './pages/Fees/Reports';

import Announcements from './pages/Announcements';
import AICalls from './pages/AICalls';
import WhatsAppCenter from './pages/WhatsAppCenter';
import ParentPortal from './pages/ParentPortal';
import TeacherPortal from './pages/TeacherPortal';

import Settings from './pages/Settings';

import { SplashScreen } from './components/SplashScreen';

function AppContent() {
  const { profile, loading } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    // Hide splash after 2 seconds or when loading is done, whichever is later
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const isAdmin = profile && ['super_admin', 'school_admin', 'accountant'].includes(profile.role);
    const isTeacher = profile?.role === 'teacher';
    
    // Determine which theme to use
    const themeKey = isTeacher ? 'teacher_theme' : 'admin_theme';
    const theme = localStorage.getItem(themeKey) || 'light';
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile]);

  if (showSplash || (loading && !profile)) {
    return <SplashScreen />;
  }

  if (!profile) {
    return <Login />;
  }

  const isAdmin = ['super_admin', 'school_admin'].includes(profile.role);
  const isAccountant = profile.role === 'accountant';
  const isTeacher = profile.role === 'teacher';
  const isParent = profile.role === 'parent';

  if (isParent) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] selection:bg-brand-coral/20">
        <main className="max-w-[1600px] mx-auto min-h-screen">
          <Routes>
            <Route path="/" element={<ParentPortal />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    );
  }

  if (isTeacher) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#121212] selection:bg-brand-indigo/20 transition-colors duration-300">
        <main className="max-w-[1600px] mx-auto min-h-screen">
          <Routes>
            <Route path="/" element={<TeacherPortal />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-bg dark:bg-[#121212] text-slate-900 dark:text-white font-sans selection:bg-brand-coral/20 transition-colors duration-300">
      <div className="no-print contents">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="no-print">
          <Navbar />
        </div>
        <main className="flex-1 overflow-y-auto px-4 md:px-10 scroll-smooth">
          <div className="max-w-[1600px] mx-auto pt-8">
            <Routes>
              {(isAdmin || isAccountant || isTeacher) && (
                <>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/students" element={<Students />} />
                  { (isAdmin || isAccountant) && (
                    <>
                      <Route path="/teachers" element={<Teachers />} />
                      <Route path="/parents" element={<Parents />} />
                      <Route path="/fees" element={<Fees />}>
                        <Route path="collect" element={<CollectFees />} />
                        <Route path="due-students" element={<DueStudents />} />
                        <Route path="fee-structure" element={<FeeStructure />} />
                        <Route path="receipts" element={<Receipts />} />
                        <Route path="reports" element={<Reports />} />
                      </Route>
                      <Route path="/ai-calls" element={<AICalls />} />
                      { isAdmin && <Route path="/whatsapp-center" element={<WhatsAppCenter />} /> }
                      {/* Alias for old route */}
                      <Route path="/whatsapp-alerts" element={<Navigate to="/whatsapp-center" />} />
                    </>
                  )}
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/announcements" element={<Announcements />} />
                  <Route path="/settings" element={<Settings />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
