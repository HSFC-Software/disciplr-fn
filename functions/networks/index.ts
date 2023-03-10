// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as queryString from "https://deno.land/x/querystring@v1.0.2/mod.js";
import { supabase } from "../_shared/supabase-client.ts";
import { cors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }

  const selectQuery = `
    *,
    discipler_id (
      id,
      first_name,
      last_name
    ) 
  `;

  if (req.method === "POST") {
    const { name, discipler_id } = await req.json();

    const { data, error } = await supabase
      .from("networks")
      .insert({
        name,
        discipler_id,
      })
      .select(selectQuery)
      .single();

    // error handler
    if (error) {
      console.log(error);
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    // success response
    if (data) {
      return new Response(JSON.stringify(data), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 200,
      });
    }
  }

  const idPattern = new URLPattern({ pathname: "/networks/:id" });
  const matchingPath = idPattern.exec(req.url);

  const id = matchingPath ? matchingPath.pathname.groups.id : null;

  if (req.method === "GET") {
    const url = new URL(req.url);
    const discipler_id = url.searchParams.get("discipler");

    /**
     * Get all networks for a discipler
     */
    if (discipler_id) {
      const { error, data: networks } = await supabase
        .from("networks")
        .select(`*`)
        .eq("discipler_id", discipler_id)
        .order("created_at", { ascending: false });

      // error handler
      if (error) {
        console.log(error);
        return new Response(JSON.stringify({}), {
          headers: cors({ "Content-Type": "application/json" }),
          status: 409,
        });
      }

      const response = await Promise.all(
        networks.map(async (network) => {
          const res = await supabase
            .from("network_disciples")
            .select("*", { count: "exact", head: true })
            .eq("network_id", network.id);

          return { ...network, member_count: res.count };
        })
      );

      // success response
      if (response) {
        return new Response(JSON.stringify(response), {
          headers: cors({ "Content-Type": "application/json" }),
          status: 200,
        });
      }
    }

    const query = supabase.from("networks").select(selectQuery);

    if (id) {
      query.eq("id", id);
      query.single();

      const { error, data } = await query;

      // error handler
      if (error) {
        return new Response(JSON.stringify({}), {
          headers: cors({ "Content-Type": "application/json" }),
          status: 409,
        });
      }

      // success response
      return new Response(JSON.stringify(data), {
        headers: cors({ "Content-Type": "application/json" }),
      });
    }

    const { data, error } = await query;

    // error handler
    if (error) {
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    // success response
    if (data) {
      return new Response(JSON.stringify(data), {
        headers: cors({ "Content-Type": "application/json" }),
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
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    // success response
    if (data) {
      return new Response(JSON.stringify(data), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 200,
      });
    }
  }

  // fallback response
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
