import express from "./express.ts";

const app = express();

const router = express.Router();
router.route("/google");

// router.post("/hello", (_, res) => {
//   console.log("im not claled");
//   res.status(404).send({ foo: "bar" });
// });

// app.use(router);

app.use((_, __, next) => {
  console.log("me second");
  next();
});

app
  .route("/hellow") //
  .post((_, res) => {
    console.log("called");
    res.status(200).send({ foo: "bar" });
  });

await app.listen(8080);
