alter table identity.account add column version bigint not null default 0;
alter table identity.account add column password_set boolean not null default true;
alter table identity.spring_session alter column principal_name type varchar(254);
create table identity.password_reset (
    id uuid primary key,
    account_id uuid not null references identity.account(id),
    token_hash varchar(64) not null unique,
    auth_version bigint not null,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_by uuid not null references identity.account(id),
    created_at timestamptz not null
);
create index password_reset_account_idx on identity.password_reset(account_id);
