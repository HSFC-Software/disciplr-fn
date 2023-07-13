import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

export default function hash(message: string) {
  const secretKey = Deno.env.get("PASSWORD_HASH") ?? "";

  const result = hmac("sha256", secretKey, message, "utf8", "base64");
  return result;
}
