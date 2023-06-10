import express from "../../_shared/express.ts";
import axiod from "https://deno.land/x/axiod/mod.ts";

export default () => {
  const router = express.Router();

  router.get("/v2/google/place/search", async (req, res) => {
    const { query } = req;
    const response = await axiod.get(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${
        query.input ?? ""
      }&key=${Deno.env.get("GOOGLE_PLACE_KEY")}`
    );

    res.send(response.data);
  });

  router.get("/v2/google/place/:id", async (req, res) => {
    const placeId = req.params.id;

    const response = await axiod.get(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${Deno.env.get(
        "GOOGLE_PLACE_KEY"
      )}`
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
