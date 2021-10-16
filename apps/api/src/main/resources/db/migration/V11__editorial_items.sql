create schema editorial;
create table editorial.item (
    id uuid primary key,
    kind varchar(12) not null check (kind in ('EVENT', 'NEWS', 'JOB')),
    locale varchar(2) not null check (locale in ('vi', 'en')),
    slug varchar(160) not null,
    article_id uuid unique references publishing.content_entry(id),
    draft jsonb not null,
    live jsonb,
    version bigint not null,
    draft_version bigint not null,
    published_draft_version bigint,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    published_at timestamptz,
    unique (kind, locale, slug)
);
create index editorial_item_public on editorial.item(kind, locale, (live->>'slug')) where live is not null;
