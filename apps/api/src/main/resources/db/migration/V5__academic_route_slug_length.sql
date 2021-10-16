-- Academics accepts slugs up to 180 characters; keep the shared route registry aligned.
alter table site.public_route alter column slug type varchar(180);
