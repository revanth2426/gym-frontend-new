// src/App.tsx - REVISED COMPLETE & FINAL VERSION with Gemini-like Collapsible Sidebar
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import icons
import {
  LayoutDashboard, Users, UserCog, Package, CalendarCheck,
  Menu, // Hamburger icon for toggle
  ChevronLeft // Left arrow for collapsing
} from 'lucide-react';
// Import your page components
import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import UsersPage from './pages/UsersPage.tsx';
import TrainersPage from './pages/TrainersPage.tsx';
import MembershipPlansPage from './pages/MembershipPlansPage.tsx';
import AttendancePage from './pages/AttendancePage.tsx';
import QrCodeScanner from './components/QrCodeScanner.tsx';

// PrivateRoute component to protect routes
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-700">
        <p className="text-lg">Loading authentication...</p>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const { isAuthenticated, logout, user, loading } = useAuth();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [isHovering, setIsHovering] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // States for QR Scanner testing in App.tsx (temporary)
  const [testScannedUserId, setTestScannedUserId] = useState<string | null>(null);
  const [testScannerError, setTestScannerError] = useState<string | null>(null);
  const [showQrScannerTest, setShowQrScannerTest] = useState(false);


  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      setIsMobileView(newIsMobile);
      if (!newIsMobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(false);
      }
      setIsHovering(false);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside); // Corrected typo here
  }, [isSidebarOpen, isMobileView]);

  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
    setIsHovering(false);
  };

  const isSidebarVisuallyExpanded = isSidebarOpen || (isHovering && !isMobileView);
  const mainContentMl = isMobileView ? '0px' : (isSidebarVisuallyExpanded ? 'var(--sidebar-expanded-width)' : 'var(--sidebar-collapsed-width)');


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-700">
        <p className="text-lg">Loading application...</p>
      </div>
    );
  }

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Members', path: '/users', icon: Users },
    { label: 'Trainers', path: '/trainers', icon: UserCog },
    { label: 'Plans', path: '/plans', icon: Package },
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
  ];

  // Handlers for QrCodeScanner component when tested in App.tsx
  const handleTestScanSuccess = (decodedText: string) => {
    setTestScannedUserId(decodedText);
    setTestScannerError(null);
    toast.success(`Test Scan Success: ${decodedText}`);
  };

  const handleTestScanError = (errorMessage: string) => {
    if (errorMessage.includes("NotAllowedError") || errorMessage.includes("NotFoundError") || errorMessage.includes("SecurityError")) {
      setTestScannerError(errorMessage);
      toast.error(`Test Scanner Error: ${errorMessage}`);
    } else {
      // console.warn("Non-critical test scan error:", errorMessage);
    }
  };


  return (
    <div className="flex min-h-screen bg-gray-100">
      {isAuthenticated && (
        <>
          {/* Top Bar (fixed position, content shifts with sidebar) */}
          <header className={`bg-white shadow-sm p-4 border-b border-gray-200 flex items-center fixed w-full top-0 z-30 transition-all duration-300 ease-in-out`}
            style={{ left: mainContentMl, width: `calc(100% - ${mainContentMl})` }}
          >
            {isMobileView ? ( // Mobile Header: Hamburger + Gym Central + Welcome (all in one row)
              <div className="flex items-center justify-between w-full">
                <button onClick={handleToggleSidebar} className="text-gray-800 focus:outline-none mr-4">
                  <Menu className="h-6 w-6" /> {/* Hamburger icon for mobile */}
                </button>
                <span className="text-xl font-extrabold text-teal-600">Gym Central</span> {/* Logo */}
                {user && (
                  <span className="text-lg font-semibold text-gray-800 ml-auto">Welcome, {user.username}!</span>
                )}
              </div>
            ) : ( // Desktop Header: Only Welcome (align right)
              user && (
                <span className="text-lg font-semibold text-gray-800 ml-auto">Welcome, {user.username}!</span>
              )
            )}
          </header>

          {/* Sidebar */}
          <aside
            ref={sidebarRef}
            className={`app-sidebar bg-gray-800 text-white flex flex-col shadow-lg z-20 transition-all duration-300 ease-in-out h-full
              ${isSidebarVisuallyExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'} /* Controls width & text opacity */
              ${isMobileView && !isSidebarOpen ? '-translate-x-full' : ''} /* Mobile: slide in/out based on isSidebarOpen */
            `}
            // Desktop hover behavior: only apply if not already explicitly open via click
            onMouseEnter={() => !isMobileView && !isSidebarOpen && setIsHovering(true)}
            onMouseLeave={() => !isMobileView && !isSidebarOpen && setIsHovering(false)}
          >
            {/* Sidebar Header (Gym Central Text Logo / Toggle Button) */}
            <div className={`p-4 text-3xl font-extrabold border-b border-gray-700 text-teal-400
              flex items-center justify-between overflow-hidden relative h-16
            `}>
              {/* Gym Central Text Logo (visible when expanded) */}
              {/* FIX: Concatenate Tailwind classes into className */}
              <span className={`whitespace-nowrap ${isSidebarVisuallyExpanded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100 ease-in-out`}>Gym Central</span>
              
              {/* Toggle button (Desktop: Arrow, Collapsed Desktop: Hamburger icon) */}
              {!isMobileView && (
                <button
                  onClick={handleToggleSidebar}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 text-white focus:outline-none sidebar-header-toggle-button`}
                >
                  {isSidebarOpen ?
                    <ChevronLeft size={24} className="lucide lucide-chevron-left" /> :
                    <Menu size={24} className="lucide lucide-menu" />
                  }
                </button>
              )}
            </div>

            {/* Navigation Links */}
            <nav className="flex-grow py-4">
              <ul className="space-y-1">
                {menuItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => isMobileView && setIsSidebarOpen(false)}
                      className={`
                        group flex items-center w-full py-3 px-4 rounded-md text-gray-300
                        hover:bg-gray-700 hover:text-white transition-colors duration-200 ease-in-out
                        ${location.pathname.startsWith(item.path) ? 'bg-gray-700 text-white' : ''}
                      `}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {/* FIX: Concatenate Tailwind classes into className */}
                      <span
                        className={`ml-3 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out
                          ${isSidebarVisuallyExpanded ? 'opacity-100 w-auto ml-3' : 'opacity-0 w-0 ml-0'}
                        `}
                      >
                        {item.label}
                      </span>
                      {!isMobileView && !isSidebarVisuallyExpanded && (
                        <span className="tooltip absolute left-full ml-4 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}               

              </ul>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-700 text-sm">
              <button
                onClick={logout}
                className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition-colors duration-200 ease-in-out"
              >
                {/* FIX: Concatenate Tailwind classes into className */}
                <span className={`${isSidebarVisuallyExpanded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100 ease-in-out`}>Logout</span>
              </button>
            </div>
          </aside>

          {/* Overlay for mobile */}
          {isMobileView && isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-10"
              onClick={() => setIsSidebarOpen(false)}
            ></div>
          )}

          {/* Main content area */}
          <div className={`flex-grow flex flex-col transition-all duration-300 ease-in-out`}
            style={{ marginLeft: mainContentMl, marginTop: isMobileView ? '64px' : '0px' }}
          >
            <main className="flex-grow p-6 overflow-auto" style={{ paddingTop: 'var(--topbar-height)' }}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
                <Route path="/trainers" element={<PrivateRoute><TrainersPage /></PrivateRoute>} />
                <Route path="/plans" element={<PrivateRoute><MembershipPlansPage /></PrivateRoute>} />
                <Route path="/attendance" element={<PrivateRoute><AttendancePage /></PrivateRoute>} />

                {/* NEW TEMPORARY TEST ROUTE FOR QR SCANNER */}
                <Route path="/test-qr-scanner" element={
                  <PrivateRoute>
                    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">QR Scanner Test Environment</h2>
                        {testScannedUserId && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                                <strong className="font-bold">Last Scanned:</strong>
                                <span className="block sm:inline ml-2">{testScannedUserId}</span>
                            </div>
                        )}
                        <QrCodeScanner
                            onScanSuccess={handleTestScanSuccess}
                            onScanError={handleTestScanError}
                            qrCodeError={testScannerError}
                            showScanner={true}
                        />
                        <button
                          onClick={() => { setTestScannedUserId(null); setTestScannerError(null); }}
                          className="mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                        >
                            Reset Test Display
                        </button>
                    </div>
                  </PrivateRoute>
                } />


                {/* Fallback for undefined routes */}
                <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
              </Routes>
            </main>
          </div>
        </>
      )}
      {!isAuthenticated && (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default App;