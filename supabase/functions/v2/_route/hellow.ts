import express from "../../_shared/express.ts";

export default () => {
  const router = express.Router();

  router
    .route("/v2/hellow") //
    .get((_, res) => {
      res.send({ hellow: "world" });
    });

  return router;
};
