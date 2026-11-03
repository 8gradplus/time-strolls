// The review list (ROADMAP.md, step 5): one type's content in a status,
// places and tours by name (house numbers as numbers), media newest first.
// Select rows, publish or mute them (with an undo), open one
// for its details. The view lives in the query string, like the map's:
// /admin?type=media&status=new&kind=house&source=<code>,<code>&open=<id>.
// Pictures show their source and whether it gave a permission; the source
// filter (all by default) can pick only the sources with a permission.
import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { Icon } from "../../icons";
import { useLanguage } from "../../LanguageContext";
import { useAuth } from "../AuthContext";
import {
  fill,
  PLACE_KINDS,
  reviewList,
  reviewSources,
  setStatuses,
} from "../api";
import Detail from "./Detail";

const TYPES = ["place", "media", "tour"];
const STATUSES = ["new", "published", "muted"];
const PAGE = 50;

// The actions from a status: what a row can become
const actionsFrom = {
  new: ["published", "muted"],
  published: ["muted"],
  muted: ["published", "new"],
};

const useView = () => {
  const [params, setParams] = useSearchParams();
  const view = {
    type: TYPES.includes(params.get("type")) ? params.get("type") : "place",
    status: STATUSES.includes(params.get("status"))
      ? params.get("status")
      : "new",
    kind: params.get("kind") || "",
    sources: (params.get("source") || "").split(",").filter(Boolean),
    open: params.get("open"),
  };
  const set = (changes) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => {
        const text = Array.isArray(value) ? value.join(",") : value;
        text ? next.set(key, text) : next.delete(key);
      });
      return next;
    });
  return [view, set];
};

const date = (iso, language) =>
  new Date(iso).toLocaleDateString(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// A picture's source and whether it gave a permission to show
const SourceNote = ({ item }) => {
  const { t } = useLanguage();
  if (!item.source) return null;
  return (
    <Box sx={{ fontSize: 13, color: "text.secondary" }}>
      {item.source} ·{" "}
      <Box
        component="span"
        sx={{
          color: item.source_permitted ? "success.main" : "warning.main",
          fontWeight: 500,
        }}
      >
        {item.source_permitted ? t.admin.permitted : t.admin.notPermitted}
      </Box>
    </Box>
  );
};

// Media sources, several at once (none chosen = all); the first entry
// chooses the sources with a permission
const SourceFilter = ({ sources, value, onChange }) => {
  const { t } = useLanguage();
  const PERMITTED = "__permitted";
  const names = Object.fromEntries(sources.map((s) => [s.code, s.name]));
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => {
        const chosen = e.target.value;
        onChange(
          chosen.includes(PERMITTED)
            ? sources.filter((s) => s.permitted).map((s) => s.code)
            : chosen,
        );
      }}
      sx={{ minWidth: 200, maxWidth: 320 }}
      slotProps={{
        select: {
          multiple: true,
          displayEmpty: true,
          renderValue: (chosen) =>
            chosen.length === 0
              ? t.admin.allSources
              : chosen.length === 1
                ? (names[chosen[0]] ?? chosen[0])
                : fill(t.admin.sourcesChosen, { n: chosen.length }),
        },
      }}
    >
      <MenuItem value={PERMITTED}>
        <ListItemText primary={t.admin.permittedOnly} />
      </MenuItem>
      {sources.map((source) => (
        <MenuItem key={source.code} value={source.code}>
          <Checkbox
            size="small"
            checked={value.includes(source.code)}
            sx={{ p: 0.5, mr: 1 }}
          />
          <ListItemText
            primary={`${source.name} (${source.count})`}
            secondary={
              source.permitted ? t.admin.permitted : t.admin.notPermitted
            }
            slotProps={{
              secondary: {
                sx: {
                  color: source.permitted ? "success.main" : "warning.main",
                },
              },
            }}
          />
        </MenuItem>
      ))}
    </TextField>
  );
};

const Row = ({ item, checked, onCheck, onOpen }) => {
  const { t, language } = useLanguage();
  const meta = [
    item.kind && (t.kinds[item.kind] ?? item.kind),
    item.places.join(", "),
    item.created_by && fill(t.admin.addedBy, { name: item.created_by }),
    date(item.created_at, language),
  ].filter(Boolean);
  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, sm: 1.5 },
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Checkbox
        checked={checked}
        onChange={(e) => onCheck(e.target.checked)}
        slotProps={{ input: { "aria-label": item.label ?? item.id } }}
      />
      {item.type === "media" && (
        <Box
          component="img"
          src={item.url}
          alt=""
          loading="lazy"
          sx={{
            width: 56,
            height: 56,
            objectFit: "cover",
            flex: "none",
            bgcolor: "action.hover",
          }}
        />
      )}
      <Box
        component="button"
        type="button"
        onClick={onOpen}
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 44,
          p: 0,
          border: 0,
          bgcolor: "transparent",
          color: "inherit",
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
          "@media (hover: hover)": {
            "&:hover .label": { textDecoration: "underline" },
          },
        }}
      >
        <Box
          className="label"
          sx={{ fontWeight: 500, overflowWrap: "anywhere" }}
        >
          {item.label ?? "—"}
        </Box>
        <Box sx={{ color: "text.secondary", fontSize: 13 }}>
          {meta.join(" · ")}
        </Box>
        <SourceNote item={item} />
        {item.status_reason && (
          <Box
            sx={{ color: "text.secondary", fontSize: 13, fontStyle: "italic" }}
          >
            {item.status_reason}
          </Box>
        )}
      </Box>
      {item.source_url && (
        <Link
          href={item.source_url}
          target="_blank"
          rel="noopener"
          aria-label={t.admin.source}
          sx={{ display: "flex", p: 1, color: "text.secondary" }}
        >
          <Icon name="arrow_outward" size={20} />
        </Link>
      )}
    </Box>
  );
};

const ReasonDialog = ({ open, onCancel, onConfirm }) => {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label={t.admin.reason}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm(reason)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t.admin.cancel}</Button>
        <Button
          variant="contained"
          disableElevation
          onClick={() => onConfirm(reason)}
        >
          {t.admin.mute}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Publishing media that no permission covers: allowed, after a confirmation
// (they stay off the map until a permission covers them)
const UncoveredDialog = ({ count, total, onCancel, onConfirm }) => {
  const { t } = useLanguage();
  return (
    <Dialog open={count > 0} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogContent>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>
          {total > 1
            ? fill(t.admin.uncoveredSome, { n: count, total })
            : t.admin.uncoveredOne}
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
          {t.admin.uncoveredHint}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t.admin.cancel}</Button>
        <Button variant="contained" disableElevation onClick={onConfirm}>
          {t.admin.publishAnyway}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const actionLabel = (t, status) =>
  ({ published: t.admin.publish, muted: t.admin.mute, new: t.admin.backToNew })[
    status
  ];

const Review = () => {
  const { t } = useLanguage();
  const { me } = useAuth();
  const [view, setView] = useView();
  const [list, setList] = useState({
    total: 0,
    items: [],
    loading: true,
    failed: false,
  });
  const [selected, setSelected] = useState(new Set());
  const [sources, setSources] = useState([]); // media sources in the status
  const [asking, setAsking] = useState(null); // ids waiting for a mute reason
  // ids waiting for a confirmation: {ids, uncovered}
  const [confirming, setConfirming] = useState(null);
  const [toast, setToast] = useState(null); // {text, undo?}
  const mayReview =
    me?.scopes?.includes("review") || me?.scopes?.includes("admin");
  const mayWrite =
    me?.scopes?.includes("write") || me?.scopes?.includes("admin");
  const mayDelete = Boolean(me?.scopes?.includes("admin"));

  const load = useCallback(
    async (offset = 0) => {
      setList((l) => ({ ...l, loading: true, failed: false }));
      try {
        const { type, status, kind, sources } = view;
        const page = await reviewList({
          type,
          status,
          kind,
          sources: type === "media" ? sources : [],
          offset,
          limit: PAGE,
        });
        setList((l) => ({
          total: page.total,
          items: offset ? [...l.items, ...page.items] : page.items,
          loading: false,
          failed: false,
        }));
      } catch {
        setList((l) => ({ ...l, loading: false, failed: true }));
      }
    },
    // the list's filters only: opening an item doesn't reload the list
    [view.type, view.status, view.kind, view.sources.join(",")],
  );

  useEffect(() => {
    if (view.type !== "media") return;
    let current = true;
    reviewSources(view.status)
      .then((list) => current && setSources(list))
      .catch(() => current && setSources([]));
    return () => {
      current = false;
    };
  }, [view.type, view.status]);

  useEffect(() => {
    setSelected(new Set());
    load(0);
  }, [load]);

  const change = async (ids, status, reason) => {
    const from = view.status;
    const result = await setStatuses(ids, status, reason).catch((e) => ({
      done: 0,
      errors: [{ item: 0, error: e.message }],
    }));
    const failed = new Set(result.errors.map((e) => ids[e.item]));
    const changed = ids.filter((id) => !failed.has(id));
    setList((l) => ({
      ...l,
      total: l.total - changed.length,
      items: l.items.filter((item) => !changed.includes(item.id)),
    }));
    setSelected(new Set());
    if (changed.includes(view.open)) setView({ open: null });
    const text = [
      changed.length && fill(t.admin.done[status], { n: changed.length }),
      result.errors.length &&
        fill(t.admin.partly, {
          n: result.errors.length,
          error: result.errors[0].error,
        }),
    ]
      .filter(Boolean)
      .join(" · ");
    setToast({
      text,
      undo: changed.length
        ? async () => {
            setToast(null);
            await setStatuses(changed, from);
            load(0);
          }
        : null,
    });
  };

  // mayShow: what the panel knows of an item that isn't in the list
  const act = (ids, status, mayShow) => {
    if (status === "muted") return setAsking(ids);
    if (status === "published") {
      const uncovered = ids.filter(
        (id) =>
          (list.items.find((i) => i.id === id)?.may_show ?? mayShow) === false,
      ).length;
      if (uncovered) return setConfirming({ ids, uncovered });
    }
    change(ids, status);
  };

  const ids = list.items.map((i) => i.id);
  const allChecked = ids.length > 0 && ids.every((id) => selected.has(id));

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 1, sm: 3 }, pb: 8 }}>
      <Tabs
        value={view.type}
        onChange={(_, type) =>
          setView({ type, kind: null, source: null, open: null })
        }
        variant="scrollable"
        sx={{ borderBottom: 1, borderColor: "divider", px: { xs: 1, sm: 0 } }}
      >
        {TYPES.map((type) => (
          <Tab key={type} value={type} label={t.admin.types[type]} />
        ))}
      </Tabs>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
          py: 2,
          px: { xs: 1, sm: 0 },
        }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view.status}
          onChange={(_, status) => status && setView({ status, open: null })}
        >
          {STATUSES.map((status) => (
            <ToggleButton
              key={status}
              value={status}
              sx={{ px: 1.5, textTransform: "none" }}
            >
              {t.admin.statuses[status]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {view.type === "place" && (
          <TextField
            select
            size="small"
            value={view.kind}
            onChange={(e) => setView({ kind: e.target.value, open: null })}
            sx={{ minWidth: 160 }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value="">{t.admin.allKinds}</MenuItem>
            {PLACE_KINDS.map((kind) => (
              <MenuItem key={kind} value={kind}>
                {t.kinds[kind] ?? kind}
              </MenuItem>
            ))}
          </TextField>
        )}
        {view.type === "media" && (
          <SourceFilter
            sources={sources}
            value={view.sources}
            onChange={(chosen) => setView({ source: chosen, open: null })}
          />
        )}
        <Box sx={{ color: "text.secondary", fontSize: 14 }}>{list.total}</Box>
        {view.type === "place" && mayWrite && (
          <Button
            component={RouterLink}
            to="/admin/places/new"
            size="small"
            startIcon={<Icon name="add" size={18} />}
            sx={{ ml: "auto" }}
          >
            {t.admin.newPlace}
          </Button>
        )}
      </Box>

      {/* the selection's actions, sticky so they stay at hand while scrolling */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1,
          py: 1,
          px: { xs: 0, sm: 0 },
          bgcolor: "background.default",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Checkbox
          checked={allChecked}
          indeterminate={selected.size > 0 && !allChecked}
          onChange={(e) => setSelected(new Set(e.target.checked ? ids : []))}
          slotProps={{ input: { "aria-label": t.admin.selectAll } }}
        />
        <Box sx={{ fontSize: 14, color: "text.secondary", mr: 1 }}>
          {fill(t.admin.selected, { n: selected.size })}
        </Box>
        {mayReview &&
          actionsFrom[view.status].map((status) => (
            <Button
              key={status}
              size="small"
              variant={status === "published" ? "contained" : "outlined"}
              disableElevation
              disabled={selected.size === 0}
              onClick={() => act([...selected], status)}
            >
              {actionLabel(t, status)}
            </Button>
          ))}
      </Box>
      <Box sx={{ height: 2 }}>{list.loading && <LinearProgress />}</Box>

      {list.failed ? (
        <Typography sx={{ py: 4, color: "text.secondary" }}>
          {t.admin.loadFailed}
        </Typography>
      ) : !list.loading && list.items.length === 0 ? (
        <Typography sx={{ py: 4, color: "text.secondary" }}>
          {t.admin.empty}
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {list.items.map((item) => (
            <Row
              key={item.id}
              item={item}
              checked={selected.has(item.id)}
              onCheck={(on) =>
                setSelected((s) => {
                  const next = new Set(s);
                  on ? next.add(item.id) : next.delete(item.id);
                  return next;
                })
              }
              onOpen={() => setView({ open: item.id })}
            />
          ))}
        </Box>
      )}
      {list.items.length < list.total && !list.loading && (
        <Box sx={{ py: 3, textAlign: "center" }}>
          <Button onClick={() => load(list.items.length)}>
            {t.admin.loadMore}
          </Button>
        </Box>
      )}

      <Detail
        id={view.open}
        row={list.items.find((i) => i.id === view.open)}
        actions={mayReview ? actionsFrom[view.status] : []}
        actionLabel={(status) => actionLabel(t, status)}
        onAction={(status, mayShow) => act([view.open], status, mayShow)}
        onClose={() => setView({ open: null })}
        mayWrite={mayWrite}
        mayDelete={mayDelete}
        onChanged={() => load(0)}
        onDeleted={() => {
          const id = view.open;
          setView({ open: null });
          setList((l) => ({
            ...l,
            total: l.total - 1,
            items: l.items.filter((item) => item.id !== id),
          }));
          setToast({ text: t.admin.deleted });
        }}
      />
      <ReasonDialog
        open={Boolean(asking)}
        onCancel={() => setAsking(null)}
        onConfirm={(reason) => {
          const ids = asking;
          setAsking(null);
          change(ids, "muted", reason.trim() || undefined);
        }}
      />
      <UncoveredDialog
        count={confirming?.uncovered ?? 0}
        total={confirming?.ids.length ?? 0}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          const { ids } = confirming;
          setConfirming(null);
          change(ids, "published");
        }}
      />
      <Snackbar
        open={Boolean(toast)}
        onClose={(_, why) => why !== "clickaway" && setToast(null)}
        autoHideDuration={8000}
        message={toast?.text}
        action={
          toast?.undo && (
            <Button color="inherit" size="small" onClick={toast.undo}>
              {t.admin.undo}
            </Button>
          )
        }
      />
    </Box>
  );
};

export default Review;
