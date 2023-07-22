import express from "../../_shared/express.ts";
import log from "../../_shared/log.ts";
import { supabase } from "../../_shared/supabase-client.ts";

const router = express.Router();

router
  .route("/v2/consolidations") //
  .patch("/:id", async (req, res) => {
    const { status } = req.body;
    const id = req.params.id;

    const { data, error } = await supabase
      .from("consolidations")
      .update({ status })
      .eq("id", id)
      .select("*, consolidators_disciples_id(id, consolidator_id)")
      .single();

    if (error) {
      log("Update consolidation status failed", req.baseUrl, { error });
      return res.status(409).send({});
    }

    await supabase.from("shekels").insert({
      consolidation_id: id,
      disciple_id: data.consolidators_disciples_id.consolidator_id,
      amount: 7,
    });

    return res.send(data);
  })
  .post(async (req, res) => {
    const { consolidators_disciples_id } = req.body;

    // get recent consolidation
    const { data } = await supabase
      .from("consolidations")
      .select(`lesson_code`)
      .eq("consolidators_disciples_id", consolidators_disciples_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const lesson_code = data?.lesson_code ?? "L0";
    let nextLessonCode = `L${Number(lesson_code.split("L")[1]) + 1}`;

    if (nextLessonCode === "L11") nextLessonCode = nextLessonCode = "L1"; // fallback

    // create the next consolidation lesson
    const { data: added, error } = await supabase
      .from("consolidations")
      .insert({
        lesson_code: nextLessonCode,
        consolidators_disciples_id,
      })
      .select(
        `
       id,
       lesson_code (
         code,
         name
       ),
       consolidators_disciples_id
     `
      )
      .single();

    if (error) {
      log("[POST]: Create new consolidation failed", req.baseUrl, { error });
      return res.status(409).send({});
    }

    res.send(added);
  })
  .get("/:id", async (req, res) => {
    const id = req.params.id;

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
        status,
        consolidators_disciples_id(
          *,
          disciple_id(*),
          consolidator_id(*)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      log("Get consolidation by id failed", req.baseUrl, {
        error,
      });
      return res.status(409).send({});
    }

    const response: any = {
      ...(data ?? {}),
      disciple_id: (data?.consolidators_disciples_id as any)?.disciple_id,
      consolidator_id: (data?.consolidators_disciples_id as any)
        ?.consolidator_id,
    };

    delete response?.consolidators_disciples_id;

    return res.send(response);
  });

export default router;
