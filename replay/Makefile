# Replays places.yml through the API; only adds what is missing.
# local / production: the key of each target comes from replay/.env
# (API_KEY_LOCAL, API_KEY_PRODUCTION; git-ignored, only on your Mac).
# check / check-local: only list what would be added (no key needed).

local:
	uv run replay.py local

production:
	uv run replay.py production

check:
	uv run replay.py production --check

check-local:
	uv run replay.py local --check

lint:
	uv run --extra test ruff check . && uv run --extra test ruff format --check .

test:
	uv run --extra test pytest -q
