// The admin (ROADMAP.md, step 5): its own lazy chunk at /admin, never loaded
// by the map. Invited people sign in with Google; locally nobody signs in.
// It follows the colour mode and the app's language.
import { useEffect } from "react";
import {
  Link as RouterLink,
  NavLink,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { LogoDisc } from "../Components/Wordmark";
import { LanguageSwitch, ModeButton, Plain } from "../Components/Preferences";
import { Icon } from "../icons";
import { useLanguage } from "../LanguageContext";
import { serif } from "../theme";
import { AuthProvider, useAuth } from "./AuthContext";
import Accounts from "./accounts/Accounts";
import Import from "./import/Import";
import Mine from "./accounts/Mine";
import Review from "./review/Review";

const Brand = () => {
  const { t } = useLanguage();
  return (
    <Link
      component={RouterLink}
      to="/admin"
      underline="none"
      color="inherit"
      sx={{ display: "flex", alignItems: "center", gap: 1 }}
    >
      <LogoDisc size="26px" />
      <Box
        component="span"
        translate="no"
        sx={{ fontFamily: serif, fontWeight: 600, fontSize: 22, lineHeight: 1 }}
      >
        Time Strolls
      </Box>
      <Box component="span" sx={{ color: "text.secondary", fontSize: 14 }}>
        {t.admin.title}
      </Box>
    </Link>
  );
};

const Account = () => {
  const { status, me, signOut } = useAuth();
  const { t } = useLanguage();
  if (status === "local")
    return (
      <Box component="span" sx={{ color: "text.secondary", fontSize: 14 }}>
        {t.admin.local}
      </Box>
    );
  const roles = (me?.roles ?? []).map((r) => t.admin.roles[r] ?? r);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, fontSize: 14 }}>
      <Box component="span" sx={{ overflowWrap: "anywhere" }}>
        {me?.name}
        {roles.length > 0 && (
          <Box component="span" sx={{ color: "text.secondary" }}>
            {" · "}
            {roles.join(", ")}
          </Box>
        )}
      </Box>
      <Plain
        onClick={signOut}
        sx={{
          color: "text.secondary",
          "@media (hover: hover)": { "&:hover": { color: "text.primary" } },
        }}
      >
        {t.admin.signOut}
      </Plain>
    </Box>
  );
};

const mayWrite = (me) =>
  ["write", "admin"].some((s) => me?.scopes?.includes(s));

// The admin's pages; the current one in bold
const Nav = () => {
  const { t } = useLanguage();
  const { me } = useAuth();
  const pages = [
    ["/admin", t.admin.review, true],
    mayWrite(me) && ["/admin/import", t.admin.import],
    me?.scopes?.includes("admin") && ["/admin/accounts", t.admin.accounts],
    ["/admin/me", t.admin.mine],
  ].filter(Boolean);
  return (
    <Box component="nav" sx={{ display: "flex", gap: 2, fontSize: 15 }}>
      {pages.map(([to, label, end]) => (
        <Link
          key={to}
          component={NavLink}
          to={to}
          end={end}
          underline="none"
          sx={{
            color: "text.secondary",
            "&.active": { color: "text.primary", fontWeight: 600 },
            "@media (hover: hover)": { "&:hover": { color: "text.primary" } },
          }}
        >
          {label}
        </Link>
      ))}
    </Box>
  );
};

const Header = ({ signedIn }) => {
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 3,
        rowGap: 1.5,
        px: { xs: 2, sm: 3 },
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Brand />
      {signedIn && <Nav />}
      <Box sx={{ flex: 1 }} />
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2.5,
        }}
      >
        <LanguageSwitch />
        <ModeButton />
        {signedIn && <Account />}
      </Box>
    </Box>
  );
};

// Sign in, not invited, or a failed sign-in: one quiet card in the middle
const Gate = () => {
  const { status, error, signIn } = useAuth();
  const { t } = useLanguage();
  const title =
    status === "notInvited" ? t.admin.notInvitedTitle : t.admin.signInTitle;
  const text = {
    notInvited: t.admin.notInvitedText,
    failed: t.admin.failed,
  }[status];
  return (
    <Box sx={{ maxWidth: 440, mx: "auto", mt: { xs: 6, sm: 12 }, px: 2 }}>
      <Typography variant="h1" sx={{ fontSize: 40, mb: 2 }}>
        {title}
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 3 }}>
        {text ?? t.admin.signInText}
      </Typography>
      {status === "failed" && error?.message && (
        <Typography
          component="p"
          sx={{ color: "text.secondary", fontSize: 13, mb: 3 }}
        >
          {error.message}
        </Typography>
      )}
      <Button variant="contained" onClick={signIn} disableElevation>
        {status === "notInvited" ? t.admin.otherAccount : t.admin.signIn}
      </Button>
      <Box sx={{ mt: 4 }}>
        <Link
          component={RouterLink}
          to="/"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
        >
          <Icon name="arrow_back" size={18} />
          {t.admin.toMap}
        </Link>
      </Box>
    </Box>
  );
};

const Screens = () => {
  const { status, me } = useAuth();
  const signedIn = status === "signedIn" || status === "local";
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      {status === "checking" && (
        <LinearProgress
          sx={{ position: "fixed", top: 0, left: 0, right: 0, height: 2 }}
        />
      )}
      <Header signedIn={signedIn} />
      {status === "checking" ? null : signedIn ? (
        <Routes>
          <Route index element={<Review />} />
          <Route path="me" element={<Mine />} />
          {mayWrite(me) && <Route path="import" element={<Import />} />}
          {me?.scopes?.includes("admin") && (
            <Route path="accounts" element={<Accounts />} />
          )}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      ) : (
        <Gate />
      )}
    </Box>
  );
};

const Admin = () => {
  const { t } = useLanguage();
  useEffect(() => {
    const before = document.title;
    document.title = `${t.admin.title} · Time Strolls`;
    return () => {
      document.title = before;
    };
  }, [t]);
  return (
    <AuthProvider>
      <Screens />
    </AuthProvider>
  );
};

export default Admin;
