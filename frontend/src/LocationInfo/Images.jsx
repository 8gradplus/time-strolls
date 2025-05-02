import { Box } from "@mui/material";

//Todo: replace by API call
const imageFilenames = [
  "file564226.webp",
  "file840955.webp",
  "file546074.webp",
  "file546072.webp",
  "file546065.webp",
  "file430410.webp",
];

const DisplayImages = () => {
  return (
    <>
      {imageFilenames.map((filename, idx) => (
        <Box key={`img-${idx}-${filename}`} sx={{ mb: 1 }}>
          <img
            src={`/images/${filename}`}
            alt={`img-${idx}-${filename}`}
            loading="lazy"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </Box>
      ))}
    </>
  );
};

export default DisplayImages;
