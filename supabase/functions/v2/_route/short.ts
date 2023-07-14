import express from "../../_shared/express.ts";
import { supabase } from "../../_shared/supabase-client.ts";

const router = express.Router();

router
  .route("/v2/short") //
  .get("/:id", async (_, res) => {
    const { data } = await supabase
      .from("short_url")
      .select("*") //
      .eq("reference", _.params.id)
      .single();

    if (!data) return res.status(404).send({});
    res.send(data);
  });

export default router;
