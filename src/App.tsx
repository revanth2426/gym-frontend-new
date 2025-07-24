// src/App.tsx
import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import { ToastContainer } from 'react-toastify'; // NEW IMPORT
import 'react-toastify/dist/ReactToastify.css';

// Import your page components (ensure .tsx extension if not already there)
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">
             Loading authentication...
           </div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const { isAuthenticated, logout, user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-700">
             <p className="text-lg">Loading application...</p>
           </div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {isAuthenticated && (
        <aside className="w-64 bg-gray-800 text-white flex flex-col shadow-lg z-10"> {/* Added shadow-lg, z-10 */}
          <div className="p-4 text-3xl font-extrabold border-b border-gray-700 text-teal-400"> {/* Enhanced styling */}
            Gym Central
          </div>
          <nav className="flex-grow py-4"> {/* Added py-4 */}
            <ul className="space-y-1"> {/* Adjusted space-y */}
              <li>
                <Link to="/dashboard" className="flex items-center p-3 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 ease-in-out"> {/* More refined styling */}
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0l7 7 7 7M19 14v6a1 1 0 001 1h3m-9-16v6a1 1 0 001 1h3m-9-11l2-2m0 0l7-7 7 7M3 12h18"></path></svg>
                    Dashboard
                </Link>
              </li>
              <li>
                <Link to="/users" className="flex items-center p-3 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 ease-in-out">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H9a1 1 0 01-1-1v-1a4 4 0 014-4h.292m-5.375 2.569A4 4 0 019 20h1"></path></svg>
                    Members
                </Link>
              </li>
              <li>
                <Link to="/trainers" className="flex items-center p-3 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 ease-in-out">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Trainers
                </Link>
              </li>
              <li>
                <Link to="/plans" className="flex items-center p-3 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 ease-in-out">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Plans
                </Link>
              </li>
              <li>
                <Link to="/attendance" className="flex items-center p-3 rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200 ease-in-out">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h.01M17 11h.01M9 15h.01M15 15h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Attendance
                </Link>
              </li>
            </ul>
          </nav>
          <div className="p-4 border-t border-gray-700 text-sm">
            {user && <p className="text-gray-400">Logged in as: <span className="font-semibold text-white">{user.username}</span></p>}
            <button onClick={logout} className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition-colors duration-200 ease-in-out">
              Logout
            </button>
          </div>
        </aside>
      )}

      <div className="flex-grow flex flex-col"> {/* New wrapper for header and main content */}
        {isAuthenticated && (
          <header className="bg-white shadow-sm p-4 border-b border-gray-200 flex items-center justify-between z-0">
            <h1 className="text-xl font-semibold text-gray-800">Welcome, {user?.username}!</h1>
            {/* Could add more header content here */}
          </header>
        )}
        <main className="flex-grow p-6 overflow-auto"> {/* Added overflow-auto */}
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

      <ToastContainer
      position="bottom-right" // Position of toasts
      autoClose={3000}       // Close after 3 seconds
      hideProgressBar={false} // Show progress bar
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