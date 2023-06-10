import express from "../../_shared/express.ts";
import axiod from "https://deno.land/x/axiod/mod.ts";

export default () => {
  const router = express.Router();

  router.get("/v2/google/autocomplete", async (req, res) => {
    const key = Deno.env.get("GOOGLE_PLACE_KEY");

    const { query } = req;
    const response = await axiod.get(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${
        query.input ?? ""
      }&key=${key}`
    );

    res.send(response.data);
  });

  router
    .route("/v2/google") //
    .get((_, res) => {
      res.send({});
    })
    .post((_, res) => {
      res.status(404).send({});
    });

  return router;
};
