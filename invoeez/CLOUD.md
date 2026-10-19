# InvoEez in the cloud — hosting and database

## Where things stand today

InvoEez is one self-contained web page (`dist/index.html`, the same as `invoeez.html`). All of a company's books live in the **browser's own storage** on the computer that opened it. That means:

- It works offline and needs no server.
- Each browser, Chrome profile or computer has its **own separate books**. Two people on two laptops do not see each other's invoices.
- Clearing the browser's data deletes the books, so **Settings › Back up** matters.
- Users, roles, PINs and approvals are enforced by the screen, not by a server, so they keep honest colleagues in their lane but are not security against someone with access to the computer.

There are two steps to "the cloud". Step A puts the app online with no code changes. Step B adds a real database so a whole team shares one set of books.

---

## Step A — put the app online (no code changes)

Any static web host will serve the file over HTTPS on your own address (for example `app.yourcompany.ae`). Upload **one file**: `dist/index.html` (made by `npm run build`), or a copy of `invoeez.html` renamed to `index.html`.

| Host | How | Cost |
| --- | --- | --- |
| **Netlify** | app.netlify.com/drop → drag a folder containing `index.html` onto the page → you get a link; add your domain under *Domain settings*. | Free tier |
| **Cloudflare Pages** | Dashboard › Workers & Pages › Create › Pages › *Upload assets* → upload the folder with `index.html`. | Free tier |
| **GitHub Pages** | Copy `index.html` into a `docs/` folder at the top of the repository, then Repository › Settings › Pages → *Deploy from a branch* → that branch, folder `/docs`. | Free for public repositories (private repositories need a paid plan) |
| **Azure Static Web Apps** | Create a Static Web App and deploy the folder with `index.html` (from GitHub or the Azure CLI). | Free tier |

**What you get:** a link anyone can open from any device, always the latest version, HTTPS.
**What you do not get yet:** shared data. Every person who opens the link still has their own books in their own browser. Step A suits a single user, demos and trials.

---

## Step B — the cloud version with a database

### What the database adds

- One set of books per company, shared by everyone in it, from any device.
- Real sign-in (email and password or Microsoft/Google, with two-factor), replacing the on-device PIN.
- Roles, purchase approvals and posting rules **enforced on the server**, so they cannot be bypassed.
- Two people can work at the same time; changes appear for others within seconds.
- Automatic daily backups and point-in-time restore, plus the JSON export you have today.
- An audit trail: who created, posted, approved, changed or deleted what, and when.
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

The app already keeps the whole company's books in one data object and already syncs open tabs, so the move can be done in phases without redesigning the screens.

**Phase 1 — shared books (fastest, a few days of work)**
- Sign-in with email and password (two-factor optional), one company per account, invite colleagues with a role and the purchase-approver flag.
- The company's books are stored in the database as one versioned record; every save checks the version, so two people cannot silently overwrite each other ("Updated by Aisha a moment ago — reload").
- Live updates push changes to everyone who has the company open.
- A one-click import of your current browser books (the backup file) into the cloud company.

**Phase 2 — full database (for growth and audit)**
- Split the record into proper tables: `companies`, `members`, `accounts`, `account_groups`, `partners`, `products`, `categories`, `price_lists`, `documents` and `document_lines`, `payments`, `pdcs`, `journal_entries` and `journal_lines`, `stock_operations`, `fixed_assets`, `audit_log`.
- Posting, numbering (INV/2026/0001…), approvals and period locks happen on the server inside a database transaction; posted documents can only be reversed, never edited.
- Reports run as database queries, so they stay fast with many years of data.

**Phase 3 — connections**
- E-invoicing through an accredited service provider (PINT AE), bank statement import and matching, email and WhatsApp sending from the server.

### Security checklist

HTTPS only · passwords never stored in the browser · two-factor sign-in · row-level security so a company sees only its own rows · roles and approvals checked on the server · encrypted at rest · daily backups with tested restores · audit log kept for at least five years · least-privilege keys kept on the server, never in the page.

### What is needed to start Phase 1

1. Choose the provider (Supabase for speed, or Azure/AWS if you need a UAE region).
2. Create the account in your company's name (the owner should hold the billing and admin rights) and invite the developer.
3. Choose the web address (for example `app.yourcompany.ae`).
4. Decide the sign-in method (email and password, and/or Microsoft or Google).
