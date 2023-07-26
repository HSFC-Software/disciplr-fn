import express from "../../_shared/express.ts";
import log from "../../_shared/log.ts";
import sendSMS from "../../_shared/sms.ts";
import { supabase } from "../../_shared/supabase-client.ts";

const router = express.Router();

router
  .route("/v2/consolidators") //
  .get("/history/:id", async (req, res) => {
    const { id } = req.params;

    const { data: consolidator } = await supabase
      .from("consolidators_disciples")
      .select("*, disciple_id(*)")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("consolidations")
      .select(
        `
        id,
        lesson_code (
          code,
          name,
          title
        ),
        created_at,
        status
      `
      )
      .eq("consolidators_disciples_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      log(
        "Get consolidation by consolidators_disciples_id failed",
        req.baseUrl,
        {
          error,
        }
      );
      return res.status(409).send({});
    }

    const response = {
      recent: data?.[0] || {},
      disciple: consolidator?.disciple_id,
      history: data,
    };

    res.send(response);
  })
  .patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { consolidator_id } = req.body;

    console.log({ id, consolidator_id });

    const { error, data } = await supabase
      .from("consolidators_disciples")
      .update({
        consolidator_id,
      })
      .eq("id", id)
      .select(
        `
        *, 
        consolidator_id(contact_number)
      `
      )
      .single();

    if (error) {
      log("Error updating consolidator", req.baseUrl, error);
      return res.status(409).send({});
    }

    if (!data) {
      log(`Unable to find consolidator: ${id}`, req.baseUrl, {});
      return res.status(404).send({});
    }

    if (data.contact_number) {
      sendSMS(
        data.contact_number,
        "A New disciple has been added to your consolidation list. Check it now! https://app.fishgen.org/conso/list",
        "Disciplr"
      );
    }

    return res.send(data);
  })
  .get("/:consolidator_id", async (req, res) => {
    const { consolidator_id } = req.params;

    const query = supabase
      .from("consolidators_disciples")
      .select(
        `
        *,
        disciple_id(*),
        consolidator_id(*)
      `
      )
      .eq("consolidator_id", consolidator_id);

    const consolidators = await query;

    if (consolidators.error) {
      log("Error getting consolidator", req.path, consolidators.error);
      return res.status(409).send({});
    }

    const conso: any = consolidators?.data;

    const response = await Promise.all(
      conso?.map(async (item: any) => {
        const { data } = await supabase
          .from("consolidations")
          .select(
            `
          lesson_code (
            code,
            name
          )
        `
          )
          .eq("consolidators_disciples_id", item?.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          ...item,
          lesson_code: data?.lesson_code,
        };
      })
    );

    res.send(response);
  })
  .get(async (_, res) => {
    const query = supabase
      .from("consolidators_disciples") //
      .select(
        `
        *,
        disciple_id(*),
        consolidator_id(*)
      `
      )
      .limit(10)
      .order("created_at", { ascending: false });

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

    if (error) {
      log("Error adding consolidator", req.path, error);
      return res.status(409).send({});
    }

    const { data: consolidator } = await supabase
      .from("disciples")
      .select("contact_number")
      .eq("id", consolidator_id)
      .single();

    if (consolidator?.contact_number) {
      sendSMS(
        consolidator?.contact_number,
        "A New disciple has been added to your consolidation list. Check it now! https://app.fishgen.org/conso/list",
        "Disciplr"
      );
    }

    // remove vip if needed
    const { error: vipError } = await supabase
      .from("vips")
      .update({
        status: "ASSIGNED",
      })
      .eq("disciple_id", disciple_id);

    if (vipError) {
      log("Error removing vip from list", req.baseUrl, vipError);
    }

    res.send(data);
  });

export default router;
