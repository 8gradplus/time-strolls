import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

// A short message floating at the top of the map, with one action.
const Notice = ({ message, actionLabel, onAction }) => (
  <Box
    role="alert"
    sx={{
      position: "absolute",
      top: 10,
      left: 64,
      right: 64,
      mx: "auto",
      maxWidth: 420,
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      pl: 2,
      pr: 1,
      py: 1,
      bgcolor: "background.paper",
      color: "text.primary",
      border: 1,
      borderColor: "divider",
      borderRadius: 1.5,
      fontSize: 14,
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>{message}</Box>
    <Button onClick={onAction} sx={{ flex: "none", minHeight: 40 }}>
      {actionLabel}
    </Button>
  </Box>
);

export default Notice;
