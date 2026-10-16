create table platform.translation_link (
    source_kind varchar(24) not null,
    source_id uuid not null,
    target_id uuid not null,
    created_at timestamptz not null default now(),
    primary key (source_kind, source_id),
    unique (source_kind, target_id)
);
