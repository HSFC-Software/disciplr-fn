import { Request, Response } from "../../../_shared/express.ts";
import log from "../../../_shared/log.ts";
import { supabase } from "../../../_shared/supabase-client.ts";

export default async (req: Request, res: Response) => {
  const { body } = req;

  const { data, error } = await supabase
    .from("events")
    .select("location_id, id")
    .eq("id", body.event_id)
    .single();

  if (error) {
    log("Error fetching location_id", "/v2/events/locations", error);
    res.status(409).send({});
  } else {
    const payload: any = {};
    if (body.lat) payload.lat = body.lat;
    if (body.lng) payload.lng = body.lng;
    if (body.address) payload.address = body.address;
    if (data?.location_id) {
      const location_id = data.location_id;

      const { error: locationError } = await supabase
        .from("locations")
        .update(payload)
        .eq("id", location_id);

      if (locationError) {
        log("Error upserting location", "/v2/events/locations", locationError); // prettier-ignore
        res.status(409).send({});
      }

      res.send(data);
    } else {
      const { data: location, error: locationError } = await supabase
        .from("locations")
        .upsert(payload)
        .select("*")
        .single();

      if (locationError) {
        log("Error upserting location", "/v2/events/locations", locationError); // prettier-ignore
        res.status(409).send({});
      } else {
        const location_id = location.id;

        const { data: event, error: eventError } = await supabase
          .from("events")
          .update({ location_id })
          .eq("id", body.event_id)
          .select("*")
          .single();

        if (eventError) {
          log("Error updating event", "/v2/events/locations", eventError);
          await supabase.from("locations").delete().eq("id", location_id);
          res.status(409).send({});
        }

        res.send(event);
      }
    }
  }
};
