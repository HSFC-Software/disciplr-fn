import axiod from "https://deno.land/x/axiod/mod.ts";
import { supabase } from "./supabase-client.ts";

export default async function log(
  message: string,
  pathname: string,
  payload: unknown
) {
  console.log({
    message,
    pathname,
    payload,
  });
  try {
    axiod.post(
      "https://log-api.newrelic.com/log/v1",
      {
        message,
        pathname,
        payload,
        logtype: "info",
        service: "edge-function",
        hostname: "bsnrwmmolcbhgncwogox.functions.supabase.co",
      },
      {
        headers: {
          "Api-Key": Deno.env.get("LOG_KEY"),
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.log({ error });
  }

  await supabase.from("logs").insert([
    {
      message,
      pathname,
      attributes: JSON.stringify(payload),
    },
  ]);
}
