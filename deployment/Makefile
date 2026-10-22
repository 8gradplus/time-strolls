run:
	docker compose --env-file credentials.local up -d --build

stop:
	docker compose down

# On the droplet, in ~/timestrolls. Releases deploy with deploy.sh; these are
# for manual use. stop-prod keeps the volumes (no -v).
run-prod:
	docker compose -f docker-compose.yml --env-file credentials.prod up -d --remove-orphans

stop-prod:
	docker compose -f docker-compose.yml down --remove-orphans | true

backup-prod:
	sh backup.sh manual
