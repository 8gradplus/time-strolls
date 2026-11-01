"""Language codes as we store them: ISO 639-1 where there is one, BCP 47
casing (de-AT). Scrapers and agents send variants and typos (DE, deu, ger,
german, cz); those are mapped, anything else unreadable is refused."""

import re

# Variants seen or likely from the archives and agents, by canonical code
ALIASES = {
    "de": ("deu", "ger", "german", "deutsch"),
    "cs": ("ces", "cze", "cz", "czech", "cesky", "český", "čeština", "cestina"),
    "en": ("eng", "english", "englisch"),
}
CODES = {alias: code for code, aliases in ALIASES.items() for alias in aliases}

TAG = re.compile(r"^[a-z]{2,3}(-[a-z0-9]{2,8})*$")


def normalize_lang(value: str | None) -> str:
    """The canonical code for `value`; ValueError for anything else."""
    tag = (value or "").strip().replace("_", "-").lower()
    if tag in CODES:
        return CODES[tag]
    if not TAG.match(tag):
        raise ValueError(f"not a language code: {value!r}")
    primary, *rest = tag.split("-")
    primary = CODES.get(primary, primary)
    # BCP 47 casing: regions upper case, scripts title case
    parts = [
        p.upper() if len(p) == 2 else p.title() if len(p) == 4 else p for p in rest
    ]
    return "-".join([primary, *parts])
