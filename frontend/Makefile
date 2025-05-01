DOCKER_LABEL=time-strolls

define stop-container-by-label
	docker stop $$(docker ps --filter label=$(1) --format {{.ID}}) | xargs docker rm
endef

install:
	npm install

build: install
	rm -rf build/
	npm run build --if-present

run:
	npm start

docker-build: build
	docker build -t $(DOCKER_LABEL) .

docker-run:
	docker run -d -p 8080:80 -l $(DOCKER_LABEL) $(DOCKER_LABEL)

docker-stop:
	$(call stop-container-by-label, $(DOCKER_LABEL))
