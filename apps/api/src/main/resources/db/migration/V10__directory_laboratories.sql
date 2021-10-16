create table directory.laboratory_profile (
    id uuid primary key,
    locale varchar(2) not null check (locale in ('vi', 'en')),
    slug varchar(160) not null,
    draft jsonb not null,
    live jsonb,
    version bigint not null,
    draft_version bigint not null,
    published_draft_version bigint,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    published_at timestamptz,
    unique (locale, slug)
);
create index laboratory_profile_public on directory.laboratory_profile(locale, (live->>'slug')) where live is not null;
