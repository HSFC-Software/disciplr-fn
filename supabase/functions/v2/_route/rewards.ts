import express from "../../_shared/express.ts";
import { supabase } from "../../_shared/supabase-client.ts";

const router = express.Router();

router
  .route("/v2/rewards") //
  .get(async (req, res) => {
    console.log("called");
    const disciple_id = req.locals.auth?.disciple_id;
    console.log(req.locals.auth);

    const { data } = await supabase
      .from("shekels")
      .select("amount")
      .eq("disciple_id", disciple_id);

    if (!data)
      return res.send({
        shekels: 0,
      });

    let sum = 0;

    data.forEach((item) => {
      sum += item.amount;
    });

    res.send({
      shekels: sum,
    });
  });

export default router;
