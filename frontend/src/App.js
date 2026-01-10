/**
 * @fileoverview The root component of the application.
 *
 * This file sets up the entire application structure, including:
 * - Global state management providers (React Query, Auth, Cart).
 * - The main router for all application pages.
 * - The logic for protecting routes that require authentication.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast'; // For displaying notifications
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// --- Page Components ---
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Customers from './pages/Customers';
import Commissions from './pages/Commissions';
import Channels from './pages/Channels';
import ApiLogs from './pages/ApiLogs';

// --- Layout Component ---
import Layout from './components/Layout'; // The main layout wrapper with sidebar and header

// Initialize a new React Query client for data fetching, caching, and state management.
const queryClient = new QueryClient();

/**
 * A wrapper component that protects routes requiring authentication.
 * It checks the authentication state from the `useAuth` context.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to render if the user is authenticated.
 * @returns {React.ReactElement} The child components, a loading spinner, or a redirect to the login page.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // While the authentication status is being checked, display a loading spinner.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="spinner"></div> {/* A simple CSS spinner */}
      </div>
    );
  }

  // If loading is complete and there is no user, redirect to the login page.
  // The `replace` prop prevents the user from navigating back to the protected route.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If a user is authenticated, render the requested child components.
  return children;
};

/**
 * The main App component that orchestrates all providers and routes.
 */
function App() {
  return (
    // 1. React Query Provider: Makes the queryClient available to all child components.
    <QueryClientProvider client={queryClient}>
      {/* 2. Auth Provider: Manages global authentication state (user, token, login/logout). */}
      <AuthProvider>
        {/* 3. Cart Provider: Manages shopping cart state (optional, for e-commerce features). */}
        <CartProvider>
          {/* 4. Router: Handles all client-side routing. */}
          <Router>
            {/* Toaster provides a place to render toast notifications globally. */}
            <Toaster position="top-right" containerStyle={{ zIndex: 9999 }} />
            
            <Routes>
              {/* --- Public Route --- */}
              {/* The login page is accessible to everyone. */}
              <Route path="/login" element={<Login />} />

              {/* --- Protected Routes --- */}
              {/* All routes nested under this path are protected by `ProtectedRoute`. */}
              {/* They share the common `Layout` component (sidebar, header, etc.). */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* The index route for the root path ('/'). */}
                <Route index element={<Dashboard />} />
                
                {/* Other nested protected routes. */}
                <Route path="products" element={<Products />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<OrderDetail />} />
                <Route path="customers" element={<Customers />} />
                <Route path="commissions" element={<Commissions />} />
                <Route path="channels" element={<Channels />} />
                <Route path="logs" element={<ApiLogs />} />
              </Route>

              {/* --- Catch-all Route --- */}
              {/* If no other route matches, redirect the user to the homepage. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
