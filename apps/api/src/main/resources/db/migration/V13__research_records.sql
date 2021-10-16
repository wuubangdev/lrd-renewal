create schema research;
create table research.record (
    id uuid primary key,
    kind varchar(24) not null check (kind in ('PROJECT','JOURNAL_ARTICLE','CONFERENCE_PAPER','TEXTBOOK','DOCUMENT')),
    locale varchar(2) not null check (locale in ('vi','en')),
    slug varchar(200) not null,
    source_key varchar(160) unique,
    draft jsonb not null,
    live jsonb,
    version bigint not null,
    draft_version bigint not null,
    published_draft_version bigint,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    published_at timestamptz,
    unique(locale,slug)
);
create index research_public_kind on research.record(locale,kind,published_at desc) where live is not null;
create unique index research_public_slug on research.record(locale,(live->>'slug')) where live is not null;
create table research.record_contributor (
    record_id uuid not null references research.record(id) on delete cascade,
    staff_id uuid not null references directory.staff_profile(id),
    role varchar(30) not null,
    display_order integer not null,
    primary key(record_id,staff_id)
);
create index research_staff_records on research.record_contributor(staff_id,record_id);
