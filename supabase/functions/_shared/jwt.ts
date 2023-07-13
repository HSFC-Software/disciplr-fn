import { encode, decode } from "https://deno.land/std/encoding/base64url.ts";
import { HmacSha256 } from "https://deno.land/std@0.119.0/hash/sha256.ts";

export function createJWT(header: any, payload: any, secret: string): string {
  const bHdr = encode(new TextEncoder().encode(JSON.stringify(header)));
  const bPyld = encode(new TextEncoder().encode(JSON.stringify(payload)));
  const oTkn = `${bHdr}.${bPyld}`;
  return oTkn + "." + new HmacSha256(secret).update(oTkn).toString();
}

const header = { alg: "HS256", typ: "JWT" };

export const jwt = {
  encode: (payload: any) => {
    const exp = Date.now() + 1000 * 60 * 60 * 24 * 1; // 1 days

    const data = { exp, ...payload };
    const secretKey = Deno.env.get("PASSWORD_HASH") ?? "";

    return createJWT(header, data, secretKey);
  },
  decode: (token: string) => {
    const secretKey = Deno.env.get("PASSWORD_HASH") ?? "";

    const parts = token.split(".");

    if (parts.length !== 3) return;

    const calcSign = new HmacSha256(secretKey)
      .update(`${parts[0]}.${parts[1]}`)
      .toString();

    if (calcSign !== parts[2]) return;

    const payload = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    if (payload.exp && Date.now() > payload.exp) return;

    return payload;
  },
};
