# AR Gorilla Tag

Multiplayer WebXR tag game. Node + Express + `ws` server, Three.js client (loaded from CDN).

## Run locally
    npm install
    npm start        # http://localhost:3000 (WebXR needs HTTPS, so test on Render or via a tunnel)

## Deploy on Render
1. Push this folder to a GitHub repo.
2. Render > New > Blueprint (uses `render.yaml`), or New > Web Service with:
   Build `npm install`, Start `node server.js`.
3. Open the `https://<your-app>.onrender.com` URL in Quest Browser (or Chrome on Android).

Free Render instances sleep when idle, so the first load can take ~30s.

## Playing
Same room code for everyone. Stand together, face the same way, enter AR, press trigger once to align.
Red player is "it"; touch others with head or hands (within 30 cm) to pass it on. Tune `TAG_DIST` / `IMMUNE_MS` in `server.js`.
