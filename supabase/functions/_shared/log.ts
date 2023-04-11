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
  const { data, error } = await supabase.from("logs").insert([
    {
      message,
      pathname,
      attributes: JSON.stringify(payload),
    },
  ]);
}
