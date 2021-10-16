create schema identity;
create schema publishing;
create schema media;
create schema site;
create schema discovery;
create schema platform;
create extension if not exists pg_trgm;

create table identity.account (
  id uuid primary key, email varchar(254) not null unique, display_name varchar(120) not null,
  password_hash varchar(255) not null, role varchar(30) not null,
  active boolean not null default true, auth_version bigint not null default 0,
  created_at timestamptz not null,
  constraint account_role check (role in ('ADMIN','EDITOR','AUTHOR'))
);
create table identity.spring_session (
  primary_id char(36) primary key, session_id char(36) not null unique,
  creation_time bigint not null, last_access_time bigint not null,
  max_inactive_interval integer not null, expiry_time bigint not null, principal_name varchar(100)
);
create index spring_session_expiry on identity.spring_session(expiry_time);
create index spring_session_principal on identity.spring_session(principal_name);
create table identity.spring_session_attributes (
  session_primary_id char(36) not null references identity.spring_session(primary_id) on delete cascade,
  attribute_name varchar(200) not null, attribute_bytes bytea not null,
  primary key(session_primary_id, attribute_name)
);
create table media.asset (
  id uuid primary key, owner_id uuid not null references identity.account(id),
  original_name varchar(255) not null, object_key varchar(300) not null unique,
  content_type varchar(80) not null, byte_size bigint not null check(byte_size > 0),
  width integer not null, height integer not null, status varchar(20) not null,
  created_at timestamptz not null
);
create table publishing.content_entry (
  id uuid primary key, owner_id uuid not null references identity.account(id),
  locale varchar(5) not null check(locale in ('vi','en')),
  draft_json jsonb not null, draft_version bigint not null,
  live_revision_id uuid, version bigint not null default 0,
  created_at timestamptz not null, updated_at timestamptz not null
);
create table publishing.content_revision (
  id uuid primary key, entry_id uuid not null references publishing.content_entry(id),
  draft_version bigint not null, snapshot_json jsonb not null,
  published_at timestamptz not null, published_by uuid not null references identity.account(id),
  author_name varchar(120) not null,
  unique(entry_id,id)
);
alter table publishing.content_entry add constraint content_live_revision
  foreign key(id,live_revision_id) references publishing.content_revision(entry_id,id) deferrable initially deferred;
create index content_owner_updated on publishing.content_entry(owner_id, updated_at desc);
create index revision_history on publishing.content_revision(entry_id,published_at desc);
create table media.asset_usage (
  source_id uuid not null, asset_id uuid not null references media.asset(id),
  published boolean not null default false,
  primary key(source_id,asset_id,published)
);
create index asset_public_usage on media.asset_usage(asset_id) where published;
create table site.public_route (
  locale varchar(5) not null, slug varchar(160) not null,
  source_id uuid not null, canonical boolean not null, active boolean not null,
  primary key(locale,slug)
);
create unique index source_canonical_route on site.public_route(source_id) where canonical and active;
create table discovery.search_document (
  source_id uuid primary key, locale varchar(5) not null, slug varchar(160) not null,
  title varchar(200) not null, summary varchar(360) not null,
  category varchar(40) not null, cover_id uuid, author_name varchar(120) not null,
  search_text text not null, published_at timestamptz not null,
  search_vector tsvector generated always as (to_tsvector('simple',search_text)) stored
);
create index search_document_vector on discovery.search_document using gin(search_vector);
create index search_document_trgm on discovery.search_document using gin(search_text gin_trgm_ops);
create table platform.audit_event (
  id uuid primary key, actor_id uuid not null, action varchar(60) not null,
  resource_id uuid not null, occurred_at timestamptz not null, details jsonb not null default '{}'
);
create table publishing.idempotency_record (
  actor_id uuid not null, request_key varchar(100) not null, entry_id uuid not null,
  draft_version bigint not null, revision_id uuid not null, created_at timestamptz not null,
  primary key(actor_id,request_key)
);
