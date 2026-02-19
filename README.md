# Picker Wheel

A multiplayer picker wheel app. An admin creates a room with a topic, shares a link with participants, and spins the wheel to pick a winner.

## How It Works

1. Admin opens the app, enters a topic, and creates a room
2. Admin shares the participant link with everyone
3. Participants open the link, enter their name and pick
4. Admin closes submissions, moderates entries, and spins the wheel
5. Admin publishes the winner — participants see it when they revisit the link

### Coin Toss Mode

When there are exactly 2 entries, the wheel turns into a 3D coin flip.

### Easter Egg

Add `?polish` to any URL to switch to grayscale mode.

## Tech Stack

- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **Frontend**: Vanilla JS, HTML5 Canvas
- **Deployment**: Docker Compose + Caddy (automatic HTTPS)

## Deploy

On a fresh server with root access and an A-record pointing to it:

```bash
git clone https://github.com/mvasilyev/pickerwheel.git /opt/pickerwheel
bash /opt/pickerwheel/deploy/setup.sh your-domain.com
```

The script installs Docker, creates a non-root user, builds the containers, and starts everything. Caddy handles SSL certificates automatically.

## Local Development

```bash
cd server
npm install
node index.js
# http://localhost:3000
```

## Project Structure

```
public/           Frontend
  index.html      Landing page — create a room
  room.html       Participant view — submit a pick
  admin.html      Admin view — moderate, spin, publish
  wheel.js        PickerWheel class (canvas rendering)
  style.css       Styles
server/           Backend
  index.js        Express server + API routes
  db.js           SQLite schema and queries
deploy/           Deployment
  setup.sh        One-shot server setup script
  Caddyfile.template  Caddy config template
```
