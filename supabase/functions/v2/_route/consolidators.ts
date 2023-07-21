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
      .upsert({
        disciple_id,
        consolidator_id,
      })
      .select()
      .single();

    if (error) return res.status(409).send({});
    res.send(data);
  });

export default router;
