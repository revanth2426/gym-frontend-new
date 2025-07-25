// src/App.tsx - REVISED COMPLETE & FINAL VERSION with Gemini-like Collapsible Sidebar
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import icons (ensure lucide-react is installed: npm install lucide-react)
import {
  LayoutDashboard, Users, UserCog, Package, CalendarCheck, // Lucide icons for nav
  Menu, // Hamburger icon for toggle
  ChevronLeft, ChevronRight // Arrows for desktop toggle
} from 'lucide-react';

// Import your page components
import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import UsersPage from './pages/UsersPage.tsx';
import TrainersPage from './pages/TrainersPage.tsx';
import MembershipPlansPage from './pages/MembershipPlansPage.tsx';
import AttendancePage from './pages/AttendancePage.tsx';

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
  const location = useLocation(); // Hook to get current path for active link highlighting

  // isSidebarOpen: Master state. True if sidebar is expanded (either pinned or mobile open). False if collapsed (desktop) or hidden (mobile).
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default to collapsed on desktop, hidden on mobile
  // isMobileView: Detects if screen is smaller than md breakpoint (768px)
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  // isHovering: Tracks mouse hover for desktop TEMPORARY expansion (only relevant if not isSidebarOpen)
  const [isHovering, setIsHovering] = useState(false);

  const sidebarRef = useRef<HTMLElement>(null); // Ref for sidebar for click outside on mobile

  // Effect for responsive behavior and initial state
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      setIsMobileView(newIsMobile);
      if (!newIsMobile) {
        // On desktop, default to collapsed state on resize, unless it's already explicitly open.
        setIsSidebarOpen(false); // Sidebar starts collapsed on desktop
      } else {
        // On mobile, ensure sidebar starts hidden/collapsed on resize
        setIsSidebarOpen(false); // Force hide on mobile
      }
      setIsHovering(false); // Reset hover state on resize
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]); // Re-run effect if isSidebarOpen changes, to re-evaluate resize logic


  // Effect to handle clicks outside sidebar on mobile (only when sidebar is open)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // FIX: If sidebar is explicitly open AND click is outside (whether mobile or desktop)
      if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false); // Close sidebar
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen, isMobileView]); // Dependencies for this effect

  // Function to toggle the sidebar (click on hamburger/arrow)
  const handleToggleSidebar = () => {
    setIsSidebarOpen(prev => !prev); // Toggle the sidebar's main state
    setIsHovering(false); // Stop hovering effect immediately on click toggle
  };

  // Determine the *effective* width of the sidebar for UI elements
  // This is true if it's explicitly open, OR if it's desktop and currently being hovered.
  const isSidebarVisuallyExpanded = isSidebarOpen || (isHovering && !isMobileView);

  // Calculate dynamic left margin for main content and width for top bar
  const mainContentMl = isMobileView ? '0px' : (isSidebarVisuallyExpanded ? 'var(--sidebar-expanded-width)' : 'var(--sidebar-collapsed-width)');


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-700">
        <p className="text-lg">Loading application...</p>
      </div>
    );
  }

  // Nav menu items
  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Members', path: '/users', icon: Users },
    { label: 'Trainers', path: '/trainers', icon: UserCog },
    { label: 'Plans', path: '/plans', icon: Package },
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
  ];

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
            {/* Sidebar Header (Gym Central Logo / Toggle Button) */}
            <div className={`p-4 text-3xl font-extrabold border-b border-gray-700 text-teal-400
              flex items-center justify-between overflow-hidden relative h-16
            `}>
              {/* Gym Central Text Logo (visible when expanded) */}
              <span className={`whitespace-nowrap ${isSidebarVisuallyExpanded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100 ease-in-out`}>Gym Central</span>
              
              {/* Toggle button (Desktop: Arrow, Collapsed Desktop: Hamburger icon) */}
              {/*!isMobileView && ( // Only show toggle button on desktop
                <button
                  onClick={handleToggleSidebar}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 text-white focus:outline-none transition-opacity duration-200 sidebar-header-toggle-button`}
                  // Show arrow if expanded, or fade in on hover if collapsed
                  style={{ opacity: isSidebarVisuallyExpanded ? 1 : 0, pointerEvents: isSidebarVisuallyExpanded ? 'auto' : 'none' }}
                >
                  {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
                </button>
              )*/}
               {/* Fixed Collapsed Menu Icon (only on desktop when collapsed and not hovering) */}
              {!isMobileView && !isSidebarVisuallyExpanded && ( // isSidebarVisuallyExpanded controls if this is visible
                  <Menu className="h-8 w-8 text-teal-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-100" />
              )}
            </div>

            {/* REMOVED: Welcome Message Section from Sidebar */}

            {/* Navigation Links */}
            <nav className="flex-grow py-4">
              <ul className="space-y-1">
                {menuItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => isMobileView && setIsSidebarOpen(false)} // Close sidebar on mobile click
                      className={`
                        group flex items-center w-full py-3 px-4 rounded-md text-gray-300
                        hover:bg-gray-700 hover:text-white transition-colors duration-200 ease-in-out
                        ${location.pathname.startsWith(item.path) ? 'bg-gray-700 text-white' : ''} /* Active item highlight */
                      `}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" /> {/* Icon */}
                      {/* Text label for menu item - hides/shows */}
                      <span
                        className={`ml-3 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out
                          ${isSidebarVisuallyExpanded ? 'opacity-100 w-auto ml-3' : 'opacity-0 w-0 ml-0'}
                        `}
                      >
                        {item.label}
                      </span>
                      {/* Tooltip for collapsed desktop view (only when not mobile and not expanded) */}
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
                <span className={isSidebarVisuallyExpanded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100 ease-in-out>Logout</span>
              </button>
            </div>
          </aside>

          {/* Overlay for mobile (closes sidebar on click) */}
          {isMobileView && isSidebarOpen && ( // Only show if mobile and sidebar is open
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-10"
              onClick={() => setIsSidebarOpen(false)} // Close sidebar on overlay click
            ></div>
          )}

          {/* Main content area */}
          <div className={`flex-grow flex flex-col transition-all duration-300 ease-in-out`}
            style={{ marginLeft: mainContentMl, marginTop: isMobileView ? '64px' : '0px' }} /* Adjust top margin for mobile header */
          >
            {/* The actual main content goes here, rendered by React Router */}
            <main className="flex-grow p-6 overflow-auto" style={{ paddingTop: 'var(--topbar-height)' /* Always ensure padding for fixed topbar */ }}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
                <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
                <Route path="/trainers" element={<PrivateRoute><TrainersPage /></PrivateRoute>} />
                <Route path="/plans" element={<PrivateRoute><MembershipPlansPage /></PrivateRoute>} />
                <Route path="/attendance" element={<PrivateRoute><AttendancePage /></PrivateRoute>} />

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