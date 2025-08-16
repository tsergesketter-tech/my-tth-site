import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ---------- Demo user & fake backend ----------
type Role = "member" | "admin";
export type AuthUser = { id: string; email: string; name: string; role: Role };

const DEMO_USER: AuthUser & { password: string } = {
  id: "u_demo_001",
  email: "demo@example.com",
  name: "Demo User",
  role: "member",
  password: "LetMeIn123!",
};

function mockLogin(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  return new Promise((resolve, reject) => {
    // Simulate network + simple email normalization
    setTimeout(() => {
      const ok =
        email.trim().toLowerCase() === DEMO_USER.email &&
        password === DEMO_USER.password;
      if (!ok) {
        reject(new Error("Invalid email or password"));
        return;
      }
      // Fake JWT (don’t use in prod)
      const token = btoa(
        JSON.stringify({
          sub: DEMO_USER.id,
          email: DEMO_USER.email,
          iat: Date.now(),
        })
      );
      const { password: _omit, ...user } = DEMO_USER;
      resolve({ token, user });
    }, 800);
  });
}

// ---------- Auth context ----------
type AuthStatus = "anonymous" | "authenticating" | "authenticated";
type AuthState = { status: AuthStatus; user: AuthUser | null; token: string | null };

type AuthContextValue = {
  state: AuthState;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_TOKEN = "auth.token";
const STORAGE_USER = "auth.user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "anonymous",
    user: null,
    token: null,
  });

  // Hydrate from storage (prefer localStorage, fall back to sessionStorage)
  useEffect(() => {
    const read = (k: string) =>
      localStorage.getItem(k) ?? sessionStorage.getItem(k);
    const token = read(STORAGE_TOKEN);
    const userRaw = read(STORAGE_USER);
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as AuthUser;
        setState({ status: "authenticated", user, token });
      } catch {
        // ignore bad JSON
      }
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      state,
      async login(email, password, remember) {
        setState((s) => ({ ...s, status: "authenticating" }));
        const { token, user } = await mockLogin(email, password);
        // Persist
        const store = remember ? localStorage : sessionStorage;
        store.setItem(STORAGE_TOKEN, token);
        store.setItem(STORAGE_USER, JSON.stringify(user));
        // Also clear from the other store to avoid confusion
        (remember ? sessionStorage : localStorage).removeItem(STORAGE_TOKEN);
        (remember ? sessionStorage : localStorage).removeItem(STORAGE_USER);
        setState({ status: "authenticated", user, token });
      },
      logout() {
        localStorage.removeItem(STORAGE_TOKEN);
        localStorage.removeItem(STORAGE_USER);
        sessionStorage.removeItem(STORAGE_TOKEN);
        sessionStorage.removeItem(STORAGE_USER);
        setState({ status: "anonymous", user: null, token: null });
      },
    };
  }, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

// ---------- Login UI ----------
type FormState =
  | "idle"
  | "validating"
  | "submitting"
  | "success"
  | "error"
  | "locked";

export default function LoginCard({
  onSuccess,
}: {
  onSuccess?: (user: AuthUser) => void;
}) {
  const { state: authState, login } = useAuth();

  // Controlled inputs
  const [email, setEmail] = useState(DEMO_USER.email);
  const [password, setPassword] = useState(DEMO_USER.password);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lockout logic
  const attemptsRef = useRef(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number>(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const ms = Math.max(0, lockedUntil - Date.now());
      setLockCountdown(Math.ceil(ms / 1000));
      if (ms <= 0) {
        setLockedUntil(null);
        setFormState("idle");
        attemptsRef.current = 0;
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [lockedUntil]);

  // Helpers
  const isLocked = formState === "locked";
  const canSubmit =
    !isLocked &&
    formState !== "submitting" &&
    email.trim().length > 0 &&
    password.length > 0;

  function validateEmailFormat(e: string) {
    // Basic RFC5322-ish test (good enough for client-side)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (isLocked) return;

    setErrorMsg(null);
    setFormState("validating");

    // Simple client validations
    if (!validateEmailFormat(email)) {
      setFormState("error");
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setFormState("error");
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setFormState("submitting");
    try {
      await login(email, password, remember);
      setFormState("success");
      onSuccess?.(DEMO_USER);
    } catch (err) {
      attemptsRef.current += 1;
      const remaining = Math.max(0, 3 - attemptsRef.current);
      const base = err instanceof Error ? err.message : "Login failed";
      if (remaining === 0) {
        // 30s lockout
        const until = Date.now() + 30_000;
        setLockedUntil(until);
        setFormState("locked");
        setErrorMsg(
          "Too many failed attempts. Please wait before trying again."
        );
      } else {
        setFormState("error");
        setErrorMsg(`${base}. ${remaining} attempt(s) remaining.`);
      }
    }
  }

  const statusLabel =
    formState === "idle"
      ? "Idle"
      : formState === "validating"
      ? "Validating"
      : formState === "submitting"
      ? "Signing in…"
      : formState === "success"
      ? "Success"
      : formState === "locked"
      ? `Locked (${lockCountdown}s)`
      : "Error";

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "48px auto",
        padding: 24,
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        background: "#fff",
        fontFamily:
          '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      }}
      aria-live="polite"
    >
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
        Sign in to your account
      </h2>
      <p style={{ marginTop: 6, color: "#555" }}>
        Use <code>{DEMO_USER.email}</code> / <code>{DEMO_USER.password}</code>
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          placeholder="you@example.com"
          aria-invalid={formState === "error" && !!errorMsg}
          disabled={isLocked || formState === "submitting"}
          style={inputStyle}
        />

        <div style={{ height: 12 }} />

        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          Password
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder="••••••••"
            disabled={isLocked || formState === "submitting"}
            style={{ ...inputStyle, paddingRight: 88 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-pressed={showPassword}
            disabled={isLocked || formState === "submitting"}
            style={ghostButtonStyle}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.currentTarget.checked)}
              disabled={isLocked || formState === "submitting"}
            />
            <span>Remember me</span>
          </label>

          <button
            type="button"
            onClick={() => alert("Forgot password flow not implemented")}
            style={{ ...linkButtonStyle }}
          >
            Forgot password?
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 10,
              background: "#fff2f2",
              color: "#b00020",
              fontSize: 14,
              lineHeight: 1.3,
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...primaryButtonStyle,
            opacity: canSubmit ? 1 : 0.6,
            cursor: canSubmit ? "pointer" : "not-allowed",
            marginTop: 16,
          }}
        >
          {formState === "submitting" ? (
            <Spinner />
          ) : formState === "success" ? (
            "Signed in ✓"
          ) : isLocked ? (
            `Locked (${lockCountdown}s)`
          ) : (
            "Sign in"
          )}
        </button>

        <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
          State: <strong>{statusLabel}</strong>
          {authState.status === "authenticated" && authState.user && (
            <>
              {" "}
              — Hello, <strong>{authState.user.name}</strong>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

// ---------- Small UI bits ----------
function Spinner() {
  return (
    <span
      aria-label="Loading"
      style={{
        display: "inline-block",
        width: 18,
        height: 18,
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        verticalAlign: "-3px",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

// Inline styles so you don’t need Tailwind or extra CSS right now.
const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d6d6d6",
  outline: "none",
  fontSize: 14,
};

const ghostButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: 6,
  top: 6,
  border: "1px solid #ddd",
  padding: "6px 10px",
  background: "#fafafa",
  borderRadius: 8,
  fontSize: 12,
  cursor: "pointer",
};

const linkButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#2a65ff",
  padding: 0,
  fontSize: 14,
  textDecoration: "underline",
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  padding: "12px 14px",
  borderRadius: 12,
  background: "#2a65ff",
  color: "white",
  fontWeight: 700,
  fontSize: 15,
};

// Add a keyframes style tag (for the spinner) once on first import
const styleTagId = "__login_card_keyframes__";
if (typeof document !== "undefined" && !document.getElementById(styleTagId)) {
  const tag = document.createElement("style");
  tag.id = styleTagId;
  tag.textContent = `@keyframes spin {from{transform:rotate(0)} to{transform:rotate(360deg)}}`;
  document.head.appendChild(tag);
}
