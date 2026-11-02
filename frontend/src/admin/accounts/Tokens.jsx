// Bearer tokens of one account: the list (newest first, revoked ones dimmed),
// a form for a new one and the new token itself, shown only once. Used by
// "My access" (one's own) and by the accounts page (admins).
import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useLanguage } from "../../LanguageContext";
import { fill } from "../api";

const date = (iso, language) =>
  new Date(iso).toLocaleDateString(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// The new token, once: copy it now, it can't be shown again
const Fresh = ({ token, onDone }) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
    } catch {
      // no clipboard (http, an old browser): the text can still be selected
    }
  };
  return (
    <Box
      role="status"
      sx={{ p: 2, my: 2, border: 1, borderColor: "divider", borderRadius: 1 }}
    >
      <Typography sx={{ fontWeight: 600, mb: 1 }}>
        {fill(t.admin.tokenCreated, { name: token.name })}
      </Typography>
      <Box
        component="code"
        sx={{
          display: "block",
          p: 1,
          mb: 1,
          fontSize: 13,
          overflowWrap: "anywhere",
          bgcolor: "action.hover",
          userSelect: "all",
        }}
      >
        {token.token}
      </Box>
      <Typography sx={{ color: "text.secondary", fontSize: 14, mb: 1.5 }}>
        {t.admin.tokenOnce}
      </Typography>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button size="small" variant="outlined" onClick={copy}>
          {copied ? t.admin.copied : t.admin.copy}
        </Button>
        <Button size="small" onClick={onDone}>
          {t.admin.close}
        </Button>
      </Box>
    </Box>
  );
};

const NewToken = ({ scopes, onCreate }) => {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState(
    () => new Set(scopes.filter((s) => s !== "admin")),
  );
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        scopes: scopes.filter((s) => chosen.has(s)),
      });
      setName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box component="form" onSubmit={submit} sx={{ my: 2 }}>
      <TextField
        size="small"
        label={t.admin.tokenName}
        helperText={t.admin.tokenNameHint}
        value={name}
        onChange={(e) => setName(e.target.value)}
        sx={{ width: { xs: "100%", sm: 320 } }}
      />
      <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2, mt: 1 }}>
        {scopes.map((scope) => (
          <FormControlLabel
            key={scope}
            label={t.admin.scopes[scope] ?? scope}
            control={
              <Checkbox
                size="small"
                checked={chosen.has(scope)}
                onChange={(e) =>
                  setChosen((c) => {
                    const next = new Set(c);
                    e.target.checked ? next.add(scope) : next.delete(scope);
                    return next;
                  })
                }
              />
            }
          />
        ))}
      </Box>
      {error && (
        <Typography sx={{ color: "error.main", fontSize: 14, my: 1 }}>
          {error}
        </Typography>
      )}
      <Button
        type="submit"
        variant="contained"
        disableElevation
        size="small"
        disabled={busy || !name.trim() || chosen.size === 0}
        sx={{ mt: 1 }}
      >
        {t.admin.createToken}
      </Button>
    </Box>
  );
};

const Row = ({ token, onRevoke }) => {
  const { t, language } = useLanguage();
  const [asking, setAsking] = useState(false);
  const revoked = Boolean(token.revoked_at);
  const meta = [
    token.scopes.map((s) => t.admin.scopes[s] ?? s).join(", "),
    fill(t.admin.createdOn, { date: date(token.created_at, language) }),
    revoked
      ? fill(t.admin.revokedOn, { date: date(token.revoked_at, language) })
      : token.last_used_at
        ? fill(t.admin.lastUsed, { date: date(token.last_used_at, language) })
        : t.admin.neverUsed,
  ];
  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1,
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
        opacity: revoked ? 0.55 : 1,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Box sx={{ fontWeight: 500, overflowWrap: "anywhere" }}>
          {token.name}
        </Box>
        <Box sx={{ color: "text.secondary", fontSize: 13 }}>
          {meta.join(" · ")}
        </Box>
      </Box>
      {!revoked &&
        (asking ? (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" onClick={() => setAsking(false)}>
              {t.admin.cancel}
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={() => onRevoke(token.id)}
            >
              {t.admin.revokeSure}
            </Button>
          </Box>
        ) : (
          <Button size="small" onClick={() => setAsking(true)}>
            {t.admin.revoke}
          </Button>
        ))}
    </Box>
  );
};

// load(): the tokens; create(data): a new one with `token`; scopes: those a
// new token may get
const Tokens = ({ load, create, revoke, scopes }) => {
  const { t } = useLanguage();
  const [tokens, setTokens] = useState(null);
  const [failed, setFailed] = useState(false);
  const [fresh, setFresh] = useState(null);

  const reload = useCallback(async () => {
    try {
      setTokens(await load());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <Box>
      {fresh && <Fresh token={fresh} onDone={() => setFresh(null)} />}
      {failed ? (
        <Typography sx={{ color: "text.secondary", py: 1 }}>
          {t.admin.loadFailed}
        </Typography>
      ) : tokens?.length === 0 ? (
        <Typography sx={{ color: "text.secondary", py: 1 }}>
          {t.admin.noTokens}
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {(tokens ?? []).map((token) => (
            <Row
              key={token.id}
              token={token}
              onRevoke={async (id) => {
                await revoke(id).catch(() => null);
                reload();
              }}
            />
          ))}
        </Box>
      )}
      {scopes.length > 0 && (
        <NewToken
          scopes={scopes}
          onCreate={async (data) => {
            setFresh(await create(data));
            reload();
          }}
        />
      )}
    </Box>
  );
};

export default Tokens;
