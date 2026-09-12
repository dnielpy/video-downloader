# Download Manager

Download Manager is a private, self-hosted dashboard for durable HTTP and HTTPS downloads. Next.js provides the interface and a server-only JSON-RPC bridge; aria2 performs every download and continues running when the browser is closed.

## Requirements

- Docker Engine with Docker Compose v2.
- A Linux directory where UID `1000` can create and update downloaded files.
- Access through a private LAN/VPN or an authenticated reverse proxy. The application does not include its own login.

## Configure and start

```bash
cp .env.example .env
```

Edit `.env` and set an absolute host path plus a long random RPC secret:

```env
APP_PORT=3000
ARIA2_RPC_SECRET=replace-with-a-long-random-secret
DOWNLOADS_HOST_PATH=/srv/download-manager/downloads
DOWNLOAD_DIR=/downloads
```

Create the host directory and make it writable by the container user:

```bash
sudo mkdir -p /srv/download-manager/downloads
sudo chown 1000:1000 /srv/download-manager/downloads
```

Build and start both services:

```bash
docker compose up -d --build
```

Open `http://SERVER_IP:3000`. Change `APP_PORT` if port 3000 is already in use.

## Storage and persistence

Downloaded files are written directly to `DOWNLOADS_HOST_PATH`. To move them, stop the stack, move or copy the files, update that variable, and start the stack again. `DOWNLOAD_DIR` is the path inside the aria2 container and normally should remain `/downloads`.

Two named volumes retain application state:

- `aria2-state` stores `aria2.session`, which is updated every 30 seconds and reloads unfinished/error downloads after a restart.
- `download-manager-state` stores the JSON history and terminal event markers, so completed, failed, and removed entries remain visible after restarts.

Cancelling a download only removes the aria2 task. Partial files, completed files, and aria2 control files are deliberately retained so a later retry can resume when the remote server supports it.

## Operations

Stop the services without deleting persistent volumes:

```bash
docker compose down
```

Follow all logs or one service:

```bash
docker compose logs -f
docker compose logs -f aria2
docker compose logs -f download-manager
```

Restart after configuration changes:

```bash
docker compose up -d --build
```

Do not run `docker compose down -v` unless you intentionally want to remove the aria2 session and dashboard history. That command does not delete files in the host downloads directory.

## Security

The aria2 RPC port is exposed only to the internal Compose network and is protected by `ARIA2_RPC_SECRET`. The secret is used only by server-side Route Handlers and is never included in browser responses or JavaScript bundles. Only HTTP and HTTPS URLs are accepted.

The dashboard itself has no authentication. Keep port 3000 private, use a VPN, or place it behind a reverse proxy that provides authentication and TLS before exposing it outside your network.

## Local development

Run aria2 with the expected RPC configuration, then install and start Next.js:

```bash
pnpm install
ARIA2_RPC_URL=http://127.0.0.1:6800/jsonrpc \
ARIA2_RPC_SECRET=your-local-secret \
APP_STATE_DIR=.download-manager-state \
pnpm dev
```

## Validation

```bash
pnpm test
pnpm lint
pnpm build
docker compose config
docker compose build
```

For a persistence smoke test, start a large download, pause and resume it, run `docker compose down`, then start again with `docker compose up -d`. The task should return from the saved aria2 session. Completed and cancelled entries should remain in the dashboard because their history is stored separately.
