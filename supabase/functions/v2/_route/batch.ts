import express from "../../_shared/express.ts";
import log from "../../_shared/log.ts";
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
      .select("network_id");

    if (error) {
      log("Batch: Error unlinking disciple", req.baseUrl, error);
      return res.status(409).send({});
    }

    const response: any = { ids };

    if (data?.[0]?.network_id) {
      response.network_id = data[0].network_id;
    }

    res.send(response);
  });

export default router;
