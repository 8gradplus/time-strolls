// Todo:  make css
import { useState } from "react";

const Button = (props) => {
  const { children, onClick, color = "#fff" } = props;
  const [isHovered, setHovered] = useState(false);

  const style = {
    backgroundColor: isHovered ? "#f0f0f0" : color,
    border: "1px solid #ddd",
    borderRadius: "50%",
    padding: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: isHovered
      ? "0 4px 8px rgba(0,0,0,0.2)"
      : "0 0px 5px rgba(0,0,0,0.15)",
    width: "40px",
    height: "40px",
    transition: "all 0.3s ease",
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={style}
    >
      {children}
    </button>
  );
};

export default Button;
