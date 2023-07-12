import express from "../../_shared/express.ts";
import { supabase } from "../../_shared/supabase-client.ts";

const router = express.Router();

router
  .route("/v2/vips") //
  .get(async (req, res) => {
    const query = supabase.from("vips") //
      .select(`
        id,
        disciples(
            id,
            first_name,
            last_name
        ),
        created_at,
        status
      `);

    if (req.query?.status) {
      query.eq("status", req.query.status);
    }

    const vips = await query;

    res.send(vips?.data);
  });

export default router;
