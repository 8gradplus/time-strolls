// Who is using the admin. The API decides: GET /api/admin/me answers without a
// token locally (AUTH_MODE=local: nobody signs in), with a token for invited
// people, and 401 otherwise.
//
// status: checking | local | signedIn | signedOut | notInvited | failed
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { adminApi, adminFetch } from "./api";
import { completeSignIn, hasSession, signIn, signOut } from "./auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ status: "checking", me: null });
  const location = useLocation();
  const navigate = useNavigate();
  const callback = location.pathname === "/admin/callback";

  const check = useCallback(async ({ justSignedIn = false } = {}) => {
    try {
      const me = await adminFetch(adminApi.me);
      setState({ status: hasSession() ? "signedIn" : "local", me });
    } catch (error) {
      if (error.status !== 401) {
        setState({ status: "failed", me: null, error });
      } else if (justSignedIn || hasSession()) {
        // signed in with Google, but no invitation (or no role any more)
        signOut();
        setState({ status: "notInvited", me: null });
      } else {
        setState({ status: "signedOut", me: null });
      }
    }
  }, []);

  useEffect(() => {
    if (!callback) {
      check();
      return;
    }
    let cancelled = false;
    completeSignIn()
      .then((back) => {
        if (cancelled) return;
        navigate(back, { replace: true });
        return check({ justSignedIn: true });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "failed", me: null, error });
      });
    return () => {
      cancelled = true;
    };
    // the callback is handled once, when the page opens with it
  }, []);

  const value = {
    ...state,
    signIn: () => signIn(callback ? "/admin" : location.pathname),
    signOut: () => {
      signOut();
      setState({ status: "signedOut", me: null });
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
