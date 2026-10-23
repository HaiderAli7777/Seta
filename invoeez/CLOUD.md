# InvoEez in the cloud — hosting and database

## Where things stand today (3.15)

InvoEez is **offline first**. Each device saves the company's books in its own browser storage the moment a change is made, so it keeps working with no internet. Since 3.15 there is also **cloud sync**:

- **The InvoEez sync server** (`server/`, see `server/README.md`) keeps one shared set of books per company in **PostgreSQL**, with every saved version kept.
- **Settings › Cloud sync** connects a device with the server address and the company's access key. Changes upload whenever there is a connection, and colleagues' changes come in. Work done offline uploads as soon as the connection returns and is merged record by record, so nothing is overwritten.
- **Opened from its web address**, the app keeps an offline copy of itself and can be installed like a desktop or phone app.

What is still on the device and not on the server:

- **Users, roles, PINs and purchase approvals** are enforced by the app. They keep honest colleagues in their lane, but they are not a server security boundary. Anyone holding the company's access key can read and change its books.
- **The company profile and preferences** sync with the books. Theme and layout stay per device.

The rest of this guide covers hosting the app (Step A) and the sync server with its database (Step B).

---

## Step A — put the app online (no code changes)

Any static web host will serve the file over HTTPS on your own address (for example `app.yourcompany.ae`). Upload **one file**: `dist/index.html` (made by `npm run build`), or a copy of `invoeez.html` renamed to `index.html`.

| Host | How | Cost |
| --- | --- | --- |
| **Netlify** | app.netlify.com/drop → drag a folder containing `index.html` onto the page → you get a link; add your domain under *Domain settings*. | Free tier |
| **Cloudflare Pages** | Dashboard › Workers & Pages › Create › Pages › *Upload assets* → upload the folder with `index.html`. | Free tier |
| **GitHub Pages** | Copy `index.html` into a `docs/` folder at the top of the repository, then Repository › Settings › Pages → *Deploy from a branch* → that branch, folder `/docs`. | Free for public repositories (private repositories need a paid plan) |
| **Azure Static Web Apps** | Create a Static Web App and deploy the folder with `index.html` (from GitHub or the Azure CLI). | Free tier |

**What you get:** a link anyone can open from any device, always the latest version, HTTPS. The page installs an offline copy of itself, provided `sw.js`, `manifest.webmanifest` and `icons/` from `dist/` are uploaded alongside `index.html`.
**What you do not get without Step B:** shared data. Every browser keeps its own books. To share them, add the sync server (Step B), or let the sync server host the app itself, which also removes the need for Step A.

---

## Step B — the sync server and its database

### What the database adds

**Available now (3.15):**

- One set of books per company, shared by everyone in it, from any device, and still usable offline.
- Two people can work at the same time. Changes reach the others within about 20 seconds, and offline work merges when the device reconnects.
- Every saved version is kept, with who saved it, from which device and when. Managed PostgreSQL adds daily backups and point-in-time restore, and the JSON export you have today still works.

**Next (Phases 2–3 below):**

- Real sign-in (email and password or Microsoft/Google, with two-factor), replacing the shared company key and the on-device PIN.
- Roles, purchase approvals and posting rules **enforced on the server**, so they cannot be bypassed.
- A record-level audit trail: who created, posted, approved, changed or deleted what, and when.
- The server-side connection needed for UAE e-invoicing (sending invoices through an accredited service provider) and, later, bank feeds.

### Recommended database: PostgreSQL

Accounting needs transactions that either fully save or not at all, strict rules on totals and references, and good reporting queries. PostgreSQL does all three, is open source (no lock-in), and every major cloud offers it as a managed service.

### Hosting options

| Option | What it is | UAE region | Approx. monthly cost* |
| --- | --- | --- | --- |
| **Supabase** | Managed PostgreSQL with sign-in, row-level security, file storage and live updates built in — the quickest route. | Check the current region list | about USD 25 (Pro) |
| **Azure** | Azure Database for PostgreSQL + Azure Static Web Apps / App Service. | UAE North (Dubai) | from about USD 15–30 for a small server |
| **AWS** | Amazon RDS for PostgreSQL + S3/CloudFront. | Middle East (UAE) | from about USD 15–30 for a small server |

\* Indicative only; check current pricing. Add a domain name (roughly AED 50–300 a year).

**Where the data lives:** UAE tax law requires tax records to be kept for at least five years (longer for real estate) and produced to the FTA on request. Some sectors and free zones also require data to stay in the UAE. Ask your tax adviser; if in doubt, choose a UAE region (Azure UAE North or AWS Middle East (UAE)).

### How the app changes

```
Browser (InvoEez app, same screens)
        │  HTTPS, signed-in user
        ▼
API / database rules  ──  checks role, approvals, posting rules, writes audit log
        │
        ▼
PostgreSQL (one schema, every row tagged with its company)
        │
        ├── daily backups + point-in-time restore
        └── e-invoicing provider, bank feeds (later)
```

The diagram shows the end state. Phase 1 is in place: the app already kept the whole company's books in one data object, and the sync server stores that object, versioned, in PostgreSQL. The later phases change no screens.

**Phase 1 — shared books, offline first (done in 3.15)**
- The company's books are stored in PostgreSQL as one versioned record. Every save checks the version, so two people cannot silently overwrite each other.
- Every version is kept with who, which device and when.
- Devices work offline and merge record by record when they reconnect:
  - customers, vendors and products merge field by field;
  - a document changed on two devices keeps the cloud version and offers "Use mine";
  - offline numbers that clash are renumbered.
- Colleagues' changes arrive within about 20 seconds, and at once on Sync now or when the window is reopened.
- Connecting a device that already has books lets you choose which set to keep. The first device uploads its books, which is the import.
- **Still to do in this phase:** personal sign-in on the server (email and password or Microsoft/Google, two-factor) in place of the shared company key, and live push instead of the 20-second check.

**Phase 2 — full database (for growth and audit)**
- Split the record into proper tables: `companies`, `members`, `accounts`, `account_groups`, `partners`, `products`, `categories`, `price_lists`, `documents` and `document_lines`, `payments`, `pdcs`, `journal_entries` and `journal_lines`, `stock_operations`, `fixed_assets`, `audit_log`.
- Posting, numbering (INV/2026/0001…), approvals and period locks happen on the server inside a database transaction; posted documents can only be reversed, never edited.
- Reports run as database queries, so they stay fast with many years of data.

**Phase 3 — connections**
- E-invoicing through an accredited service provider (PINT AE), bank statement import and matching, email and WhatsApp sending from the server.

### Security checklist

HTTPS only · passwords never stored in the browser · two-factor sign-in · row-level security so a company sees only its own rows · roles and approvals checked on the server · encrypted at rest · daily backups with tested restores · audit log kept for at least five years · least-privilege keys kept on the server, never in the page.

### What is needed to go live with the sync server

1. Choose where it runs and where the data lives: Azure UAE North or AWS Middle East (UAE) if your records must stay in the UAE. Render, Railway, a VPS or Docker work too.
2. Create a PostgreSQL database and set `DATABASE_URL` (and `PGSSL=require` for managed databases).
3. Run the server (Docker image or `npm start`) behind HTTPS on your address, for example `books.yourcompany.ae`.
4. `npm run create-company "Your company"` and keep the access key safe.
5. On the device that has the real books, open the address, then go to Settings › Cloud sync and Connect, which uploads them. Then connect the other devices.

Step-by-step commands are in `server/README.md`.
