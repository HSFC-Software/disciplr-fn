import express from "../../_shared/express.ts";
import hash from "../../_shared/hash.ts";
import { jwt } from "../../_shared/jwt.ts";
import log from "../../_shared/log.ts";
import shorten from "../../_shared/shorten.ts";
import sendSMS from "../../_shared/sms.ts";
import { supabase } from "../../_shared/supabase-client.ts";
import moment from "https://deno.land/x/momentjs@2.29.1-deno/mod.ts";

const router = express.Router();

router
  .route("/v2/auth") //
  .post(async (req, res) => {
    const { data, error } = await supabase
      .from("auth")
      .select(
        `
        id, 
        username,
        disciples(
          id,
          email, 
          img_url,
          first_name,
          last_name,
          middle_name
        )
      `
      )
      .eq("username", req.body.username)
      .eq("password", hash(req.body.password))
      .maybeSingle();

    const user: any = (data as any)?.disciples;

    const rawFullName = `${user?.first_name} ${user?.middle_name} ${user?.last_name}`;
    const full_name = rawFullName.replace(/\s+/g, " ").trim();

    const rawName = `${user?.first_name} ${user?.last_name}`;
    const name = rawName.replace(/\s+/g, " ").trim();

    const payload = {
      avatar_url: user?.img_url,
      picture: user?.img_url,
      email: user?.email,
      full_name,
      name,
      disciple_id: user?.id,
    };

    if (data)
      res.send({
        token: jwt.encode({
          ...payload,
          id: data.id, // deprecate
          auth_id: data.id,
        }),
      });
    else res.status(401).send({});
  })
  .patch(async (req, res) => {
    const { invitation_id, username, password } = req.body;

    const { data: invitation } = await supabase
      .from("auth_invitation")
      .select("auth_id, created_at")
      .eq("id", invitation_id)
      .single();

    const { error, data: auth } = await supabase
      .from("auth")
      .update({ username, password: hash(password) })
      .eq("id", invitation?.auth_id)
      .select("disciple_id")
      .single();

    // update disciples table email
    if (auth) {
      await supabase
        .from("disciples")
        .update({ email: username })
        .eq("id", auth.disciple_id)
        .select("id")
        .single();
    }

    if (error) {
      console.log({ error, invitation_id, username, password });
      return res.status(409).send({});
    }

    // invalidate invitation
    await supabase
      .from("auth_invitation")
      .update({
        expiration: moment(invitation?.created_at).utc().toISOString(),
      })
      .eq("id", invitation_id);

    res.send({});
  })
  .post("/password", async (req, res) => {
    const id = req.locals.auth?.id;
    const { password, old } = req.body;

    if (!id) return res.status(401).send({});

    // handles with old password checking
    if (old) {
      const { data } = await supabase
        .from("auth")
        .select("password")
        .eq("id", id)
        .single();

      if (!data) return res.status(404).send({});

      if (data.password !== hash(old)) return res.status(428).send({});
    }

    // validates the id if it exists
    const { error } = await supabase //
      .from("auth")
      .update({ password: hash(password) })
      .eq("id", id);

    if (error) {
      return res.status(409).send({});
    }

    res.send({});
  }) //
  .get("/invite/status/:disciple_id", async (req, res) => {
    // auth from disciple_id
    const { disciple_id } = req.params;

    const { data: auth } = await supabase //
      .from("auth")
      .select("id")
      .eq("disciple_id", disciple_id)
      .single();

    if (!auth) return res.status(404).send({});

    const { data: invitation, error } = await supabase
      .from("auth_invitation")
      .select("*")
      .eq("auth_id", auth.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) return res.status(409).send({});
    if (!invitation) return res.status(404).send({});

    const response = { ...invitation, is_expired: false };

    const now = moment();
    const expiration = moment(invitation.expiration);

    if (now >= expiration) {
      response.is_expired = true;
    }

    res.send(response);
  })
  .get("/invite/:id", async (req, res) => {
    const { id } = req.params;

    const { data } = await supabase
      .from("auth_invitation")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!data) return res.status(404).send({});

    if (data.expiration < moment().utc().toISOString())
      return res.status(410).send({});

    if (!data.link) return res.status(409).send({});
    res.send(data);
  })
  .post("/invite", async (req, res) => {
    // todo: store this somewhere else
    // disciplr client id
    // const client_id = "0674ad00-599f-439b-8736-d36da21778cc";
    const redirect_uri = "https://app.fishgen.org/auth";

    const { disciple_id } = req.body;

    // checks if there is existing auth
    const { data: auth, error: authError } = await supabase
      .from("auth")
      .select("*, disciples(contact_number)")
      .eq("disciple_id", disciple_id)
      .maybeSingle();

    if (authError) {
      log("Unable to retreive auth from database", req.path, authError);
      return res.status(409).send({});
    }

    if (auth) {
      // create new auth invitation
      const expiration = moment().add(7, "days").utc().toISOString();

      const { data: invite } = await supabase
        .from("auth_invitation")
        .insert({ auth_id: (auth as any)?.id, expiration })
        .select("id")
        .single();

      const redirect_url = `https://sso.fishgen.org/invitation/${invite?.id}?redirect_uri=${redirect_uri}`;
      const link = await shorten(redirect_url);

      const { data } = await supabase
        .from("auth_invitation")
        .update({
          link,
        })
        .eq("id", invite?.id)
        .select("*")
        .single();

      if (auth?.disciples?.contact_number) {
        await sendSMS(
          auth?.disciples?.contact_number,
          `You have been invited to join Disciplr. Click this link to continue: ${redirect_url}`
        );
      }

      const response = { ...(data ?? {}), disciple_id };

      return res.send(response);
    } else {
      // for new accounts
      // creating new auth if there is no existing auth
      const { data: newAuth } = await supabase
        .from("auth")
        .insert({ disciple_id: disciple_id })
        .select("*, disciples(contact_number)")
        .single();

      if (newAuth) {
        // create new auth invitation
        const expiration = moment().add(7, "days").utc().toISOString();

        const { data: invite } = await supabase
          .from("auth_invitation")
          .insert({ auth_id: (newAuth as any)?.id, expiration })
          .select("id")
          .single();

        const redirect_url = `https://sso.fishgen.org/invitation/${invite?.id}?redirect_uri=${redirect_uri}`;
        const link = await shorten(redirect_url);

        const { data } = await supabase
          .from("auth_invitation")
          .update({
            link,
          })
          .eq("id", invite?.id)
          .select("*")
          .single();

        if (newAuth?.disciples?.contact_number) {
          const send = await sendSMS(
            newAuth?.disciples?.contact_number,
            `You have been invited to join Disciplr. Click this link to continue: ${redirect_url}`
          );

          console.log({ send });
        }

        return res.send(data);
      } else {
        log("No auth data received after inserting auth entry", req.path, {});
        return res.status(409).send({});
      }
    }
  })
  .get("/:id", (_, res) => {
    res.send({ hellos: "world" });
  });

export default router;
