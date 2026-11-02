import { parseLinks } from "./links";

test("links are found one per line or in running text, each document once", () => {
  const text = `https://deutsch-reichenau.topothek.at/?doc=742582
  see also https://deutsch-reichenau.topothek.at/#ipp=500&doc=1 and
  https://deutsch-reichenau.topothek.at/?doc=742582`;
  expect(parseLinks(text)).toEqual({
    links: ["https://deutsch-reichenau.topothek.at/?doc=742582"],
    bad: ["https://deutsch-reichenau.topothek.at/#ipp=500&doc=1"],
  });
});

test("other sites and links without a document are bad", () => {
  const { links, bad } = parseLinks(
    "https://example.org/?doc=1 https://haslach.topothek.at/ https://haslach.topothek.at/?doc=7",
  );
  expect(links).toEqual(["https://haslach.topothek.at/?doc=7"]);
  expect(bad).toHaveLength(2);
});
