import express from "../../_shared/express.ts";
import { supabase } from "../../_shared/supabase-client.ts";

const router = express.Router();

router
  .route("/v2/consolidators") //
  .get(async (_, res) => {
    const query = supabase.from("consolidators") //
      .select(`
        *,
        disciples!inner(*)'
      `);

    const consolidators = await query;
    res.send(consolidators?.data);
  });

export default router;
