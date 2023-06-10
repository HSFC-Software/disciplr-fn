import express from "../../_shared/express.ts";

export default () => {
  const router = express.Router();

  router
    .route("/v2/hello") //
    .get((_, res) => {
      res.send({ hello: "world" });
    });

  return router;
};
