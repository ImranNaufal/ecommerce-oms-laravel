/**
 * @fileoverview Manages global authentication state for the application.
 *
 * This file provides an `AuthProvider` component and a `useAuth` hook
 * to handle user authentication, including login, logout, registration,
 * and persisting session state across page reloads.
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api'; // The pre-configured axios instance
import toast from 'react-hot-toast'; // For user feedback notifications

// 1. Create the Authentication Context
// This context will hold the authentication state and functions.
const AuthContext = createContext();

/**
 * Custom hook to easily access the AuthContext.
 * It ensures that the hook is used within a component wrapped by AuthProvider.
 * @returns {object} The authentication context value.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * The provider component that wraps the application and makes the auth context available.
 * It contains all the state and logic for authentication.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to render.
 */
export const AuthProvider = ({ children }) => {
  // State for the currently logged-in user object.
  const [user, setUser] = useState(null);
  // State to track the initial authentication check.
  const [loading, setLoading] = useState(true);

  // On initial application load, check if the user is already authenticated.
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Checks for an existing token in localStorage and validates it with the backend.
   * This function allows the user's session to persist across browser refreshes.
   */
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      // If there's no token, there's nothing to check.
      if (!token) {
        return; // setLoading will be handled in `finally`
      }

      // If a token exists, verify it by fetching the user's profile.
      // The axios interceptor in `api.js` automatically adds the token to the header.
      const response = await api.get('/auth/me');
      
      if (response.data.success) {
        // If the token is valid, set the user state.
        setUser(response.data.user);
      }
    } catch (error) {
      // If the API call fails (e.g., token expired or invalid), remove the stale token.
      console.error("Authentication check failed:", error);
      localStorage.removeItem('token');
    } finally {
      // Regardless of the outcome, set loading to false after the check is complete.
      setLoading(false);
    }
  };

  /**
   * Handles the user login process.
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   * @returns {Promise<boolean>} True on successful login, false otherwise.
   */
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { token, user } = response.data;
        // Store the token in localStorage for session persistence.
        localStorage.setItem('token', token);
        // Set the user object in the state.
        setUser(user);
        toast.success('Login successful!');
        return true;
      }
      return false; // Should not be reached if API is consistent
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      return false;
    }
  };

  /**
   * Logs the user out by clearing the session data.
   */
  const logout = () => {
    // Remove the token from localStorage.
    localStorage.removeItem('token');
    // Clear the user from the state.
    setUser(null);
    toast.success('You have been logged out.');
  };

  /**
   * Handles the user registration process.
   * @param {object} userData - The user's registration details (username, email, etc.).
   * @returns {Promise<boolean>} True on successful registration, false otherwise.
   */
  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        toast.success('Registration successful! Please log in.');
        return true;
      }
      return false;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      return false;
    }
  };

  // The value object provided to all consumer components of this context.
  const value = {
    user,
    loading,
    login,
    logout,
    register
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
