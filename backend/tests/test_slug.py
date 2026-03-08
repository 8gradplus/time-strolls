"""
Test suite for slug generation functionality.

Run with: pytest tests/test_slug.py
"""

import pytest
from helpers.slug import generate_place_slug, slugify, validate_slug


class TestSlugify:
    """Test basic slugification."""

    @pytest.mark.parametrize("input_text,expected", [
        ("Stephansdom", "stephansdom"),
        ("St. Peter's Church", "st-peters-church"),
        ("Mühlviertel", "muehlviertel"),
        ("Café Österreich", "cafe-oesterreich"),
        ("Sankt Oswald", "sankt-oswald"),
        ("Über-Straße", "ueber-strasse"),
        ("Multiple   Spaces", "multiple-spaces"),
        ("123 Main Street", "123-main-street"),
    ])
    def test_slugify_basic(self, input_text, expected):
        """Test slugification with various inputs."""
        assert slugify(input_text) == expected

    def test_slugify_empty_string(self):
        """Test slugification of empty string."""
        assert slugify("") == ""

    def test_slugify_only_special_chars(self):
        """Test slugification of only special characters."""
        result = slugify("@#$%^&*()")
        assert result == ""

    def test_slugify_preserves_numbers(self):
        """Test that numbers are preserved."""
        assert slugify("Test 123") == "test-123"


class TestGeneratePlaceSlug:
    """Test place slug generation with coordinates."""

    @pytest.mark.parametrize("name,lat,lon,expected", [
        ("Stephansdom", 48.2082, 16.3738, "stephansdom-n48-208-e16-374"),
        ("Unterurasch", 48.61017854, 14.04406485, "unterurasch-n48-610-e14-044"),
        ("Sankt Oswald", 48.619035, 14.030765, "sankt-oswald-n48-619-e14-031"),
        ("Mühlviertel", 48.4567, 13.8901, "muehlviertel-n48-457-e13-890"),
    ])
    def test_generate_place_slug_northern_hemisphere(self, name, lat, lon, expected):
        """Test slug generation for places in northern/eastern hemisphere."""
        assert generate_place_slug(name, lat, lon) == expected

    def test_generate_place_slug_southern_hemisphere(self):
        """Test slug generation for southern hemisphere."""
        result = generate_place_slug("Test Place", -23.5505, -46.6333)
        assert result == "test-place-s23-550-w46-633"

    def test_generate_place_slug_near_pole(self):
        """Test slug generation near north pole."""
        result = generate_place_slug("Arctic", 89.999, -120.456)
        assert result == "arctic-n89-999-w120-456"

    def test_generate_place_slug_zero_coordinates(self):
        """Test slug generation at equator/prime meridian."""
        result = generate_place_slug("Null Island", 0.0, 0.0)
        assert result == "null-island-n0-000-e0-000"

    def test_generate_place_slug_precision(self):
        """Test that precision parameter works."""
        result = generate_place_slug("Test", 48.12345, 14.98765, precision=2)
        assert result == "test-n48-12-e14-99"

    def test_generate_place_slug_negative_coordinates(self):
        """Test slug generation with both negative coordinates."""
        result = generate_place_slug("South Pole", -90.0, -180.0)
        assert result == "south-pole-s90-000-w180-000"


class TestValidateSlug:
    """Test slug validation."""

    @pytest.mark.parametrize("slug,expected", [
        ("stephansdom-n48-208-e16-374", True),
        ("valid-slug-123", True),
        ("abc", True),
        ("a-b-c", True),
        ("test-123-456", True),
    ])
    def test_validate_slug_valid(self, slug, expected):
        """Test validation of valid slugs."""
        assert validate_slug(slug) == expected

    @pytest.mark.parametrize("slug,expected", [
        ("Invalid Slug", False),  # Contains space
        ("invalid_slug", False),  # Contains underscore
        ("-invalid", False),  # Starts with hyphen
        ("invalid-", False),  # Ends with hyphen
        ("", False),  # Empty
        ("UPPERCASE", False),  # Uppercase
        ("special@char", False),  # Special character
        ("has.dot", False),  # Contains dot
        ("has/slash", False),  # Contains slash
    ])
    def test_validate_slug_invalid(self, slug, expected):
        """Test validation of invalid slugs."""
        assert validate_slug(slug) == expected


class TestSlugStability:
    """Test that slugs are stable (deterministic)."""

    def test_stability_same_input_same_output(self):
        """Test that same input always produces same output."""
        place = "Waldkapelle Oberuresch"
        lat = 48.6113
        lon = 14.0562

        slug1 = generate_place_slug(place, lat, lon)
        slug2 = generate_place_slug(place, lat, lon)
        slug3 = generate_place_slug(place, lat, lon)

        assert slug1 == slug2 == slug3

    def test_stability_multiple_calls(self):
        """Test stability across multiple calls."""
        slugs = [generate_place_slug("Test", 48.5, 14.5) for _ in range(100)]
        assert len(set(slugs)) == 1


class TestSlugUniqueness:
    """Test that different places get different slugs."""

    def test_same_name_different_coords(self):
        """Test that same name but different coordinates get unique slugs."""
        # Need at least 0.001 degree difference to get different slugs (3 decimal precision)
        slug1 = generate_place_slug("Main Street", 48.208, 16.374)
        slug2 = generate_place_slug("Main Street", 48.209, 16.374)

        assert slug1 != slug2

    def test_different_name_same_coords(self):
        """Test that different names at same location get unique slugs."""
        slug1 = generate_place_slug("Place A", 48.5, 14.5)
        slug2 = generate_place_slug("Place B", 48.5, 14.5)

        assert slug1 != slug2

    def test_very_close_coordinates(self):
        """Test that very close coordinates still get unique slugs."""
        # 0.001 degrees is about 111 meters
        slug1 = generate_place_slug("Test", 48.000, 14.000)
        slug2 = generate_place_slug("Test", 48.001, 14.000)

        assert slug1 != slug2


class TestRealWorldExamples:
    """Test with real places from the application."""

    @pytest.fixture
    def real_places(self):
        """Fixture providing real place data."""
        return [
            ("Unterurasch", 48.61017854015886, 14.04406485511563),
            ("Waldkapelle Oberuresch", 48.6113, 14.0562),
            ("Oberuresch", 48.609008, 14.056219),
            ("Muckenschlag", 48.618878, 14.047547),
            ("Sankt Thoma", 48.6412870685, 14.105554802),
            ("Asang", 48.626484, 14.052272),
            ("Schmiedmühle", 48.62750, 14.04942),
            ("Rosenhügel", 48.64514, 14.04886),
            ("Untermarkschlag", 48.63256, 14.03831),
            ("Sankt Oswald", 48.61903490532756, 14.030726480131019),
            ("Luagmühle", 48.63389, 14.04631),
        ]

    def test_all_real_places_unique(self, real_places):
        """Test that all real places get unique slugs."""
        slugs = [generate_place_slug(name, lat, lon) for name, lat, lon in real_places]

        assert len(slugs) == len(set(slugs)), "All slugs should be unique"

    def test_real_places_format(self, real_places):
        """Test that all real place slugs are valid."""
        for name, lat, lon in real_places:
            slug = generate_place_slug(name, lat, lon)
            assert validate_slug(slug), f"Slug '{slug}' should be valid"

    def test_specific_real_places(self):
        """Test specific known slugs."""
        assert generate_place_slug("Unterurasch", 48.61017854015886, 14.04406485511563) == "unterurasch-n48-610-e14-044"
        assert generate_place_slug("Sankt Oswald", 48.61903490532756, 14.030726480131019) == "sankt-oswald-n48-619-e14-031"


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_very_long_name(self):
        """Test slug generation with very long place name."""
        long_name = "A" * 200
        slug = generate_place_slug(long_name, 48.0, 14.0)
        assert slug.startswith("a" * 200)
        assert validate_slug(slug)

    def test_name_with_many_special_chars(self):
        """Test name with many special characters."""
        name = "St. Peter's & Paul's Church - München"
        slug = generate_place_slug(name, 48.0, 14.0)
        assert "st-peters" in slug
        assert "pauls" in slug
        assert validate_slug(slug)

    def test_extreme_coordinates(self):
        """Test extreme but valid coordinates."""
        # North pole
        slug1 = generate_place_slug("North", 90.0, 0.0)
        assert "n90-000" in slug1

        # South pole
        slug2 = generate_place_slug("South", -90.0, 0.0)
        assert "s90-000" in slug2

        # International date line
        slug3 = generate_place_slug("East", 0.0, 180.0)
        assert "e180-000" in slug3

        slug4 = generate_place_slug("West", 0.0, -180.0)
        assert "w180-000" in slug4
