import { useState, useRef } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
        <Button
          variant="contained"
          size="large"
          startIcon={<PlayArrowRoundedIcon />}
          onClick={() => setIsExpanded(true)}
        >
          {t.listen}
        </Button>
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
