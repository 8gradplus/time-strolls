// Accounts (/admin/accounts, admins only): invite a person by email with a
// role, see who signed in yet, grant and revoke roles, and each account's
// tokens. The open account is in the URL (?open=<name>), like the review.
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Icon } from "../../icons";
import { useLanguage } from "../../LanguageContext";
import { useAuth } from "../AuthContext";
import {
  accountList,
  accountTokens,
  createToken,
  fill,
  grantRole,
  invite,
  revokeRole,
  revokeToken,
  ROLES,
  roleScopes,
  TOKEN_SCOPES,
} from "../api";
import { Section } from "./Mine";
import Tokens from "./Tokens";

const Invite = ({ onInvited }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // {text, error?}
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const account = await invite(email.trim(), role);
      setMessage({ text: fill(t.admin.invited, { email: account.email }) });
      setEmail("");
      onInvited(account);
    } catch (err) {
      setMessage({ text: err.message, error: true });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box component="form" onSubmit={submit}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
        <TextField
          size="small"
          type="email"
          label={t.admin.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ flex: "1 1 240px" }}
        />
        <TextField
          select
          size="small"
          label={t.admin.role}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          {ROLES.map((r) => (
            <MenuItem key={r} value={r}>
              {t.admin.roles[r]}
            </MenuItem>
          ))}
        </TextField>
        <Button
          type="submit"
          variant="contained"
          disableElevation
          disabled={busy || !email.includes("@")}
        >
          {t.admin.invite}
        </Button>
      </Box>
      <Typography
        role={message ? "status" : undefined}
        sx={{
          fontSize: 14,
          mt: 1,
          color: message?.error ? "error.main" : "text.secondary",
        }}
      >
        {message?.text ??
          fill(t.admin.inviteHint, { url: `${window.location.origin}/admin` })}
      </Typography>
    </Box>
  );
};

// What tokens of this account may do: a person's roles, an agent anything
const tokenScopes = (account) =>
  account.kind === "human"
    ? TOKEN_SCOPES.filter((s) =>
        account.roles.some((r) => roleScopes[r.role]?.includes(s)),
      )
    : TOKEN_SCOPES;

const Open = ({ account, me, onChanged }) => {
  const { t } = useLanguage();
  const [error, setError] = useState(null);
  const missing = ROLES.filter((r) => !account.roles.some((x) => x.role === r));
  const load = useCallback(() => accountTokens(account.name), [account.name]);
  const run = async (action) => {
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Box sx={{ pl: { xs: 0, sm: 2 }, pb: 2 }}>
      <Typography sx={{ fontWeight: 600, mt: 1 }}>
        {t.admin.rolesTitle}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, my: 1 }}>
        {account.roles.map((r) => (
          <Chip
            key={r.id}
            label={t.admin.roles[r.role] ?? r.role}
            // one doesn't take away one's own admin role
            onDelete={
              account.id === me?.account_id && r.role === "admin"
                ? undefined
                : () => run(() => revokeRole(r.id))
            }
          />
        ))}
        {missing.map((r) => (
          <Button
            key={r}
            size="small"
            startIcon={<Icon name="add" size={18} />}
            onClick={() => run(() => grantRole(account.name, r))}
          >
            {t.admin.roles[r]}
          </Button>
        ))}
      </Box>
      {account.kind === "human" && account.roles.length === 0 && (
        <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
          {t.admin.noRoles}
        </Typography>
      )}
      {error && (
        <Typography sx={{ color: "error.main", fontSize: 14 }}>
          {error}
        </Typography>
      )}
      <Typography sx={{ fontWeight: 600, mt: 2 }}>{t.admin.tokens}</Typography>
      <Tokens
        load={load}
        create={(data) => createToken(account.name, data)}
        revoke={revokeToken}
        scopes={tokenScopes(account)}
      />
    </Box>
  );
};

const Row = ({ account, open, onToggle, children }) => {
  const { t } = useLanguage();
  const meta = [
    account.email !== account.name && account.email,
    account.kind === "human"
      ? account.roles.map((r) => t.admin.roles[r.role] ?? r.role).join(", ") ||
        t.admin.noRole
      : t.admin.kinds[account.kind],
    account.operated_by &&
      fill(t.admin.operatedBy, { name: account.operated_by }),
    account.kind === "human" && !account.signed_in && t.admin.notSignedIn,
  ].filter(Boolean);
  return (
    <Box component="li" sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Box
        component="button"
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: "100%",
          minHeight: 52,
          py: 1,
          px: 0,
          border: 0,
          bgcolor: "transparent",
          color: "inherit",
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
          "@media (hover: hover)": {
            "&:hover .name": { textDecoration: "underline" },
          },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            className="name"
            sx={{ fontWeight: 500, overflowWrap: "anywhere" }}
          >
            {account.name}
          </Box>
          <Box sx={{ color: "text.secondary", fontSize: 13 }}>
            {meta.join(" · ")}
          </Box>
        </Box>
        <Icon
          name="chevron_right"
          size={22}
          style={{
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 150ms",
          }}
        />
      </Box>
      {open && children}
    </Box>
  );
};

const Accounts = () => {
  const { t } = useLanguage();
  const { me } = useAuth();
  const [params, setParams] = useSearchParams();
  const open = params.get("open");
  const [list, setList] = useState({ items: [], loading: true, failed: false });

  const load = useCallback(async () => {
    setList((l) => ({ ...l, loading: true }));
    try {
      setList({ items: await accountList(), loading: false, failed: false });
    } catch {
      setList((l) => ({ ...l, loading: false, failed: true }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const show = (name) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      name ? next.set("open", name) : next.delete("open");
      return next;
    });

  const people = list.items.filter((a) => a.kind === "human");
  const others = list.items.filter((a) => a.kind !== "human");
  const rows = (accounts) => (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {accounts.map((account) => (
        <Row
          key={account.id}
          account={account}
          open={open === account.name}
          onToggle={() => show(open === account.name ? null : account.name)}
        >
          <Open account={account} me={me} onChanged={load} />
        </Row>
      ))}
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", px: { xs: 2, sm: 3 }, pb: 8 }}>
      <Typography variant="h1" sx={{ fontSize: 36, mt: 3 }}>
        {t.admin.accounts}
      </Typography>
      <Section title={t.admin.inviteTitle}>
        <Invite
          onInvited={(account) => {
            load();
            show(account.name);
          }}
        />
      </Section>
      <Box sx={{ height: 2, mt: 3 }}>{list.loading && <LinearProgress />}</Box>
      {list.failed ? (
        <Typography sx={{ py: 4, color: "text.secondary" }}>
          {t.admin.loadFailed}
        </Typography>
      ) : (
        <>
          <Section title={t.admin.people}>{rows(people)}</Section>
          {others.length > 0 && (
            <Section title={t.admin.agents}>{rows(others)}</Section>
          )}
        </>
      )}
    </Box>
  );
};

export default Accounts;
