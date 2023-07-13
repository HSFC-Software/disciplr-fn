import express from "../../_shared/express.ts";
import hash from "../../_shared/hash.ts";
import { jwt } from "../../_shared/jwt.ts";
import log from "../../_shared/log.ts";
import { supabase } from "../../_shared/supabase-client.ts";
import moment from "https://deno.land/x/momentjs@2.29.1-deno/mod.ts";

const router = express.Router();

router
  .route("/v2/auth") //
  .post(async (req, res) => {
    const { data } = await supabase
      .from("auth")
      .select("id, username, disciple_id")
      .eq("username", req.body.username)
      .eq("password", hash(req.body.password))
      .maybeSingle();

    if (data)
      res.send({
        token: jwt.encode(data),
      });
    else res.status(401).send({});
  })
  .patch(async (req, res) => {
    const { invitation_id, username, password } = req.body;

    const { data: invitation } = await supabase
      .from("auth_invitation")
      .select("auth_id")
      .eq("id", invitation_id)
      .single();

    const { error } = await supabase
      .from("auth")
      .update({ username, password: hash(password) })
      .eq("id", invitation?.auth_id);

    if (error) {
      return res.status(409).send({});
    }

    res.send({});
  })
  .post("/password", async (req, res) => {
    const id = req.locals.auth?.id;
    const { password } = req.body;

    if (!id) return res.status(401).send({});

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
    const redirect_uri = "https://app.fishgen.org/networks";

    const { disciple_id } = req.body;

    // checks if there is existing auth
    const { data: auth, error: authError } = await supabase
      .from("auth")
      .select("*")
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

      const { data } = await supabase
        .from("auth_invitation")
        .update({
          link: `https://sso.fishgen.org/invitation/${invite?.id}?redirect_uri=${redirect_uri}`,
        })
        .eq("id", invite?.id)
        .select("*")
        .single();

      return res.send(data);
    } else {
      // for new accounts
      // creating new auth if there is no existing auth
      const { data: newAuth } = await supabase
        .from("auth")
        .insert({ disciple_id: disciple_id })
        .select("*")
        .single();

      console.log(newAuth);

      if (newAuth) {
        // create new auth invitation
        const expiration = moment().add(7, "days").utc().toISOString();

        const { data: invite } = await supabase
          .from("auth_invitation")
          .insert({ auth_id: (newAuth as any)?.id, expiration })
          .select("id")
          .single();

        const { data } = await supabase
          .from("auth_invitation")
          .update({
            link: `https://sso.fishgen.org/invitation/${invite?.id}?redirect_uri=${redirect_uri}`,
          })
          .eq("id", invite?.id)
          .select("*")
          .single();

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
