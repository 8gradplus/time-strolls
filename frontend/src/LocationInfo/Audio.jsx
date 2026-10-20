import { useState, useRef } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useLanguage } from "../LanguageContext";

const Podcast = (props) => {
  const { podcast } = props;
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef(null);
  const { t } = useLanguage();

  // don't show anything if url is not present
  if (!podcast?.url) return null;

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play(); // Start playing the audio
    }
  };

  return (
    <Box sx={{ px: 2.5, pb: 2 }}>
      {!isExpanded ? (
        // A round play button with its label, like an audio-guide stop
        <Box
          component="button"
          onClick={() => setIsExpanded(true)}
          sx={{
            all: "unset",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            cursor: "pointer",
            fontWeight: 500,
            "&:focus-visible": { outline: 2, outlineOffset: 4 },
          }}
        >
          <IconButton
            component="span"
            tabIndex={-1}
            sx={{
              width: 48,
              height: 48,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            <PlayArrowRoundedIcon />
          </IconButton>
          {t.listen}
        </Box>
      ) : (
        <audio
          controls
          controlsList="nodownload noplaybackrate"
          ref={audioRef}
          onCanPlay={handlePlay} // Play when the audio is ready to play
          style={{ width: "100%" }}
        >
          <source src={podcast.url} type="audio/mpeg" />
        </audio>
      )}
      {podcast.title && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {[podcast.title, podcast.owner].filter(Boolean).join(" · ")}
        </Typography>
      )}
    </Box>
  );
};

export default Podcast;
