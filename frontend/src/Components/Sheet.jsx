import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import useMediaQuery from "@mui/material/useMediaQuery";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

// A bottom sheet on phones, a side panel from sm upwards.
const Sheet = (props) => {
  const { open, onClose, header, loading = false, children } = props;
  const mobile = useMediaQuery((theme) => theme.breakpoints.down("sm"));

  return (
    <Drawer
      anchor={mobile ? "bottom" : "left"}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: mobile
            ? { maxHeight: "85dvh", borderRadius: "16px 16px 0 0" }
            : { width: 420, borderRight: 1, borderColor: "divider" },
        },
      }}
    >
      {mobile && (
        <Box
          sx={{
            width: 36,
            height: 4,
            borderRadius: 2,
            bgcolor: "divider",
            mx: "auto",
            mt: 1,
          }}
        />
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          px: 2.5,
          pt: mobile ? 1 : 2.5,
          pb: 1.5,
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>{header}</Box>
        <IconButton onClick={onClose} aria-label="close" edge="end">
          <CloseRoundedIcon />
        </IconButton>
      </Box>
      <Box sx={{ height: 2 }}>{loading && <LinearProgress />}</Box>
      <Box sx={{ borderTop: 1, borderColor: "divider", overflowY: "auto" }}>
        {children}
      </Box>
    </Drawer>
  );
};

export default Sheet;
