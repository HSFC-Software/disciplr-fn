import express from "./express.ts";

const app = express();

// middleware example
app.use((req, __, next) => {
  console.log(new Date(), `[${req.method}] ${req.baseUrl}`);
  next();
});

app.get("/single-endpoint", (_, res) => res.send({}));
app.post("/single-endpoint", (_, res) => res.send({}));

// instance router

const router = express.Router();

router
  .route("/router") //
  .get("/instance", (_, res) => res.send({}));

app.use(router);

const anotherRouter = express.Router();

anotherRouter
  .route("/another-router") //
  .post("/instance", (_, res) => res.send({}));

app.use(anotherRouter);

// app router
app
  .route("/static-router") //
  .get((_, res) => res.send({}));

app
  .route("/another-static-router") //
  .post((_, res) => res.send({}));

await app.listen(8080);
