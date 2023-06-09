import express from "../../_shared/express.ts";

export default () => {
  const router = express.Router();

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
