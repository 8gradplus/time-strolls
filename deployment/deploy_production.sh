#/bin/bash!
DROPLET_NAME=timestrolls

read -r -d '' SSH_COMMAND <<'EOF'
echo "shut down"
cd time-strolls-main &&
docker compose down -v --remove-orphans | true &&
cd ..&&
rm -rf time-strolls-main &&

echo "start"
curl -L -o time-strolls-main.zip https://github.com/8gradplus/time-strolls/archive/refs/heads/main.zip &&
unzip time-strolls-main.zip &&
cp time-strolls-main/deployment/Caddyfile.production time-strolls-main/deployment/Caddyfile &&
cd time-strolls-main &&
docker compose up -d
EOF

doctl compute ssh $DROPLET_NAME  --ssh-command "$SSH_COMMAND"
