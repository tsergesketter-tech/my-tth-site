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
// --- Protect routes ---
function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation() as any;

  if (state.status !== "authenticated") {
    const payload = {
      from: { pathname: location.pathname, search: location.search || "" },
      ctx: location.state?.ctx ?? null,
    };
    sessionStorage.setItem("postLogin", JSON.stringify(payload));
    return <Navigate to="/login" replace state={payload} />;
  }
  return <>{children}</>;
}

// --- Login page (redirects after success) ---
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;

  const stored =
    (location.state as any) ||
    JSON.parse(sessionStorage.getItem("postLogin") || "null");

  const targetPath = stored?.from?.pathname ?? "/member";
  const targetSearch = stored?.from?.search ?? "";
  const ctx = stored?.ctx ?? null;

  return (
    <div style={{ padding: 24 }}>
      <LoginCard
        onSuccess={() => {
          sessionStorage.removeItem("postLogin");
          navigate(`${targetPath}${targetSearch}`, {
            replace: true,
            state: ctx ? { ctx } : undefined,
          });
        }}
      />
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
