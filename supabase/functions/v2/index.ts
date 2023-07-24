import express from "../_shared/express.ts";
import google from "./_route/google.ts";
import hello from "./_route/hello.ts";
import cors from "../_shared/cors.ts";
import events from "./_route/events/index.ts";
import vips from "./_route/vips.ts";
import consolidators from "./_route/consolidators.ts";
import disciples from "./_route/disciples.ts";
import auth from "./_route/auth.ts";
import authMiddleware from "../_shared/auth.ts";
import short from "./_route/short.ts";
import rewards from "./_route/rewards.ts";
import batch from "./_route/batch.ts";
import consolidations from "./_route/consolidations.ts";
import forgot from "./_route/forgot.ts";

const app = express();

app.use((req, __, next) => {
  console.log(new Date(), `[${req.method}] ${req.baseUrl}`);
  next();
});

app.use(cors());
app.use(authMiddleware);

app.use(google);
app.use(hello);
app.use(events);
app.use(vips);
app.use(consolidators);
app.use(disciples);
app.use(auth);
app.use(short);
app.use(rewards);
app.use(batch);
app.use(consolidations);
app.use(forgot);

await app.listen(4507);
