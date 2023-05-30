alter table "public"."events" add column "attachments_id" uuid;

alter table "public"."events" add column "locations_id" uuid;

alter table "public"."events" disable row level security;

alter table "public"."events" add constraint "events_attachments_id_fkey" FOREIGN KEY (attachments_id) REFERENCES files(id) ON DELETE CASCADE not valid;

alter table "public"."events" validate constraint "events_attachments_id_fkey";

alter table "public"."events" add constraint "events_locations_id_fkey" FOREIGN KEY (locations_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."events" validate constraint "events_locations_id_fkey";


