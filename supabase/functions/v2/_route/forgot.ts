import express from "../../_shared/express.ts";
import log from "../../_shared/log.ts";
import { supabase } from "../../_shared/supabase-client.ts";
import moment from "https://deno.land/x/momentjs@2.29.1-deno/mod.ts";
import sendEmail from "../../_shared/email.ts";
import shorten from "../../_shared/shorten.ts";
import hash from "../../_shared/hash.ts";

const router = express.Router();

router
  .route("/v2/forgot") //
  .get("/:id", async (req, res) => {
    const { id } = req.params;

    const { data } = await supabase
      .from("forgot_invitation")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!data) return res.status(404).send({});

    if (data.expiration < moment().utc().toISOString())
      return res.status(410).send({});

    if (!data.link) return res.status(409).send({});
    res.send(data);
  })
  .patch(async (req, res) => {
    const { password, invitation_id } = req.body;

    const { data } = await supabase
      .from("forgot_invitation")
      .select("auth_id")
      .eq("id", invitation_id)
      .single();

    if (!data) {
      log("Unable to find invitation to forgot password", req.baseUrl, {
        invitation_id,
      });
      return res.status(404).send({});
    }

    const id = data?.auth_id;

    const { error } = await supabase //
      .from("auth")
      .update({ password: hash(password) })
      .eq("id", id);

    if (error) {
      log("Error updating password", req.baseUrl, { password, invitation_id });
      return res.status(409).send({});
    }

    // invalidate invitation
    await supabase
      .from("forgot_invitation")
      .update({
        expiration: moment().utc().toISOString(),
      })
      .eq("id", invitation_id);

    res.send({});
  })
  .post(async (req, res) => {
    const { email } = req.body;

    const { data: auth } = await supabase
      .from("auth")
      .select("id")
      .eq("username", email)
      .single();

    if (!auth) {
      log(`Unable to find user with email: ${email}`, req.baseUrl, {});
      return res.status(404).send({});
    }

    // invalidate all existing invitations
    const now = moment().utc().toISOString();
    await supabase
      .from("forgot_invitation")
      .update({ expiration: now })
      .eq("auth_id", auth.id);

    // create new auth invitation
    const expiration = moment().add(7, "days").utc().toISOString();

    // create new invitation
    const { error, data } = await supabase
      .from("forgot_invitation")
      .insert({
        auth_id: auth.id,
        expiration,
      })
      .select("id")
      .single();

    const email_redirect = `https://sso.fishgen.org/forgot/${data?.id}`;

    if (error) {
      log(`Error creating invitation for ${email}`, req.baseUrl, {
        error,
      });
      return res.status(409).send({});
    }

    // update invitation with redirect link
    await supabase
      .from("forgot_invitation")
      .update({ link: email_redirect })
      .eq("id", data?.id);

    // send email
    const plain = `
Reset your Disciplr Password

Someone requested that we reset the password for your Disciplr account.
If this was you, please follow this link:
${await shorten(email_redirect)}

If this wasn't you, please report this e-mail to us at app.disiplr+support@gmail.com

Yours,
Disciplr Team
`;

    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <style>
      .action {
        background-color: #6e7ac5;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        color: #fff;
        font-weight: bold;
        margin-bottom: 10px;
        display: inline-block;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <h3>Reset your Disciplr Password</h3>

    <p>
      Someone requested that we reset the password for your Disciplr account.
    </p>
    <div>If this was you, please follow this link:</div>

    <a href="${await shorten(email_redirect)}" class="action">Reset Password</a>

    <p>
      If this wasn't you, please report this e-mail to us at
      <a href="mailto:app.disiplr+support@gmail.com"
        >app.disiplr+support@gmail.com</a
      >
    </p>

    <div>Yours,</div>
    <div>Disciplr Team</div>
  </body>
</html>
`;

    await sendEmail({
      to: email,
      plain,
      subject: "Disciplr Password Reset",
      html,
    });

    res.send({});
  });

export default router;
