# Tests

This directory contains automated tests for the timestrolls backend.

## Running Tests

### Run all tests
```bash
cd backend
uv run pytest
```

### Run specific test file
```bash
uv run pytest tests/test_slug.py
```

### Run specific test class
```bash
uv run pytest tests/test_slug.py::TestSlugify
```

### Run specific test
```bash
uv run pytest tests/test_slug.py::TestSlugify::test_slugify_basic
```

### Run with coverage report
```bash
uv run pytest --cov=helpers --cov=api --cov-report=html
```

Then open `htmlcov/index.html` in your browser.

### Run tests in verbose mode
```bash
uv run pytest -vv
```

### Run only fast tests (exclude slow tests)
```bash
uv run pytest -m "not slow"
```

## Test Organization

### Current Tests

- **`test_slug.py`**: Tests for slug generation and validation
  - `TestSlugify`: Basic slugification functionality
  - `TestGeneratePlaceSlug`: Place slug generation with coordinates
  - `TestValidateSlug`: Slug validation
  - `TestSlugStability`: Deterministic slug generation
  - `TestSlugUniqueness`: Uniqueness guarantees
  - `TestRealWorldExamples`: Real places from the application
  - `TestEdgeCases`: Boundary conditions and edge cases

### Adding New Tests

1. Create a new file: `tests/test_<module>.py`
2. Import pytest and the module to test
3. Organize tests into classes (optional but recommended)
4. Use descriptive test names: `test_<what>_<condition>_<expected>`

Example:
```python
import pytest
from api.model.place import Place

class TestPlaceModel:
    def test_place_creation_with_valid_data(self):
        place = Place(
            name="Test",
            lat=48.0,
            lon=14.0,
            slug="test-n48-000-e14-000"
        )
        assert place.name == "Test"
```

## Test Markers

Use markers to categorize tests:

```python
@pytest.mark.unit
def test_something():
    pass

@pytest.mark.integration
def test_api_endpoint():
    pass

@pytest.mark.slow
def test_large_dataset():
    pass
```

Run specific markers:
```bash
uv run pytest -m unit
uv run pytest -m "unit and not slow"
```

## Fixtures

Common test data can be shared using fixtures:

```python
@pytest.fixture
def sample_place():
    return {
        "name": "Test Place",
        "lat": 48.0,
        "lon": 14.0
    }

def test_with_fixture(sample_place):
    assert sample_place["name"] == "Test Place"
```

## Best Practices

1. **Test one thing per test**: Each test should verify one specific behavior
2. **Use descriptive names**: Test names should explain what they test
3. **Arrange-Act-Assert**: Structure tests clearly
   - Arrange: Set up test data
   - Act: Execute the function
   - Assert: Verify the result
4. **Use parametrize**: Test multiple inputs efficiently
   ```python
   @pytest.mark.parametrize("input,expected", [
       ("test", "test"),
       ("Test", "test"),
   ])
   def test_lowercase(input, expected):
       assert input.lower() == expected
   ```
5. **Keep tests independent**: Tests should not depend on each other
6. **Test edge cases**: Empty strings, None, extreme values, etc.
7. **Use fixtures for setup**: Avoid code duplication

## Coverage Goals

- **helpers/**: 90%+ coverage
- **api/models**: 80%+ coverage
- **api/controllers**: 70%+ coverage

Check coverage report:
```bash
uv run pytest --cov-report=term-missing
```

## Continuous Integration

Tests run automatically on:
- Every push to main branch
- Every pull request
- Before deployment

Ensure all tests pass before merging!

## Troubleshooting

### Import errors
Make sure you're running pytest from the `backend` directory:
```bash
cd backend
uv run pytest
```

### Database tests
For tests requiring database access, use fixtures with test database:
```python
@pytest.fixture
def test_db():
    # Setup test database
    yield db
    # Cleanup
```

### Environment variables
Tests use default values or can load from `.env.test`:
```bash
export POSTGRES_USER=test_user
uv run pytest
```

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Pytest Best Practices](https://docs.pytest.org/en/latest/goodpractices.html)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)