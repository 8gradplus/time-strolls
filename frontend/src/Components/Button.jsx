import IconButton from "@mui/material/IconButton";

// Round map control: paper surface, hairline border, no shadow. Inside the
// dock (plain) it has neither, the dock is the surface.
const Button = (props) => {
  const { children, onClick, label, plain = false } = props;

  return (
    <IconButton
      onClick={onClick}
      aria-label={label}
      sx={{
        width: 44,
        height: 44,
        flex: "none",
        color: "text.primary",
        ...(plain
          ? {}
          : {
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
            }),
        "&:hover": { bgcolor: "background.default" },
      }}
    >
      {children}
    </IconButton>
  );
};

export default Button;
