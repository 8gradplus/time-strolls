install:
	npm install

build: install
	rm -rf build/
	npm run build --if-present

run:
	npm start

docker-build: build
	docker build -t time-strolls .

docker-run:
	docker run -d -p 3000:3000 -l time-strolls time-strolls

docker-stop:
	docker rm -f $$(docker ps -q --filter label=time-strolls)
