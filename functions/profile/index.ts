// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabase } from "../_shared/supabase-client.ts";
import { cors } from "../_shared/cors.ts";

serve(async (req) => {
  // For more details on URLPattern, check https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
  const idPattern = new URLPattern({ pathname: "/profile/:id" });
  const matchingPath = idPattern.exec(req.url);

  const id = matchingPath ? matchingPath.pathname.groups.id : null;

  const url = new URL(req.url);
  const params = Object.fromEntries(new URLSearchParams(url.search));

  if (params.email) {
    const query = supabase.from("disciples").select("*");
    query.eq("email", params.email);
    query.single();

    const { data, error } = await query;

    return new Response(JSON.stringify(data), {
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  if (id) {
    const query = supabase.from("disciples").select("*");
    query.eq("id", id);
    query.single();

    const { data, error } = await query;

    return new Response(JSON.stringify(data), {
      headers: cors({ "Content-Type": "application/json" }),
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
