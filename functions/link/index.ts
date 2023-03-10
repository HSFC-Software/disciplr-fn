// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase-client.ts";

serve(async (req) => {
  // For more details on URLPattern, check https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
  const networkPattern = new URLPattern({ pathname: "/link/network" });
  const networkMatchingPath = networkPattern.exec(req.url);

  // link/unlink network endpoint
  if (networkMatchingPath?.pathname?.input === "/link/network") {
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
        .select(
          `
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
        `
        )
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

  const disciplePattern = new URLPattern({ pathname: "/link/disciple" });
  const disciplePatternPath = disciplePattern.exec(req.url);

  if (disciplePatternPath?.pathname?.input === "/link/disciple") {
    if (req.method === "POST") {
      const { disciple_id, network_id } = await req.json();

      const { error, data } = await supabase
        .from("network_disciples")
        .insert({
          disciple_id,
          network_id,
        })
        .select(
          `
        id,
        disciple_id(
          id,
          first_name,
          last_name,
          created_at
        ),
        network_id(
          name,
          discipler_id(
            id,
            first_name,
            last_name
          ),
          created_at
        )
        created_at,
        status
      `
        )
        .single();

      if (error) {
        console.log(error);
        return new Response(JSON.stringify({}), {
          headers: { "Content-Type": "application/json" },
          status: 409,
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
        status: 201,
      });
    }
  }

  const newDisciplePattern = new URLPattern({ pathname: "/link/disciple/new" });
  const newDisciplePatternPath = newDisciplePattern.exec(req.url);

  // link/unlink network disciple
  if (newDisciplePatternPath?.pathname?.input === "/link/disciple/new") {
    const { first_name, last_name, middle_name, network_id } = await req.json();

    const disciplePayload = {};

    if (first_name) disciplePayload.first_name = first_name;
    if (last_name) disciplePayload.last_name = last_name;
    if (middle_name) disciplePayload.middle_name = middle_name;

    const { error, data: disciple } = await supabase
      .from("disciples")
      .insert(disciplePayload)
      .select(`id`)
      .single();

    if (error) {
      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
        status: 409,
      });
    }

    const { error: linkError, data: linkData } = await supabase
      .from("network_disciples") //
      .insert({
        network_id,
        disciple_id: disciple.id,
      })
      .select(
        `*,
      network_id(
        *,
        discipler_id (
          id,
          first_name,
          last_name,
          status
        )
      ),
      disciple_id(
        id,
        first_name,
        last_name,
        status
      )`
      )
      .single();

    if (linkError) {
      await supabase.from("disciples").delete().eq("id", disciple.id);

      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
        status: 409,
      });
    }

    return new Response(JSON.stringify(linkData), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
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
