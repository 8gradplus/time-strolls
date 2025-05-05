import React, { useState, useRef } from "react";
import PlayButton from "../Components/PlayButton";
import PlayCircleOutlineOutlinedIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import Box from "@mui/material/Box";

const Podcast = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef(null);

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
          <source
            src="https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/podcasts/test.mp3"
            type="audio/mpeg"
          />
        </audio>
      )}
    </div>
  );
};

export default Podcast;
