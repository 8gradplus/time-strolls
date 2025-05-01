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

const MenuDialog = (props) => {
  const { open, onClose } = props;
  // const handleListItemClick = (value) => {};
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog onClose={handleClose} open={open}>
      <List sx={{ pt: 0 }}>
        <ListItem disablePadding>
          <ListItemButton
            autoFocus
            //onClick={() => handleListItemClick("showHistoric")}
          >
            <ListItemAvatar>
              <Avatar>
                <AddIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary="1945" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            autoFocus
            //onClick={() => handleListItemClick("showPlaces")}
          >
            <ListItemAvatar>
              <Avatar>
                <AddIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary="Orte anzeigen" />
          </ListItemButton>
        </ListItem>
      </List>
    </Dialog>
  );
};

const Menu = () => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        zIndex: 1000,
      }}
    >
      <button
        onClick={handleOpen}
        style={{
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
        }}
      >
        <LayersOutlinedIcon style={{ fontSize: "24px", color: "#333" }} />
      </button>

      <MenuDialog open={open} onClose={handleClose} />
    </div>
  );
};

export default Menu;
