import axiod from "https://deno.land/x/axiod/mod.ts";

export default async function sendSMS(
  number: string,
  message: string,
  sender = "Disciplr"
) {
  return await axiod.post("https://semaphore.co/api/v4/messages", {
    apikey: Deno.env.get("SEMAPHORE_API_KEY"),
    number,
    message,
    sendername: sender,
  });
}
