// App.tsx
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  Link,
} from "react-router-dom";
import React, { ReactNode } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Promotions from "./pages/Promotions";
import MemberPage from "./pages/Member";
import CreditCards from "./pages/CreditCardNew";
import SearchResults from "./pages/SearchResults";
import Checkout from "./pages/Checkout";
import Confirmation from "./pages/Confirmation";
import StayDetail from "./pages/StayDetail";
import LoginCard, { useAuth } from "./components/LoginCard";

// --- Protect routes ---
function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

// --- Login page (redirects after success) ---
function LoginPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname ?? "/member";
  return (
    <div style={{ padding: 24 }}>
      <LoginCard onSuccess={() => navigate(from, { replace: true })} />
      <p style={{ marginTop: 12 }}>
        <Link to="/">← Back to home</Link>
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/promotions" element={<Promotions />} />
        <Route path="/credit-cards" element={<CreditCards />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/stay/:id" element={<StayDetail />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route
          path="/member"
          element={
            <RequireAuth>
              <MemberPage />
            </RequireAuth>
          }
        />
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <Checkout />
            </RequireAuth>
          }
        />
        <Route
          path="/confirmation"
          element={
            <RequireAuth>
              <Confirmation />
            </RequireAuth>
          }
        />

        {/* keep this LAST */}
        <Route
          path="*"
          element={<div style={{ padding: 24 }}>Route not found: {window.location.pathname}</div>}
        />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
