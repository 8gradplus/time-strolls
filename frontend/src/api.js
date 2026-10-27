// Texts come in the language asked for where they exist, else in their
// original language
const inLanguage = (path, language) =>
  language ? `${path}?lang=${language}` : path;

export const api = {
  docs: "/api/docs",
  credits: "/api/credits/",
  locationInfo: (slug, language) =>
    inLanguage(`/api/locations/${slug}`, language),
  locations: (language) => inLanguage("/api/locations/", language),
  tour: (id) => `/api/tours/${id}`,
  tours: (language) => inLanguage("/api/tours/", language),
};
