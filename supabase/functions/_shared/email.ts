import { sendSimpleMail } from "https://deno.land/x/sendgrid/mod.ts";
import log from "./log.ts";

type SendEmail = {
  to: string;
  plain: string;
  html: string;
  subject: string;
};

export default async function sendEmail(params: SendEmail) {
  const response = await sendSimpleMail(
    {
      subject: params.subject,
      to: [{ email: params.to }],
      from: { email: "app.disciplr+no-reply@gmail.com" },
      content: [
        { type: "text/plain", value: params.plain },
        { type: "text/html", value: params.html ?? params.plain },
      ],
    },
    {
      apiKey: Deno.env.get("EMAIL_KEY"),
    }
  );

  log(`Email sent to ${params.to} for ${params.subject}`, "", {
    text: params.plain,
    html: params.html,
  });

  return response.success;
}
