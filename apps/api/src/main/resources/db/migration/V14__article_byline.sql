-- Preserve an editorial author independently of the account that published a revision.
update publishing.content_revision r
set snapshot_json = jsonb_set(r.snapshot_json, '{byline}', to_jsonb(
    coalesce(nullif(btrim(r.snapshot_json #>> '{origin,author}'), ''), r.author_name)), true)
where coalesce(r.snapshot_json->>'byline', '') = '';

update publishing.content_entry e
set draft_json = jsonb_set(e.draft_json, '{byline}', to_jsonb(
    coalesce(nullif(btrim(e.draft_json #>> '{origin,author}'), ''),
             (select r.author_name from publishing.content_revision r
              where r.entry_id = e.id order by r.published_at desc limit 1),
             owner_account.display_name)), true)
from identity.account owner_account
where owner_account.id = e.owner_id and coalesce(e.draft_json->>'byline', '') = '';

update discovery.search_document s
set author_name = left(r.snapshot_json->>'byline', 120)
from publishing.content_entry e
join publishing.content_revision r on r.id = e.live_revision_id
where s.source_id = e.id and coalesce(r.snapshot_json->>'byline', '') <> '';
