run:
	docker compose --env-file credentials.local up -d --build

stop:
	docker compose down

run-prod:
	docker compose -f docker-compose.yml --env-file credentials.prod up -d --build

stop-prod:
	docker compose -f docker-compose.yml down
