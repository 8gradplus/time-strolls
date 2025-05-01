import { Box } from "@mui/material";

//Todo: replace by API
const imageFilenames = [
  "file564226.jpg",
  "file840955.jpg",
  "file546074.jpg",
  "file546072.jpg",
  "file546065.jpg",
  "file430410.jpg",
];

const DisplayImages = () => {
  return (
    <>
      {imageFilenames.map((filename, idx) => (
        <Box key={idx} sx={{ mb: 1 }}>
          <img
            src={`/images/${filename}`}
            alt={`img-${idx}-${filename}`}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </Box>
      ))}
    </>
  );
};

export default DisplayImages;
