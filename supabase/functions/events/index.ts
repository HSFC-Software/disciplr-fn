// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import log from "../_shared/log.ts";
import { supabase } from "../_shared/supabase-client.ts";
import { cors } from "../_shared/cors.ts";
import * as queryString from "https://deno.land/x/querystring@v1.0.2/mod.js";
import moment from "https://deno.land/x/momentjs@2.29.1-deno/mod.ts";

const selectQuery = `
*,
event_participants!event_participants_event_id_fkey(
  id,
  participant_id(
    id,
    first_name,
    last_name,
    status
  )
),
location_id(*)
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }

  const participantsPattern = new URLPattern({
    pathname: "/events/participants",
  });
  const participantsMatchingPath = participantsPattern.exec(req.url);

  if (participantsMatchingPath?.pathname?.input === "/events/participants") {
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const params = queryString.parse(url.search);

      const id = params.id;

      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("id", id);

      if (error) {
        log("Error removing event participants", req.url, error);
        return new Response(JSON.stringify({}), {
          headers: cors({ "Content-Type": "application/json" }),
          status: 409,
        });
      }

      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
      });
    }

    if (req.method === "POST") {
      const { event_id, participants } = await req.json();

      const payload =
        participants?.map?.((id) => ({
          event_id,
          participant_id: id,
        })) || [];

      const { data, error } = await supabase
        .from("event_participants")
        .insert(payload)
        .select(`id, participant_id`);

      if (error) {
        log("Error creating event participants", req.url, {
          ...error,
          payload,
        });
        return new Response(JSON.stringify({}), {
          headers: cors({ "Content-Type": "application/json" }),
          status: 409,
        });
      }

      return new Response(JSON.stringify(data), {
        headers: cors({ "Content-Type": "application/json" }),
      });
    }
  }

  if (req.method === "POST") {
    const { event_type, name, date_time, network_id, consolidation_id } =
      await req.json();

    const payload = {
      event_type,
      name,
      date_time,
    };

    if (network_id) payload.network_id = network_id;
    if (consolidation_id) payload.consolidation_id = consolidation_id;

    const { data, error } = await supabase
      .from("events")
      .insert(payload)
      .select(selectQuery)
      .single();

    if (error) {
      log("Error creating event", req.url, error);
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    return new Response(JSON.stringify(data), {
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  // For more details on URLPattern, check https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
  const idPattern = new URLPattern({ pathname: "/events/:id" });
  const matchingPath = idPattern.exec(req.url);

  const id = matchingPath ? matchingPath.pathname.groups.id : null;

  if (req.method === "GET" && id) {
    const { data, error } = await supabase
      .from("events")
      .select(selectQuery)
      .eq("id", id)
      .single();

    if (error) {
      log("Error fetching event", req.url, error);
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    if (!data) {
      log("Unable to find event in the records", req.url, { id });
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 404,
      });
    }

    return new Response(JSON.stringify(data), {
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const params = queryString.parse(url.search);

    const network_id = params.network_id;

    const query = supabase.from("events").select(selectQuery);
    const orQuery = [];

    const startDate = moment(params.date ?? new Date());
    startDate.set("date", 1);

    const endDate = moment(startDate);
    endDate.set("month", startDate.month() + 1);
    endDate.subtract("days", 1);

    query.gte("date_time", startDate.utc().toISOString());
    query.lte("date_time", endDate.utc().toISOString());

    if (network_id) {
      query.eq("network_id", network_id);
    }

    let event_type = [params.type]; // ["CELLGROUP", "CLOSED_CELL"]

    if (Array.isArray(params.type)) {
      event_type = params.type;
    }

    query.in("event_type", event_type);
    query.order("date_time", { ascending: "asc" });

    const { data, error } = await query;

    if (error) {
      log("Error fetching events", req.url, error);
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    return new Response(JSON.stringify(data ?? []), {
      headers: cors({ "Content-Type": "application/json" }),
      status: 200,
    });
  }

  return new Response(JSON.stringify({}), {
    headers: cors({ "Content-Type": "application/json" }),
    status: 404,
  });
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
