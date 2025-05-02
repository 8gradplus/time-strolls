#/bin/bash!

rm -rf upload
mkdir -p upload/deployment
mkdir -p upload/frontend


cp Caddyfile.production upload/deployment
cp docker-compose.production upload/deployment/docker-compose.yml

cp ../frontend/Dockerfile upload/frontend
cp ../frontend/Dockerfile upload/frontend
cp ../frontend/*json upload/frontend
cp -rf ../frontend/src upload/frontend
cp -rf ../frontend/public upload/frontend


tar -czf timestrolls.tar.gz upload/frontend upload/deployment
#rm -rf upload
