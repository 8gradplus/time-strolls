#/bin/bash!

DROPLET_NAME=timestrolls

rm -rf timestrolls
mkdir -p timestrolls/deployment
mkdir -p timestrolls/frontend

echo "Prepare uplaod"
cp Caddyfile.production timestrolls/deployment
cp docker-compose.production timestrolls/deployment/docker-compose.yml
cp ../frontend/Dockerfile timestrolls/frontend
cp ../frontend/Dockerfile timestrolls/frontend
cp ../frontend/*json timestrolls/frontend
cp -rf ../frontend/src timestrolls/frontend
cp -rf ../frontend/public timestrolls/frontend

echo "Uploading to server"
tar -czf timestrolls.tar.gz  timestrolls/frontend timestrolls/deployment
cat timestrolls.tar.gz | doctl compute ssh $DROPLET_NAME  --ssh-command 'cat > timestrolls.tar.gz'

echo "Patch on server"
doctl compute ssh $DROPLET_NAME  --ssh-command 'cd timestrolls/deployment && docker compose down | true && cd && tar -xzf timestrolls.tar.gz'

echo "Deploy on server"
doctl compute ssh $DROPLET_NAME  --ssh-command 'cd timestrolls/deployment && docker compose up --build -d'

echo "Cleanup"
rm -rf timestrolls
rm timestrolls.tar.gz
doctl compute ssh $DROPLET_NAME  --ssh-command 'rm timestrolls.tar.gz && docker image prune -a -f'

echo "Done"
