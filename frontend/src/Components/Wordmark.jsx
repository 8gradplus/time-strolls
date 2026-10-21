import Box from "@mui/material/Box";
import { motion, serif } from "../theme";

// The logo's torn disc, size wide (any CSS length). The disc covers about 66%
// of logo.svg; the rest is margin for its torn edge and shadow, cropped here
// so the disc itself sits where the layout puts it.
export const LogoDisc = ({ size, sx }) => (
  <Box
    component="span"
    aria-hidden="true"
    sx={{
      position: "relative",
      display: "inline-block",
      flex: "none",
      width: size,
      height: size,
      ...sx,
    }}
  >
    <Box
      component="img"
      src="/logo.svg"
      alt=""
      sx={{
        position: "absolute",
        width: `calc(${size} / 0.66)`,
        height: `calc(${size} / 0.66)`,
        left: `calc(${size} * -0.258)`,
        top: `calc(${size} * -0.258)`,
        maxWidth: "none",
      }}
    />
  </Box>
);

const rest = "translateY(-0.02em) rotate(-6deg)";

// "Time ● Strolls": the logo is the point between the words. While play is
// set (the menu opens) the point rolls in from the left once and the words
// close up around it; prefers-reduced-motion skips that (index.css).
const Wordmark = ({ play = false }) => (
  // A name: page translators leave it alone
  <Box
    component="p"
    translate="no"
    className="notranslate"
    sx={{
      m: 0,
      display: "inline-flex",
      alignItems: "baseline",
      gap: "0.12em",
      fontFamily: serif,
      fontWeight: 600,
      fontSize: 32,
      lineHeight: 1,
      whiteSpace: "nowrap",
      "@keyframes wordmark-roll": {
        from: { transform: "translateX(-3.2em) rotate(-200deg)", opacity: 0 },
        "25%": { opacity: 1 },
        to: { transform: rest },
      },
      "@keyframes wordmark-close": {
        "0%, 30%": { transform: "translateX(0.45em)" },
        to: { transform: "none" },
      },
      "& > span:not([aria-hidden])": {
        display: "inline-block",
        animation: play ? `wordmark-close 1100ms ${motion.open} both` : "none",
      },
    }}
  >
    <span>Time</span>
    <LogoDisc
      size="0.78em"
      sx={{
        transform: rest,
        animation: play ? `wordmark-roll 1100ms ${motion.open} both` : "none",
      }}
    />
    <span>Strolls</span>
  </Box>
);

export default Wordmark;
