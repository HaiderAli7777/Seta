-- InvoEez sync server schema (the server creates these tables itself on start; kept here for reference and reviews).
create table if not exists companies (
  id text primary key,
  name text not null,
  key_hash text not null,               -- sha-256 of the secret part of the access key; the key itself is never stored
  created_at timestamptz not null default now()
);
create table if not exists books (
  company_id text primary key references companies(id) on delete cascade,
  version integer not null,             -- goes up by one on every accepted save
  payload jsonb not null,               -- { books, company }
  updated_at timestamptz not null default now(),
  updated_by text,
  device text
);
create table if not exists book_versions (  -- every accepted save, for audit and recovery
  company_id text not null references companies(id) on delete cascade,
  version integer not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_by text,
  device text,
  primary key (company_id, version)
);
