install:
	npm install

build: install
	rm -rf build/
	npm run build

run:
	npm start

# Real Android phone over USB: the phone reaches the dev server as localhost
phone:
	adb reverse tcp:3000 tcp:3000
	@echo "Phone: open http://localhost:3000 in Chrome. Mac: chrome://inspect"

test:
	npx vitest run

format:
	npm run format

# Same checks as CI
check:
	npm run format:check
	npx vitest run
	npm run build

# The Dockerfile builds the app itself
docker-build:
	docker build -t time-strolls .

docker-run:
	docker run -d -p 3000:3000 -l time-strolls time-strolls

docker-stop:
	docker rm -f $$(docker ps -q --filter label=time-strolls)
