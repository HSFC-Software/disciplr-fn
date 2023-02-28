// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../utils/supabase-client.ts";

const selectQuery = `
  *,
  main_network_id(
    *,
    discipler_id(
      *
    )
  ),
  networks_id(
    *,
    discipler_id(
      *
    )
  )
`;

serve(async (req) => {
  // For more details on URLPattern, check https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
  const idPattern = new URLPattern({ pathname: "/link/network" });
  const matchingPath = idPattern.exec(req.url);

  // link/unlink network endpoint
  console.log("matched");
  if (matchingPath.pathname.input === "/link/network") {
    if (req.method === "POST") {
      const { name, discipler_id, network_id } = await req.json();

      const { error, data } = await supabase
        .from("networks") //
        .insert({
          name: name,
          discipler_id: discipler_id,
        })
        .select(`*, discipler_id(*)`)
        .single();

      if (error) {
        console.log({ error });
        return new Response(JSON.stringify({}), {
          headers: { "Content-Type": "application/json" },
          status: 409,
        });
      }

      const { error: networkError, data: network } = await supabase
        .from("network_networks") //
        .insert({
          main_network_id: network_id,
          networks_id: data.id,
        })
        .select(selectQuery)
        .single();

      if (networkError) {
        console.log({ networkError });
        await supabase.from("networks").delete().eq("id", data.id);
        return new Response(JSON.stringify({}), {
          headers: { "Content-Type": "application/json" },
          status: 409,
        });
      }

      return new Response(JSON.stringify(network), {
        headers: { "Content-Type": "application/json" },
        status: 201,
      });
    }
  }

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
