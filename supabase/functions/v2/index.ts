import express from "../_shared/express.ts";
import google from "./_route/google.ts";
import hello from "./_route/hello.ts";
import cors from "../_shared/cors.ts";
import events from "./_route/events/index.ts";
import vips from "./_route/vips.ts";

const app = express();

app.use((req, __, next) => {
  console.log(new Date(), `[${req.method}] ${req.baseUrl}`);
  next();
});

app.use(cors());

app.use(google);
app.use(hello);
app.use(events);
app.use(vips);

await app.listen(4507);
