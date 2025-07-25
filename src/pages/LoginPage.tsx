// src/pages/LoginPage.tsx - COMPLETE & FINAL VERSION (Login Page Centering Fix)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosConfig'; // Import your configured Axios instance
import { toast } from 'react-toastify'; // Import toast for consistent feedback


const LoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false); // For loading state


  const { login } = useAuth(); // Get the login function from AuthContext
  const navigate = useNavigate(); // Hook to navigate programmatically


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior (page reload)
    setLoading(true); // Set loading state
    // Clear any previous toasts
    toast.dismiss();


    try {
      const response = await axiosInstance.post('/auth/login', {
        username,
        password,
      });


      const { token, username: loggedInUsername, message } = response.data;


      if (token) {
        login(token, loggedInUsername); // Update authentication state
        toast.success(message || 'Login successful!'); // Show success toast
        navigate('/dashboard'); // Redirect to dashboard on successful login
      } else {
        toast.error(message || 'Login failed. Please check your credentials.'); // Show error toast
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message); // Display error message from backend
      } else {
        toast.error('An unexpected error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false); // Reset loading state
    }
  };


  return (
    // FIX: Removed min-h-screen from here. The parent 'main' in App.tsx will handle centering.
    <div className="bg-gray-100 p-4 sm:p-6 lg:p-8 w-full h-full flex items-center justify-center mt-20 sm:mt-26"> {/* Added flex, items-center, justify-center to center the card within this div */}
      <div className="bg-white p-8 sm:p-10 rounded-lg shadow-xl w-full max-w-md transform transition-transform duration-300 ease-in-out hover:scale-[1.01]"> {/* Removed mx-auto my-0 as flex on parent will handle centering */}
        <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-8">Gym Admin Login</h2>


        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="username" className="block text-gray-700 text-sm font-semibold mb-2">
              Username:
            </label>
            <input
              type="text"
              id="username"
              className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>


          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">
              Password:
            </label>
            <input
              type="password"
              id="password"
              className="shadow-sm appearance-none border border-gray-300 rounded-lg w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>


          <div className="flex items-center justify-center">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default LoginPage;
