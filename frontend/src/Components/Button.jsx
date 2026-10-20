import IconButton from "@mui/material/IconButton";

// Round floating map control: paper surface, hairline border, no shadow.
const Button = (props) => {
  const { children, onClick, label } = props;

  return (
    <IconButton
      onClick={onClick}
      aria-label={label}
      sx={{
        width: 44,
        height: 44,
        bgcolor: "background.paper",
        color: "text.primary",
        border: 1,
        borderColor: "divider",
        "&:hover": { bgcolor: "background.default" },
      }}
    >
      {children}
    </IconButton>
  );
};

export default Button;
