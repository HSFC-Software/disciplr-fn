alter table "public"."events" drop constraint "events_attachments_id_fkey";

alter table "public"."events" drop constraint "events_consolidation_id_fkey";

alter table "public"."events" drop constraint "events_event_type_fkey";

alter table "public"."events" drop constraint "events_locations_id_fkey";

alter table "public"."events" drop constraint "events_network_id_fkey";

alter table "public"."events" drop constraint "events_participants_id_fkey";

alter table "public"."events" add constraint "events_attachments_id_fkey" FOREIGN KEY (attachments_id) REFERENCES files(id) not valid;

alter table "public"."events" validate constraint "events_attachments_id_fkey";

alter table "public"."events" add constraint "events_consolidation_id_fkey" FOREIGN KEY (consolidation_id) REFERENCES consolidations(id) ON DELETE CASCADE not valid;

alter table "public"."events" validate constraint "events_consolidation_id_fkey";

alter table "public"."events" add constraint "events_event_type_fkey" FOREIGN KEY (event_type) REFERENCES event_type(name) not valid;

alter table "public"."events" validate constraint "events_event_type_fkey";

alter table "public"."events" add constraint "events_locations_id_fkey" FOREIGN KEY (locations_id) REFERENCES locations(id) not valid;

alter table "public"."events" validate constraint "events_locations_id_fkey";

alter table "public"."events" add constraint "events_network_id_fkey" FOREIGN KEY (network_id) REFERENCES networks(id) not valid;

alter table "public"."events" validate constraint "events_network_id_fkey";

alter table "public"."events" add constraint "events_participants_id_fkey" FOREIGN KEY (participants_id) REFERENCES disciples(id) not valid;

alter table "public"."events" validate constraint "events_participants_id_fkey";


