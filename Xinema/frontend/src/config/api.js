// API Configuration
// This file centralizes all backend API endpoint configuration

// Determine the backend URL based on environment
// In production or when accessing from another network, set this to your public IP
// For local development, use localhost
const getBackendUrl = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Check for environment variable or use hostname
    const hostname = window.location.hostname;

    // If accessing from localhost, use localhost for backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }

    // If accessing from a specific IP or domain, use that
    // You can also set this via environment variable or localStorage
    const customBackend = localStorage.getItem('backendUrl');
    if (customBackend) {
      return customBackend;
    }

    // Default: use the same hostname as the frontend
    // This works if frontend and backend are on the same machine
    return `http://${hostname}:5000`;
  }

  // Fallback for server-side rendering
  return process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
};

export const API_BASE_URL = getBackendUrl();

// Helper function to build API endpoints
export const apiUrl = endpoint => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/api/${cleanEndpoint}`;
};

// Specific endpoint builders
export const apiEndpoints = {
  files: () => apiUrl('files'),
  video: (character, filename) => apiUrl(`video/${character}/${filename}`),
  thumbnail: (character, filename) =>
    apiUrl(`thumbnail/${character}/${filename}`),
  duration: (character, filename) =>
    apiUrl(`duration/${character}/${filename}`),
  frame: (character, filename, frameNumber) =>
    apiUrl(`frame/${character}/${encodeURIComponent(filename)}/${frameNumber}`),
  frameDirect: (character, filename, frameNumber) =>
    apiUrl(
      `frame-direct/${character}/${encodeURIComponent(filename)}/${frameNumber}`
    ),
  prerender: () => apiUrl('prerender'),
  prerenderTest: () => apiUrl('prerender-test'),
  test: () => apiUrl('test'),
  videoInfo: (character, filename) =>
    apiUrl(`video-info/${character}/${filename}`),
  clipThumbnails: () => apiUrl('clip-thumbnails'),
  matchScript: () => apiUrl('match-script'),
};

// Export for use in components
export default apiEndpoints;
