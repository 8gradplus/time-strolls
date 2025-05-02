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
import Button from "./Components/Button";
// Styling should go to css or theming (tailwind, mui)
const divStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  zIndex: 1000,
};

const MenuItem = (props) => {
  const { active, onClick, label } = props;
  return (
    <ListItem disablePadding>
      <ListItemButton autoFocus onClick={onClick}>
        <ListItemAvatar>
          <Avatar>{active ? <AddIcon /> : <RemoveIcon />}</Avatar>
        </ListItemAvatar>
        <ListItemText primary={label} />
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
      <Button onClick={handleOpen(true)}>
        <LayersOutlinedIcon style={{ fontSize: "24px", color: "#333" }} />
      </Button>

      <Dialog onClose={handleOpen(false)} open={open}>
        <List sx={{ pt: 0 }}>
          <MenuItem
            onClick={handleItemClick("showHistoricMap")}
            active={itemState.showHistoricMap}
            label={"Luftbild 1945"}
          />
          <MenuItem
            onClick={handleItemClick("showMarkers")}
            active={itemState.showMarkers}
            label={"Orte"}
          />
        </List>
      </Dialog>
    </div>
  );
};

export default Menu;
