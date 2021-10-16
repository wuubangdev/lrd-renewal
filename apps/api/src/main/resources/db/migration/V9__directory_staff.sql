create schema if not exists directory;
create table directory.staff_profile (
  id uuid primary key,
  locale varchar(5) not null check (locale in ('vi','en')),
  slug varchar(160) not null,
  draft jsonb not null,
  live jsonb,
  version bigint not null default 0,
  draft_version bigint not null default 1,
  published_draft_version bigint,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  published_at timestamptz,
  unique(locale,slug)
);
create index staff_profile_public on directory.staff_profile(locale,published_at desc) where live is not null;
