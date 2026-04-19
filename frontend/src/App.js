import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import Dashboard from "@/pages/Dashboard";
import WatchRoom from "@/pages/WatchRoom";
import { Toaster } from "sonner";
import "@/App.css";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="glass-card rounded-3xl p-8 animate-pulse-soft">
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
          <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/watch" element={<ProtectedRoute><WatchRoom /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
