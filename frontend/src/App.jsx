import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./hooks/useQueueStore";
import { LangProvider } from "./lib/i18n";
import Layout from "./components/Layout";
import { ToastContainer } from "./components/Layout";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import PatientDashboard from "./pages/patient/PatientDashboard";
import BookAppointment from "./pages/patient/BookAppointment";
import MyVisits from "./pages/patient/MyVisits";
import QueueBoard from "./pages/reception/QueueBoard";
import WalkIn from "./pages/reception/WalkIn";
import Appointments from "./pages/reception/Appointments";
import ProviderQueue from "./pages/provider/ProviderQueue";
import Overview from "./pages/admin/Overview";
import AdminQueueBoard from "./pages/admin/AdminQueueBoard";
import SettingsServices from "./pages/admin/SettingsServices";
import Providers from "./pages/admin/Providers";
import Simulator from "./pages/admin/Simulator";
import PublicStatus from "./pages/PublicStatus";
import "./index.css";

function ProtectedRoute({ children, allowedRoles }) {
  const storedUser = JSON.parse(localStorage.getItem("mediq_user") || "null");
  if (!storedUser) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(storedUser.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("mediq_user") || "null")
  );

  const login = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem("mediq_user", JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("mediq_user");
  }, []);

  return (
    <LangProvider>
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          {/* Public marketing & onboarding routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/status/:tokenNo" element={<PublicStatus />} />

          {/* Patient routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/book" element={<BookAppointment />} />
            <Route path="/patient/visits" element={<MyVisits />} />
            <Route path="/patient" element={<Navigate to="/patient/dashboard" replace />} />
          </Route>

          {/* Receptionist routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["receptionist"]}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/reception/queue" element={<QueueBoard />} />
            <Route path="/reception/walkin" element={<WalkIn />} />
            <Route path="/reception/appointments" element={<Appointments />} />
          </Route>

          {/* Provider routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["provider"]}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/provider/queue" element={<ProviderQueue />} />
          </Route>

          {/* Admin routes */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin/overview" element={<Overview />} />
            <Route path="/admin/queue" element={<AdminQueueBoard />} />
            <Route path="/admin/settings" element={<SettingsServices />} />
            <Route path="/admin/providers" element={<Providers />} />
            <Route path="/admin/simulator" element={<Simulator />} />
          </Route>

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
    </LangProvider>
  );
}
