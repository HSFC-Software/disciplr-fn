import { supabase } from "./supabase-client.ts";

export default async function shorten(url: string) {
  const domain = "trm.cx";
  const randomString = generateRandomString(5);

  const short = `${domain}/${randomString}`;

  await supabase.from("short_url").insert({
    original: url,
    short,
    reference: randomString,
  });

  return short;
}

function generateRandomString(length: number) {
  const characters =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let randomString = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }

  return randomString;
}
