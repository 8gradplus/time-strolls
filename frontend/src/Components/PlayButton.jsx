import { useState } from "react";
import Box from "@mui/material/Box";

const PlayButton = (props) => {
  const { children, onClick } = props;
  const [isHovered, setHovered] = useState(false);

  const style = {
    backgroundColor: "transparent",
    border: "2px solid black",
    borderRadius: "25px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    width: "80px",
    height: "40px",
    transition: "all 0.3s ease",
    fontSize: "20px",
    padding: "0px 15px",
  };

  return (
    <Box
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={style}
    >
      {children}
    </Box>
  );
};

export default PlayButton;
