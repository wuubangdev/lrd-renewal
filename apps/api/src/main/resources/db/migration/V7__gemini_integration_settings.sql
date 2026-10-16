create table platform.gemini_settings (
  id smallint primary key default 1 check (id = 1),
  model varchar(80) not null,
  encrypted_api_key bytea,
  updated_by uuid references identity.account(id),
  updated_at timestamptz not null
);
