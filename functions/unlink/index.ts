// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../utils/supabase-client.ts";

console.log("Hello from Functions!");

serve(async (req) => {
  const disciplePattern = new URLPattern({
    pathname: "/unlink/disciple/inactive",
  });
  const discipleMatchingPath = disciplePattern.exec(req.url);

  if (req.method === "PATCH") {
    if (discipleMatchingPath?.pathname?.input === "/unlink/disciple/inactive") {
      const { id } = await req.json();

      const { error, data } = await supabase
        .from("network_disciples")
        .update({
          status: "Inactive",
        })
        .eq("id", id)
        .select(
          `
          id,
          disciple_id(
            id,
            first_name,
            last_name
          ),
          created_at,
          status
        `
        )
        .single();

      if (error) {
        console.log({ error });
        return new Response(JSON.stringify({}), {
          headers: { "Content-Type": "application/json" },
          status: 409,
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }
  }

  const unlinkDisciplePattern = new URLPattern({
    pathname: "/unlink/disciple/:id",
  });
  const unlineDiscipleMatchingPath = unlinkDisciplePattern.exec(req.url);

  const id = unlineDiscipleMatchingPath
    ? unlineDiscipleMatchingPath.pathname.groups.id
    : null;

  if (req.method === "DELETE") {
    if (id) {
      const { error, data } = await supabase
        .from("network_disciples")
        .delete()
        .eq("id", id);

      if (error) {
        console.log({ error });
        return new Response(JSON.stringify({}), {
          headers: { "Content-Type": "application/json" },
          status: 409,
        });
      }

      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
        status: 200,
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
