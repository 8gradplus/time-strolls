import React, { useState, useRef } from "react";
import PlayButton from "../Components/PlayButton";
import PlayCircleOutlineOutlinedIcon from "@mui/icons-material/PlayCircleOutlineOutlined";

const Podcast = (props) => {
  const { podcast } = props;
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef(null);

  // don't show anything if url is not present
  if (!podcast?.url) return null;

  const handleClick = () => {
    setIsExpanded(true); // Expand the player
  };

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play(); // Start playing the audio
    }
  };

  return (
    <div>
      {!isExpanded ? (
        <PlayButton onClick={handleClick}>
          Play
          <PlayCircleOutlineOutlinedIcon
            style={{ fontSize: "30px", color: "#333" }}
          />
        </PlayButton>
      ) : (
        // Expanded Audio Player

        <audio
          controls
          controlsList="nodownload noplaybackrate"
          ref={audioRef}
          onCanPlay={handlePlay} // Play when the audio is ready to play
        >
          <source src={podcast.url} type="audio/mpeg" />
        </audio>
      )}
    </div>
  );
};

export default Podcast;
