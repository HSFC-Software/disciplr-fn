import express from "../../_shared/express.ts";
import axiod from "https://deno.land/x/axiod/mod.ts";

const key = Deno.env.get("GOOGLE_PLACE_KEY");

const router = express.Router();

router
  .route("/v2/google/place") //
  .get("/search", async (req, res) => {
    const { query } = req;
    const response = await axiod.get(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${
        query.input ?? ""
      }&key=${key}&components=country:PH`
    );

    res.send(response.data);
  })
  .get("/geocode", async (req, res) => {
    const { query } = req;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${query.lat},${query.lng}&key=${key}`;
    const response = await axiod.get(url);
    res.send(response.data?.results ?? []);
  })
  .get("/:id", async (req, res) => {
    const placeId = req.params.id;

    const response = await axiod.get(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${key}`
    );

    res.send(response.data);
  });

export default router;
