// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabase } from "../_shared/supabase-client.ts";
import { cors } from "../_shared/cors.ts";
import log from "../_shared/log.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }

  if (req.method === "POST") {
    // create profile
    const { first_name, last_name, email, isVip } = await req.json();

    const { data, error } = await supabase
      .from("disciples")
      .insert({
        first_name,
        last_name,
        email,
      })
      .select("id, first_name, last_name, email")
      .single();

    if (error) {
      console.log(error);
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    if (isVip === true) {
      const { error: vipError } = await supabase.from("vips").insert({
        disciple_id: data.id,
      });

      if (vipError) {
        console.log(vipError);
        log("Error creating VIP", req.url, vipError);

        // revert the disciple creation
        await supabase.from("disciples").delete().eq("id", data.id);
      }
    }

    return new Response(JSON.stringify(data), {
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  // For more details on URLPattern, check https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
  const idPattern = new URLPattern({ pathname: "/profile/:id" });
  const matchingPath = idPattern.exec(req.url);

  const id = matchingPath ? matchingPath.pathname.groups.id : null;

  if (req.method === "PATCH") {
    if (!id) {
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 404,
      });
    }

    // update profile
    const body = await req.json();

    const payload = {};

    const allowedFields = [
      "first_name",
      "last_name",
      "middle_name",
      "email",
      "address",
      "contact_number",
      "birthday",
      "sex",
      "status",
    ];

    allowedFields.forEach((field) => {
      if (body[field]) payload[field] = body[field];
    });

    const { data, error } = await supabase
      .from("disciples")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.log(error);
      log("Error updating profile", req.url, error);
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    return new Response(JSON.stringify(data), {
      headers: cors({ "Content-Type": "application/json" }),
      status: 200,
    });
  }

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

  if (params.q || params.q === "") {
    const results = [];

    try {
      await Promise.all(
        params.q.split(" ").map(async (keyword) => {
          const { data } = await supabase
            .from("disciples")
            .select("id, first_name, last_name")
            .or(`first_name.ilike.%${keyword}%,last_name.ilike.%${keyword}%`);
          if (data) {
            data?.forEach((result) => {
              // remove duplicates in the list
              if (!JSON.stringify(results).includes(result.id)) {
                results.push(result);
              }
            });
          }
        })
      );
    } catch (error) {
      log("Error getting profiles", req.url, error);
    }

    return new Response(JSON.stringify(results), {
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
