import axiod from "https://deno.land/x/axiod/mod.ts";
import express from "../../_shared/express.ts";
import log from "../../_shared/log.ts";
import { supabase } from "../../_shared/supabase-client.ts";

const router = express.Router();

router
  .route("/v2/disciples") //
  .get(async (req, res) => {
    const { q } = req.query;

    if (q) {
      const results: any = [];
      try {
        await Promise.all(
          q.split(" ").map(async (keyword) => {
            const { data } = await supabase
              .from("disciples")
              .select("id, first_name, last_name, img_url")
              .or(`first_name.ilike.%${keyword}%,last_name.ilike.%${keyword}%`);
            if (data) {
              data?.forEach((result) => {
                // remove duplicates in the list
                if (!JSON.stringify(results).includes(result.id)) {
                  results.push(result);
                }
              });
            }
          })
        );
      } catch (error) {
        log("Error getting profiles", req.path, error);
      }

      const tmp: { [key: string]: string[] } = {};
      const duplicates: string[] = [];

      results.forEach((item: any) => {
        const name = `${item?.first_name} ${item?.last_name}`;
        if (!tmp[name]) tmp[name] = [item.id];
        else {
          tmp[name].push(item.id);
          if (!duplicates.includes(name)) duplicates.push(name);
        }
      });

      const systemAlertUrl = Deno.env.get("SYSTEM_ALERT_URL") ?? "";
      console.log({ systemAlertUrl });

      for (const name of duplicates) {
        const ids = tmp[name];
        axiod.post(systemAlertUrl, {
          name,
          ids,
        });
      }

      return res.send(results);
    }

    res.send([]);
  });

export default router;
