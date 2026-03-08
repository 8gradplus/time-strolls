"""
Pytest configuration file.

This file is automatically loaded by pytest and configures the test environment.
"""

import sys
from pathlib import Path

# Add the backend directory to Python path so imports work correctly
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))
