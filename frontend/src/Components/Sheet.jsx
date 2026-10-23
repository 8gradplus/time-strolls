import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Icon } from "../icons";

// Full screen on phones (also held sideways, hence the height), a side
// panel on larger screens.
const Sheet = (props) => {
  const { open, onClose, header, loading = false, children } = props;
  const mobile = useMediaQuery(
    (theme) => `${theme.breakpoints.down("sm")}, (max-height: 500px)`,
  );

  return (
    <Drawer
      anchor={mobile ? "bottom" : "left"}
      open={open}
      onClose={onClose}
      slotProps={{
        // A light veil instead of MUI's dark backdrop, so the map stays visible
        backdrop: { sx: { bgcolor: "rgba(23, 23, 22, 0.15)" } },
        paper: {
          sx: mobile
            ? { height: "100dvh", pt: "env(safe-area-inset-top)" }
            : { width: 420, borderRight: 1, borderColor: "divider" },
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
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>{header}</Box>
        <IconButton onClick={onClose} aria-label="close" edge="end">
          <Icon name="close" />
        </IconButton>
      </Box>
      <Box sx={{ height: 2 }}>{loading && <LinearProgress />}</Box>
      <Box
        sx={{
          borderTop: 1,
          borderColor: "divider",
          overflowY: "auto",
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        {children}
      </Box>
    </Drawer>
  );
};

export default Sheet;
