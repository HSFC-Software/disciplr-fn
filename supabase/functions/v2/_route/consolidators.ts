import axiod from "https://deno.land/x/axiod/mod.ts";
import express from "../../_shared/express.ts";
import { supabase } from "../../_shared/supabase-client.ts";

const router = express.Router();

router
  .route("/v2/consolidators") //
  .get(async (_, res) => {
    const query = supabase.from("consolidators_disciples") //
      .select(`
        *,
        disciple_id(*),
        consolidator_id(*)
      `);

    const consolidators = await query;
    res.send(consolidators?.data);
  })
  .post(async (req, res) => {
    const { disciple_id, consolidator_id } = req.body;

    const { error, data } = await supabase
      .from("consolidators_disciples")
      .insert({
        disciple_id,
        consolidator_id,
      })
      .select()
      .single();

    try {
      await axiod.post("https://log-api.newrelic.com/log/v1", data, {
        headers: {
          "License-Key": "0af5a99bcd680a5ef93323df0f39f7d16047NRAL",
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.log({ error });
    }

    if (error) return res.status(409).send({});
    res.send(data);
  });

export default router;
