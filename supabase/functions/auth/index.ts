// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode, create } from "https://deno.land/x/djwt@v2.8/mod.ts";
import log from "../_shared/log.ts";
import { supabase } from "../_shared/supabase-client.ts";
import { cors } from "../_shared/cors.ts";

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }

  if (req.method === "POST") {
    const token = req.headers.get("X-Authorization-Key");
    const client_id = req.headers.get("client_id");

    const allowedClientIds = ["directors-access", "disciplr-app"];

    if (!allowedClientIds.includes(client_id)) {
      log("Unknown client.", req.url);

      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 404,
      });
    }

    const [header, payload, signature] = decode(token);

    const email = payload?.email;

    if (!email) {
      log("No email found after decoding JWT.", req.url);

      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 404,
      });
    }

    const query = supabase.from("disciples").select("*");
    query.eq("email", email);
    query.single();

    const { data: user, error } = await query;

    if (error) {
      log("No user found after decoding JWT.", req.url);

      return new Response(
        JSON.stringify({
          code: "UNAUTHORIZED",
          message: "No user found.",
        }),
        {
          headers: cors({ "Content-Type": "application/json" }),
          status: 404,
        }
      );
    }

    // destroy all sessions for this client
    await supabase
      .from("sessions")
      .update({
        valid_until: new Date().toISOString(),
        user_id: user.id,
      })
      .eq("client_id", client_id);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);

    // create a new session
    const { data: session } = await supabase
      .from("sessions")
      .insert({
        client_id,
        user_id: user.id,
        valid_until: expiresAt.toISOString(),
      })
      .select("*")
      .single();

    const _payload = {
      user_id: user.id,
      session_id: session.id,
    };

    const jwt = await create({ alg: "HS512", typ: "JWT" }, _payload, key);

    return new Response(
      JSON.stringify({
        token: jwt,
      }),
      {
        headers: cors({ "Content-Type": "application/json" }),
      }
    );
  } else {
    return new Response(JSON.stringify({}), {
      headers: cors({ "Content-Type": "application/json" }),
      status: 404,
    });
  }
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
