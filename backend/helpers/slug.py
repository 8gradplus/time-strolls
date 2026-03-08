import re
from typing import Optional


def slugify(text: str) -> str:
    """
    Convert text to URL-friendly slug.

    Args:
        text: Input text to slugify

    Returns:
        Lowercase slug with hyphens
    """
    # Convert to lowercase
    text = text.lower()

    # Replace umlauts and special characters
    replacements = {
        'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
        'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
        'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
        'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
        'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o',
        'ù': 'u', 'ú': 'u', 'û': 'u',
        'ñ': 'n', 'ç': 'c'
    }

    for char, replacement in replacements.items():
        text = text.replace(char, replacement)

    # Remove apostrophes and quotes
    text = re.sub(r"['\"]", '', text)

    # Replace non-alphanumeric characters with hyphens
    text = re.sub(r'[^a-z0-9]+', '-', text)

    # Remove leading/trailing hyphens
    text = text.strip('-')

    # Replace multiple consecutive hyphens with single hyphen
    text = re.sub(r'-+', '-', text)

    return text


def generate_place_slug(name: str, lat: float, lon: float, precision: int = 3) -> str:
    """
    Generate a unique, stable slug for a place based on name and coordinates.

    Args:
        name: Place name
        lat: Latitude
        lon: Longitude
        precision: Number of decimal places for coordinates (default: 3 = ~111m accuracy)

    Returns:
        Slug in format: "place-name-48-208-16-374"

    Example:
        >>> generate_place_slug("St. Peter's Church", 48.2082, 16.3738)
        'st-peters-church-48-208-16-374'
    """
    name_slug = slugify(name)

    # Round coordinates to specified precision and format without decimal point
    lat_str = format(abs(lat), f'.{precision}f').replace('.', '-')
    lon_str = format(abs(lon), f'.{precision}f').replace('.', '-')

    # Add N/S and E/W prefixes for clarity if needed
    lat_prefix = 'n' if lat >= 0 else 's'
    lon_prefix = 'e' if lon >= 0 else 'w'

    return f"{name_slug}-{lat_prefix}{lat_str}-{lon_prefix}{lon_str}"


def validate_slug(slug: str) -> bool:
    """
    Validate if a string is a valid slug format.

    Args:
        slug: String to validate

    Returns:
        True if valid slug format
    """
    if not slug:
        return False

    # Must be lowercase alphanumeric with hyphens, no leading/trailing hyphens
    pattern = r'^[a-z0-9]+(-[a-z0-9]+)*$'
    return bool(re.match(pattern, slug))
