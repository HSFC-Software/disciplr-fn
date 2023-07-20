import express from "../../_shared/express.ts";
import { supabase } from "../../_shared/supabase-client.ts";

const router = express.Router();

router
  .route("/v2/batch") //
  .patch("/inactive-member", async (req, res) => {
    const { ids } = req.body;

    const { error, data } = await supabase
      .from("network_disciples")
      .upsert(
        (ids || [])?.map((id: string) => ({
          id,
          status: "Inactive",
        }))
      )
      .select("network_id")
      .single();

    if (error) {
      return res.status(409).send({});
    }

    const response: any = { ids };

    if (data?.network_id) {
      response.network_id = data.network_id;
    }

    res.send(response);
  });

export default router;
