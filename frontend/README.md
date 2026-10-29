# Frontend

React 19 + Vite + react-leaflet.

## Scripts

- `npm start`: dev server on http://localhost:3000
- `npm test`: Vitest in watch mode (`npx vitest run` for a single run)
- `npm run build`: production build into `build/`
- `npm run format` / `npm run format:check`: Prettier

## API proxy

The dev server proxies `/api` to production (`https://timestrolls.debtray.com`).
To use a locally running API:

```sh
API_PROXY=http://127.0.0.1:8000 npm start
```

## Testing on a mobile phone

On a real Android phone over USB (Chrome's device mode misses the address bar,
the gesture bar and real touch):

1. Once: `brew install android-platform-tools`. On the phone, turn on the
   Developer options (Settings → About phone → tap "Build number" 7 times),
   then Settings → System → Developer options → USB debugging. Plug it in
   and allow the Mac ("Always allow from this computer"). `adb devices`
   should list the phone as `device`.
2. Run the frontend: `npm start`
3. `make phone` forwards the phone's port 3000 to the Mac, so the phone opens
   http://localhost:3000 in Chrome. Location works (localhost is a secure
   context) and hot reload reaches the phone.
4. `chrome://inspect` on the Mac gives DevTools and a screencast of the phone's page.

Screenshot from the Mac: `adb exec-out screencap -p > phone.png`.

`adb: no devices/emulators found` (or `adb devices` lists nothing):

- Use a cable that carries data (many USB-C cables only charge), plugged
  straight into the Mac, not through a hub or monitor.
- Unlock the phone, tap the "Charging this device via USB" notification and
  choose "File transfer".
- Toggle USB debugging off and on. If the "Allow USB debugging?" prompt
  doesn't appear, tap "Revoke USB debugging authorisations" in the Developer
  options and plug in again.
- `adb kill-server && adb devices`. `unauthorized` means the prompt on the
  phone is still waiting.
- On a MacBook, a new USB device needs "Allow accessory to connect?" on the
  Mac (System Settings → Privacy & Security → Allow accessories to connect).

The dev server listens on `127.0.0.1` (`vite.config.js`), because
`adb reverse` connects to IPv4; one that listens on IPv6 only (`[::1]`)
leaves the phone with "connection refused".

Without USB (or on an iPhone), use a tunnel: `lt --port 3000` and open the
printed address (the password is your public IP:
`curl https://loca.lt/mytunnelpassword`).

## Docker

The image builds the app and serves the static files with Caddy on port 3000
(see `Caddyfile`). The outer Caddy in `deployment/` proxies to it.
