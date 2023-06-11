import { Request, Response } from "./express.ts";

export const cors = (headers: Object = {}) => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, authorization-key, client_id, X-Authorization-Key",
  ...headers,
});

const corsMiddleware =
  (headers?: Headers) => (req: Request, res: Response, next?: () => void) => {
    res.set({
      ...headers,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, authorization-key, client_id, X-Authorization-Key",
    });

    if (req.method === "OPTIONS") {
      res.send("ok");
    }

    next?.();
  };

export default corsMiddleware;
