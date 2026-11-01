// One resource of the review list in a panel (right on larger screens, full
// screen on phones): the picture, its texts per language with how they came
// about, its sources and permission, its history, and the same actions as
// the list.
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Icon } from "../../icons";
import { useLanguage } from "../../LanguageContext";
import { serif } from "../../theme";
import { resourceDetail, resourceHistory } from "../api";

const FIELDS = ["name", "title", "description"];

const Section = ({ title, children }) => (
  <Box
    component="section"
    sx={{ px: 2.5, py: 2, borderTop: 1, borderColor: "divider" }}
  >
    <Typography
      component="h3"
      sx={{
        fontSize: 12,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "text.secondary",
        mb: 1,
      }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

const Texts = ({ texts, verbatim }) => {
  const { t } = useLanguage();
  const fields = FIELDS.filter((f) => texts.some((x) => x.field === f));
  return fields.map((field) => (
    <Box key={field} sx={{ mb: 2 }}>
      <Box sx={{ fontWeight: 600, fontSize: 14, mb: 0.5 }}>
        {t.admin.fields[field] ?? field}
      </Box>
      {texts
        .filter((x) => x.field === field)
        .sort(
          (a, b) =>
            (a.method === "original" ? -1 : 0) -
            (b.method === "original" ? -1 : 0),
        )
        .map((x) => (
          <Box
            key={x.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "2.5em 1fr",
              gap: 1,
              mb: 1,
            }}
          >
            <Box
              translate="no"
              sx={{
                color: "text.secondary",
                fontSize: 13,
                textTransform: "uppercase",
                pt: "2px",
              }}
            >
              {x.lang}
            </Box>
            <Box>
              <Box sx={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
                {x.body}
              </Box>
              <Box sx={{ color: "text.secondary", fontSize: 12 }}>
                {[
                  t.admin.methods[x.method] ?? x.method,
                  x.model,
                  verbatim[`${x.field}/${x.lang}`] && t.admin.edited,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Box>
            </Box>
          </Box>
        ))}
    </Box>
  ));
};

const Detail = ({ id, row, actions, actionLabel, onAction, onClose }) => {
  const { t, language } = useLanguage();
  const mobile = useMediaQuery((theme) => theme.breakpoints.down("sm"));
  const [state, setState] = useState({
    detail: null,
    history: [],
    loading: false,
    failed: false,
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState({ detail: null, history: [], loading: true, failed: false });
    Promise.all([resourceDetail(id), resourceHistory(id).catch(() => [])])
      .then(
        ([detail, history]) =>
          !cancelled &&
          setState({ detail, history, loading: false, failed: false }),
      )
      .catch(
        () =>
          !cancelled &&
          setState({ detail: null, history: [], loading: false, failed: true }),
      );
    return () => {
      cancelled = true;
    };
  }, [id]);

  const { detail, history } = state;
  const item = detail?.item ?? {};
  const label = row?.label ?? item.name ?? "—";
  const published = detail?.resource?.status === "published";

  return (
    <Drawer
      anchor={mobile ? "bottom" : "right"}
      open={Boolean(id)}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: mobile
            ? { height: "100dvh", pt: "env(safe-area-inset-top)" }
            : { width: 480, borderLeft: 1, borderColor: "divider" },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          px: 2.5,
          pt: 2.5,
          pb: 1.5,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{
              fontFamily: serif,
              fontSize: 26,
              fontWeight: 600,
              lineHeight: 1.15,
              overflowWrap: "anywhere",
            }}
          >
            {label}
          </Typography>
          {row && (
            <Box sx={{ color: "text.secondary", fontSize: 13, mt: 0.5 }}>
              {[
                row.kind && (t.kinds[row.kind] ?? row.kind),
                row.places.join(", "),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Box>
          )}
        </Box>
        <IconButton onClick={onClose} aria-label={t.close} edge="end">
          <Icon name="close" />
        </IconButton>
      </Box>
      <Box sx={{ height: 2 }}>{state.loading && <LinearProgress />}</Box>

      <Box sx={{ overflowY: "auto", flex: 1 }}>
        {state.failed && (
          <Typography sx={{ p: 2.5, color: "text.secondary" }}>
            {t.admin.loadFailed}
          </Typography>
        )}
        {item.url && (
          <Box
            component="img"
            src={item.url}
            alt=""
            sx={{
              display: "block",
              width: "100%",
              maxHeight: "50vh",
              objectFit: "contain",
              bgcolor: "action.hover",
            }}
          />
        )}
        {item.may_show === false && (
          <Box sx={{ px: 2.5, py: 1.5, fontSize: 14, color: "warning.main" }}>
            {t.admin.noPermission}
          </Box>
        )}
        {(item.date_text || item.creator || item.rights_holder) && (
          <Box sx={{ px: 2.5, py: 1.5, fontSize: 14, color: "text.secondary" }}>
            {[
              item.date_text,
              item.creator,
              item.rights_holder !== item.creator && item.rights_holder,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Box>
        )}
        {detail && (
          <>
            <Section title={t.admin.texts}>
              <Texts texts={detail.texts} verbatim={detail.verbatim ?? {}} />
            </Section>
            {(detail.sources.length > 0 || item.source_url) && (
              <Section title={t.admin.source}>
                {[
                  ...new Set(
                    [
                      item.source_url,
                      ...detail.sources.map((s) => s.url),
                    ].filter(Boolean),
                  ),
                ].map((url) => (
                  <Box key={url}>
                    <Link
                      href={url}
                      target="_blank"
                      rel="noopener"
                      sx={{ overflowWrap: "anywhere", fontSize: 14 }}
                    >
                      {url}
                    </Link>
                  </Box>
                ))}
              </Section>
            )}
            {published && item.slug && detail.resource.type === "place" && (
              <Section title={t.admin.onMap}>
                <Link
                  href={`/?location=${item.slug}`}
                  target="_blank"
                  rel="noopener"
                  sx={{ fontSize: 14 }}
                >
                  {item.slug}
                </Link>
              </Section>
            )}
            {history.length > 0 && (
              <Section title={t.admin.history}>
                {history
                  .slice()
                  .reverse()
                  .map((h) => (
                    <Box
                      key={h.id}
                      sx={{ fontSize: 13, color: "text.secondary" }}
                    >
                      {new Date(h.at).toLocaleString(language, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {" · "}
                      {h.action}
                      {h.diff?.to ? ` → ${h.diff.to}` : ""}
                      {h.diff?.reason ? ` (${h.diff.reason})` : ""}
                    </Box>
                  ))}
              </Section>
            )}
          </>
        )}
      </Box>

      {actions.length > 0 && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            px: 2.5,
            py: 1.5,
            borderTop: 1,
            borderColor: "divider",
            pb: "calc(12px + env(safe-area-inset-bottom))",
          }}
        >
          {actions.map((status) => (
            <Button
              key={status}
              variant={status === "published" ? "contained" : "outlined"}
              disableElevation
              onClick={() => onAction(status)}
            >
              {actionLabel(status)}
            </Button>
          ))}
        </Box>
      )}
    </Drawer>
  );
};

export default Detail;
