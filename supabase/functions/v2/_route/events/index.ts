import express from "../../../_shared/express.ts";
import log from "../../../_shared/log.ts";
import { supabase } from "../../../_shared/supabase-client.ts";
import locations from "./locations.ts";

const router = express.Router();

router //
  .route("/v2/events")
  .patch("/locations", locations)
  .post("/moments", async (req, res) => {
    const body = req.body;

    const { data, error } = await supabase
      .from("files")
      .insert({ event_id: body.event_id, url: body.url })
      .select("*")
      .single();

    if (error) {
      log("Error inserting file", "/v2/events/moments", error);
      res.status(409).send({});
    } else {
      res.send(data);
    }
  });

export default router;
