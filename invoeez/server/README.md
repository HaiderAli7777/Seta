# InvoEez sync server

A small Node.js service that keeps each company's InvoEez books in the cloud, so several people and devices share one set of books and anyone can keep working offline.

- **One versioned record per company.** A save is accepted only on top of the latest version. If someone else saved first, the server answers with the latest books and the app merges record by record before trying again, so nobody's work is overwritten.
- **Every version is kept**, with who saved it, from which device and when, for audit and recovery.
- **Storage:** PostgreSQL when `DATABASE_URL` is set; otherwise JSON files in `DATA_DIR`, which is fine for a trial or one small office.
- **Serves the app too.** Open the server's address in a browser to get InvoEez. Settings › Cloud sync fills in the address, the app works offline from then on, and it can be installed.
- Needs Node.js 18 or later. The only dependency is `pg`, the PostgreSQL driver.

## Run it

From the `invoeez` folder:

```bash
npm ci && npm run build          # builds the app into dist/
cd server && npm install
npm run create-company "Gulf Trading LLC"
#   Company id: 3f9a0c1d2e4b
#   Access key: 3f9a0c1d2e4b.Vt2…      ← give this to the people who use these books
DATABASE_URL=postgres://user:password@host:5432/invoeez npm start
#   InvoEez sync server 1.0.0 on http://localhost:8787 · storage: postgres
```

Then, on each device:

1. Open the server's address, for example `https://books.yourcompany.ae`.
2. Go to **Settings › Cloud sync**.
3. Paste the access key and click **Connect**.

What happens next:

- **The first device** uploads its books.
- **A new device** downloads them.
- **A device that already has its own books** asks which set to keep, and downloads a backup first.

The app can also be hosted somewhere else. In that case, enter the server address by hand and set `ALLOW_ORIGIN` on the server to the app's address.

The server creates its tables on start. `schema.sql` shows them for reference.

### Settings (environment variables)

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | — | PostgreSQL connection string. Without it, the books are stored as files. |
| `PGSSL` | — | Set to `require` for managed databases that need TLS (Azure, AWS RDS and most hosted PostgreSQL). |
| `PORT` | `8787` | Port to listen on. |
| `DATA_DIR` | `server/data` | Folder for file storage. Keep it on a persistent disk. |
| `APP_DIR` | `../dist` | The built app the server serves. |
| `ALLOW_ORIGIN` | `*` | The sites allowed to call the API, separated by commas, for example `https://app.yourcompany.ae`. |
| `MAX_BODY_MB` | `25` | Largest upload accepted. |

### Commands

| Command | What it does |
| --- | --- |
| `npm run create-company "Name"` | Creates a company and prints its access key. The server stores only a hash of the key, so a lost key cannot be recovered. Make a new one instead. |
| `node index.mjs rotate-key <companyId>` | Issues a new access key. The old key stops working, and every device must reconnect with the new one. |
| `npm start` | Starts the server. |

## Deploy

Always serve it over **HTTPS**, because the access key travels with every request. Back up the database daily; managed PostgreSQL does this for you.

| Where | How |
| --- | --- |
| **Docker** (any cloud or server) | From the `invoeez` folder: `docker build -t invoeez -f server/Dockerfile .`, then `docker run -p 8787:8787 -e DATABASE_URL=… -e PGSSL=require invoeez`. Create a company with `docker run --rm -e DATABASE_URL=… invoeez node index.mjs create-company "Name"`. |
| **Azure** (UAE North) | Use Azure Database for PostgreSQL – Flexible Server, plus App Service (Linux, Node 22) or Container Apps with the Docker image. Set `DATABASE_URL` and `PGSSL=require` in the app settings, and add a custom domain with a managed certificate. |
| **AWS** (Middle East – UAE) | Use RDS for PostgreSQL, plus App Runner, ECS Fargate or Elastic Beanstalk with the Docker image. Set the same variables. |
| **Render / Railway / Fly.io** | Create a PostgreSQL database and a web service from the repository with the Dockerfile, and set `DATABASE_URL`. |
| **A VPS** | Install Node.js 22 and PostgreSQL, run `npm start` under systemd or pm2, and put Caddy or nginx in front for HTTPS. |

Ask your tax adviser whether your records must stay in the UAE. If they must, choose a UAE region.

## API (for reference)

All calls except health need `Authorization: Bearer <access key>`.

| Call | Answer |
| --- | --- |
| `GET /api/health` | `{ ok, service: "invoeez-sync", version, storage }` |
| `GET /api/books` | `204` if the company has no books yet. Otherwise `{ company, version, payload: { books, company }, updatedAt, updatedBy, device }`, gzip-compressed when the client accepts it. |
| `PUT /api/books` | Body `{ baseVersion, payload, user, device }`. Returns `200 { version, updatedAt }`, or `409` with the latest books when `baseVersion` is out of date. |
| `GET /api/books/history?limit=50` | Recent versions: number, when, who and which device. |
| `GET /api/books/versions/:n` | One earlier version in full, for recovery. |

## Limits to know

- **One access key per company.** Everyone with the key can read and change the books. Users, roles, PINs and approvals are still enforced by the app, not by the server.
- **Whole-books saves.** Each save sends the company's whole books, which is fine up to several thousand documents. Larger companies need the per-record database described in `CLOUD.md`, Phase 2.
