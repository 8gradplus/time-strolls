import { useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useLanguage } from "../LanguageContext";

// One podcast as a row: a round play button, the title and the source. The
// button turns into the audio player, which starts right away.
const PodcastRow = ({ podcast }) => {
  const [playing, setPlaying] = useState(false);
  const { t } = useLanguage();

  return (
    <Box sx={{ px: 2.5, py: 1 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "48px 1fr",
          gap: 1.5,
          alignItems: "center",
        }}
      >
        <IconButton
          aria-label={`${t.listen}: ${podcast.title ?? ""}`}
          onClick={() => setPlaying(true)}
          disabled={playing}
          sx={{
            width: 48,
            height: 48,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            "&:hover": { bgcolor: "primary.dark" },
            "&.Mui-disabled": {
              bgcolor: "primary.main",
              color: "#fff",
              opacity: 0.5,
            },
          }}
        >
          <PlayArrowRoundedIcon />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ fontWeight: 500, lineHeight: 1.35 }}>
            {podcast.title || t.listen}
          </Box>
          {podcast.owner && (
            <Box sx={{ fontSize: 13, color: "text.secondary" }}>
              {podcast.owner}
            </Box>
          )}
        </Box>
      </Box>
      {playing && (
        <audio
          controls
          autoPlay
          controlsList="nodownload noplaybackrate"
          style={{ width: "100%", marginTop: 8 }}
        >
          <source src={podcast.url} type="audio/mpeg" />
        </audio>
      )}
    </Box>
  );
};

// All podcasts of a place; today the API has at most one per place.
const Podcasts = ({ podcasts }) =>
  podcasts
    .filter((podcast) => podcast?.url)
    .map((podcast) => <PodcastRow key={podcast.url} podcast={podcast} />);

export default Podcasts;
