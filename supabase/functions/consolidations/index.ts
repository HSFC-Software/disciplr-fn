// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase-client.ts";
import { cors } from "../_shared/cors.ts";
import log from "../_shared/log.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }

  if (req.method === "POST") {
    const { disciple_id, consolidator_id } = await req.json();

    // get recent consolidation
    const { data, error } = await supabase
      .from("consolidations")
      .select(`lesson_code`)
      .eq("disciple_id", disciple_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      log("[POST]: Find recent consolidation failed", req.url, { error });
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    const lesson_code = data?.lesson_code ?? "L0";
    let nextLessonCode = `L${Number(lesson_code.split("L")[1]) + 1}`;

    if (nextLessonCode === "L11") nextLessonCode = nextLessonCode = "L1"; // fallback

    // create the next consolidation lesson
    const { data: newLesson, error: newError } = await supabase
      .from("consolidations")
      .insert({
        disciple_id,
        consolidator_id,
        lesson_code: nextLessonCode,
      })
      .select(
        `
        id,
        lesson_code (
          code,
          name
        )
      `
      )
      .single();

    if (newError) {
      log("[POST]: Create new consolidation failed", req.url, { newError });
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    return new Response(JSON.stringify(newLesson), {
      headers: cors({ "Content-Type": "application/json" }),
      status: 201,
    });
  }

  const url = new URL(req.url);
  const params = Object.fromEntries(new URLSearchParams(url.search));

  if (req.method === "PATCH") {
    const id = params.id;
    const { status } = await req.json();

    const { data, error } = await supabase
      .from("consolidations")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      log("[PATCH]: Update consolidation failed", req.url, { error });
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

  if (params.consolidator) {
    let { data, error } = await supabase
      .from("consolidations")
      .select(
        `
        id,
        disciple_id (
          id,
          first_name,
          last_name
        ),
        lesson_code (
          code,
          name
        ),
        created_at,
        status
      `
      )
      .eq("consolidator_id", params.consolidator);

    if (error) {
      log("Get consolidation by consolidator failed", req.url, { error });
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    if (params.client === "disciplr") {
      // remove duplicate consolidations base from the same disciple
      data = data.reduce((acc, consolidation) => {
        if (
          !acc.some(
            (item) => item.disciple_id.id === consolidation.disciple_id.id
          )
        ) {
          const recentConsolidation = data
            .filter(
              (item) => item.disciple_id.id === consolidation.disciple_id.id
            )
            .sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            )?.[0];

          acc.push({
            ...consolidation,
            lesson_code:
              recentConsolidation.lesson_code ?? consolidation.lesson_code,
          });
        }
        return acc;
      }, []);
    }

    return new Response(JSON.stringify(data), {
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  if (params.disciple) {
    let { data: history, error } = await supabase
      .from("consolidations")
      .select(
        `
        id,
        lesson_code (
          code,
          name
        ),
        created_at,
        status
      `
      )
      .eq("disciple_id", params.disciple)
      .order("created_at", { ascending: false });

    const { data: disciple } = await supabase
      .from("disciples")
      .select(
        `
        id,
        first_name,
        last_name,
        email
      `
      )
      .eq("id", params.disciple)
      .single();

    if (error) {
      log("Get consolidation by disciple failed", req.url, { error });
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

    const response = {
      recent: history?.[0] || {},
      disciple,
      history,
    };

    return new Response(JSON.stringify(response), {
      headers: cors({ "Content-Type": "application/json" }),
    });
  }

  if (params.id) {
    let { data, error } = await supabase
      .from("consolidations")
      .select(
        `
        id,
        disciple_id (
          id,
          first_name,
          last_name
        ),
        consolidator_id (
          id,
          first_name,
          last_name
        ),
        lesson_code (
          code,
          name,
          title
        ),
        created_at,
        status
      `
      )
      .eq("id", params.id)
      .single();

    if (error) {
      log("Get consolidation by id failed", req.url, { error });
      return new Response(JSON.stringify({}), {
        headers: cors({ "Content-Type": "application/json" }),
        status: 409,
      });
    }

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
