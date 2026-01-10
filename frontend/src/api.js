/**
 * @fileoverview Centralized API configuration for the frontend application.
 *
 * This file configures a reusable Axios instance for all API communications.
 * It sets the base URL and includes an interceptor to automatically attach
 * the JSON Web Token (JWT) to authorization headers, streamlining API calls
 * throughout the app.
 */

import axios from 'axios';

// The base URL for all API requests.
// Using a constant ensures consistency and makes it easy to update if the API endpoint changes.
// It defaults to the production URL but can be overridden for local development.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'; 

/**
 * The configured Axios instance.
 * Components should import this instance to make API requests instead of using axios directly.
 */
const api = axios.create({
  baseURL: API_URL,
});

/**
 * Axios request interceptor.
 * This function is automatically called before any request is sent.
 * Its purpose is to check for a JWT in localStorage and, if found,
 * attach it to the request's 'Authorization' header.
 *
 * This automates the authentication process for protected API endpoints.
 */
api.interceptors.request.use((config) => {
  // Retrieve the token from localStorage.
  const token = localStorage.getItem('token');
  
  // If a token exists, add it to the request configuration as a Bearer token.
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Return the modified config so the request can proceed.
  return config;
}, (error) => {
  // Handle any errors that occur during the request setup.
  return Promise.reject(error);
});

export default api;
