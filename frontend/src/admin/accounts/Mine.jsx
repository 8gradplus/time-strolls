// My access (/admin/me): who I am here, how an AI assistant connects (with
// Google, no token), and personal tokens for scripts and tools without a
// sign-in. A token can do at most what my roles allow, and stops with them.
import { useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useLanguage } from "../../LanguageContext";
import { useAuth } from "../AuthContext";
import { createOwnToken, ownTokens, revokeToken, TOKEN_SCOPES } from "../api";
import Tokens from "./Tokens";

export const Section = ({ title, children }) => (
  <Box component="section" sx={{ mt: 4 }}>
    <Typography
      variant="h2"
      sx={{
        fontSize: 24,
        mb: 1,
        pb: 0.5,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

// The scopes a new token may get: one's own (admin covers all)
export const allowed = (scopes = []) =>
  scopes.includes("admin")
    ? TOKEN_SCOPES
    : TOKEN_SCOPES.filter((s) => scopes.includes(s));

const Mine = () => {
  const { t } = useLanguage();
  const { me } = useAuth();
  const roles = (me?.roles ?? []).map((r) => t.admin.roles[r] ?? r);
  const mcp = `${window.location.origin}/api/mcp/admin`;
  const load = useCallback(() => ownTokens(), []);

  return (
    <Box sx={{ maxWidth: 760, mx: "auto", px: { xs: 2, sm: 3 }, pb: 8 }}>
      <Typography variant="h1" sx={{ fontSize: 36, mt: 3 }}>
        {t.admin.mine}
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        {[me?.name, roles.join(", ")].filter(Boolean).join(" · ")}
      </Typography>

      <Section title={t.admin.assistants}>
        <Typography sx={{ mb: 1 }}>{t.admin.assistantsText}</Typography>
        <Box
          component="code"
          sx={{
            display: "block",
            p: 1,
            fontSize: 14,
            overflowWrap: "anywhere",
            bgcolor: "action.hover",
            userSelect: "all",
          }}
        >
          {mcp}
        </Box>
      </Section>

      <Section title={t.admin.tokens}>
        <Typography sx={{ color: "text.secondary", mb: 1 }}>
          {t.admin.tokensText}
        </Typography>
        <Tokens
          load={load}
          create={createOwnToken}
          revoke={revokeToken}
          scopes={allowed(me?.scopes)}
        />
      </Section>
    </Box>
  );
};

export default Mine;
