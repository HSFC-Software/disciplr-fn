import express from "./express.ts";

const router = express.Router();

router
  .route("/v2/google") //
  .post((_, res) => {
    res.status(401).send({ bar: "baz" });
  });

export const google = router;
