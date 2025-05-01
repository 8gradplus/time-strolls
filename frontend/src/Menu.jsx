import { useState } from "react";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import Avatar from "@mui/material/Avatar";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Dialog from "@mui/material/Dialog";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
// Styling should go to css or theming (tailwind, mui)
const divStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  zIndex: 1000,
};

const buttonStyle = {
  backgroundColor: "#fff",
  border: "1px solid #ddd",
  borderRadius: "50%",
  padding: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
  width: "40px",
  height: "40px",
};

const MenuAvatar = (props) => {
  const { active } = props;
  return (
    <ListItemAvatar>
      <Avatar>{active ? <AddIcon /> : <RemoveIcon />}</Avatar>
    </ListItemAvatar>
  );
};

const HistoricMap = (props) => {
  const { active, onClick } = props;
  return (
    <ListItem disablePadding>
      <ListItemButton autoFocus onClick={onClick}>
        <MenuAvatar active={active} />
        <ListItemText primary="Luftbild 1945" />
      </ListItemButton>
    </ListItem>
  );
};

const Markers = (props) => {
  const { active, onClick } = props;
  return (
    <ListItem disablePadding>
      <ListItemButton autoFocus onClick={onClick}>
        <MenuAvatar active={active} />
        <ListItemText primary="Orte Anzeigen" />
      </ListItemButton>
    </ListItem>
  );
};

const Menu = (props) => {
  const { onItemClick, itemState } = props;
  const [open, setOpen] = useState(false);

  const handleItemClick = (item) => () => {
    onItemClick(item);
  };

  const handleOpen = (open) => () => {
    setOpen(open);
  };
  return (
    <div style={divStyle}>
      <button onClick={handleOpen(true)} style={buttonStyle}>
        <LayersOutlinedIcon style={{ fontSize: "24px", color: "#333" }} />
      </button>

      <Dialog onClose={handleOpen(false)} open={open}>
        <List sx={{ pt: 0 }}>
          <HistoricMap
            onClick={handleItemClick("showHistoricMap")}
            active={itemState.showHistoricMap}
          />
          <Markers
            onClick={handleItemClick("showMarkers")}
            active={itemState.showMarkers}
          />
        </List>
      </Dialog>
    </div>
  );
};

export default Menu;
