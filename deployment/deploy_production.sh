#/bin/bash!
DROPLET_NAME=timestrolls

read -r -d '' SSH_COMMAND <<'EOF'
echo "shut down"
cd time-strolls-main/deployment &&
make stop-prod &&
cd ../.. &&
rm -rf time-strolls-main &&

echo "clone repository main"
curl -L -o time-strolls-main.zip https://github.com/8gradplus/time-strolls/archive/refs/heads/main.zip &&
unzip time-strolls-main.zip &&

echo "copy credentials"
cd time-strolls-main/deployment &&
cp ../../credentials.prod . &&
echo "start"
make run-prod
EOF

doctl compute ssh $DROPLET_NAME  --ssh-command "$SSH_COMMAND"
