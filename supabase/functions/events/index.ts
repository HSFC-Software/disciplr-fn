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
locations(*),
consolidations(*),
event_participants(*),
files(*)
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
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

  if (req.method === "GET") {
    const url = new URL(req.url);
    const params = queryString.parse(url.search);

    const query = supabase.from("events").select(selectQuery);
    const orQuery = [];

    const startDate = moment(params.date ?? new Date());
    startDate.set("date", 1);

    const endDate = moment(startDate);
    endDate.set("month", startDate.month() + 1);
    endDate.subtract("days", 1);

    query.gte("date_time", startDate.utc().toISOString());
    query.lte("date_time", endDate.utc().toISOString());

    let event_type = [params.type];

    if (Array.isArray(params.type)) {
      event_type = params.type;
    }

    query.in("event_type", event_type);
    query.order("date_time", { ascending: "asc" });

    const { data, error } = await query;

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
