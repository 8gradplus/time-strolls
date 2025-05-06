import { Box } from "@mui/material";

const DisplayImages = (props) => {
  const { images } = props;
  if (!images || images === []) return null;
  return (
    <>
      {images.map((image, idx) => (
        <Box key={`img-${idx}-${image.url}`} sx={{ mb: 1 }}>
          <img
            src={image.url}
            alt={`img-${idx}-${image.url}`}
            loading="lazy"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </Box>
      ))}
    </>
  );
};

export default DisplayImages;
