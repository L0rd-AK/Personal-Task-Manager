import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Board from './pages/Board';
import Login from './components/Login';
import { useAuthStore } from './stores/authStore';

// Auth context for compatibility
interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  user: { email: string; name: string } | null;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

function App() {
  const { user, isAuthenticated, loading, login, logout, checkAuth } = useAuthStore();

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Create auth context value for compatibility with existing components
  const authValue: AuthContextType = {
    isAuthenticated,
    login: async (email: string, password: string) => {
      await login({ email, password });
    },
    logout,
    user: user ? { email: user.email, name: user.name } : null
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />

          {!isAuthenticated ? (
            <Login onSuccess={() => {}} />
          ) : (
            <Routes>
              <Route path="/" element={<Board />} />
              <Route path="/board" element={<Board />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export { AuthContext };
export default App;
