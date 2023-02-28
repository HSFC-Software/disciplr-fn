// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabase } from "../utils/supabase-client.ts";

serve(async (req) => {
  const selectQuery = `
    *,
    discipler_id (
      id,
      first_name,
      last_name
    ) 
  `;

  const idPattern = new URLPattern({ pathname: "/networks/:id" });
  const matchingPath = idPattern.exec(req.url);

  const id = matchingPath ? matchingPath.pathname.groups.id : null;

  if (req.method === "GET") {
    const query = supabase.from("networks").select(selectQuery);

    if (id) {
      query.eq("id", id);
      query.single();

      const { error, data } = await query;

      // error handler
      if (error) {
        return new Response(JSON.stringify({}), {
          headers: { "Content-Type": "application/json" },
          status: 409,
        });
      }

      // success response
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data, error } = await query;

    // error handler
    if (error) {
      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
        status: 409,
      });
    }

    // success response
    if (data) {
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }
  }

  if (req.method === "PATCH") {
    const { name, status } = await req.json();

    const { data, error } = await supabase
      .from("networks")
      .update({ name, status })
      .eq("id", id)
      .select(selectQuery)
      .single();

    // error handler
    if (error) {
      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
        status: 409,
      });
    }

    // success response
    if (data) {
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }
  }

  // fallback response
  return new Response(JSON.stringify({}), {
    headers: { "Content-Type": "application/json" },
    status: 404,
  });
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
