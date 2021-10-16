create schema if not exists academics;

alter table site.public_route add column namespace varchar(30) not null default 'articles';
alter table site.public_route drop constraint public_route_pkey;
alter table site.public_route add primary key(locale,namespace,slug);

create table academics.program (
    id uuid primary key, code varchar(30) not null, locale varchar(5) not null check(locale in ('vi','en')),
    level varchar(30) not null check(level in ('UNDERGRADUATE','MASTER','DOCTORATE')),
    draft jsonb not null, draft_version bigint not null, version bigint not null,
    live_edition_id uuid, retired boolean not null default false,
    retirement_reason varchar(1000) not null default '',
    created_at timestamptz not null, updated_at timestamptz not null,
    unique(locale,code)
);
create table academics.program_edition (
    id uuid primary key, program_id uuid not null references academics.program(id),
    draft_version bigint not null, snapshot jsonb not null,
    published_at timestamptz not null, published_by uuid not null references identity.account(id),
    unique(program_id,id)
);
alter table academics.program add constraint program_live_edition_fk
    foreign key(id,live_edition_id) references academics.program_edition(program_id,id) deferrable initially deferred;

create table academics.admission (
    id uuid primary key, code varchar(30) not null, locale varchar(5) not null check(locale in ('vi','en')),
    level varchar(30) not null check(level in ('UNDERGRADUATE','MASTER','DOCTORATE')),
    draft jsonb not null, draft_version bigint not null, version bigint not null, live_edition_id uuid,
    created_at timestamptz not null, updated_at timestamptz not null, unique(locale,code)
);
create table academics.admission_edition (
    id uuid primary key, admission_id uuid not null references academics.admission(id),
    draft_version bigint, snapshot jsonb not null, programs jsonb not null,
    closed_at timestamptz, closure_reason varchar(1000) not null default '',
    action varchar(30) not null, reason varchar(1000) not null default '',
    published_at timestamptz not null, published_by uuid not null references identity.account(id),
    unique(admission_id,id)
);
alter table academics.admission add constraint admission_live_edition_fk
    foreign key(id,live_edition_id) references academics.admission_edition(admission_id,id) deferrable initially deferred;
create table academics.admission_program (
    admission_id uuid not null references academics.admission(id),
    program_id uuid not null references academics.program(id),
    primary key(admission_id,program_id)
);
create index admission_program_program_idx on academics.admission_program(program_id);

create table discovery.education_document (
    source_id uuid primary key, kind varchar(20) not null check(kind in ('PROGRAM','ADMISSION')),
    code varchar(30) not null, locale varchar(5) not null, level varchar(30) not null,
    slug varchar(180) not null, title varchar(180) not null, summary varchar(600) not null,
    cover_id uuid, year integer, opens_at timestamptz, closes_at timestamptz, closed_at timestamptz,
    program_ids jsonb not null default '[]', search_text text not null, published_at timestamptz not null
);
create index education_locale_kind_idx on discovery.education_document(locale,kind,published_at desc,source_id);
create index education_search_idx on discovery.education_document using gin(search_text gin_trgm_ops);
create index education_programs_idx on discovery.education_document using gin(program_ids);

-- Existing sessions must obtain the new capability set on their next login.
update identity.account set auth_version=auth_version+1 where role in ('ADMIN','EDITOR');
