import { Box } from "@mui/material";

//Todo: replace by API call
const imageFilenames = [
  "https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file430410.webp",
  "https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file546065.webp",
  "https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file546072.webp",
  "https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file546074.webp",
  "https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file564226.webp",
  "https://debtray.fra1.cdn.digitaloceanspaces.com/test/timestrolls/images/file840955.webp",
];

const DisplayImages = () => {
  return (
    <>
      {imageFilenames.map((filename, idx) => (
        <Box key={`img-${idx}-${filename}`} sx={{ mb: 1 }}>
          <img
            src={filename}
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
