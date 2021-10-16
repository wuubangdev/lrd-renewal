create table site.managed_document (
    id uuid primary key,
    kind varchar(20) not null check (kind in ('HOME','MENU')),
    locale varchar(5) not null check (locale in ('vi','en')),
    draft jsonb not null,
    draft_version bigint not null,
    version bigint not null,
    live_release_id uuid,
    updated_at timestamptz not null,
    unique(kind,locale)
);
create table site.document_release (
    id uuid primary key,
    document_id uuid not null references site.managed_document(id),
    draft_version bigint not null,
    snapshot jsonb not null,
    published_at timestamptz not null,
    published_by uuid references identity.account(id),
    unique(document_id,id)
);
alter table site.managed_document add constraint site_live_release_fk
    foreign key(id,live_release_id) references site.document_release(document_id,id) deferrable initially deferred;
