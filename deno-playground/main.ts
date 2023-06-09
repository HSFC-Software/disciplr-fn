import express from "./express.ts";

const server = Deno.listen({ port: 8080 });

// Connections to the server will be yielded up as an async iterable.
for await (const conn of server) {
  serveHttp(conn);
}

async function serveHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const conn of httpConn) {
    const body = await conn.request.json().catch((err) => console.log(err));
    (globalThis as any).__EXPRESS__ = { ...conn, meta: { body } };

    const app = express();

    // middleware
    app.use((req, res, next) => {
      console.log("called[0]");
      next();
    });

    app.use((req, res, next) => {
      console.log("called[1]");
      next();
    });

    app.use((req, res, next) => {
      console.log("called[2]");
      next();
    });

    app.use((req, res, next) => {
      console.log("called[3]");
      next();
    });

    app.get("/hellowz", (_, res) => {
      res.send({ foo: "sbar" });
    });

    const router = express.Router();
    router
      .route("/hellow") //
      .get((_, res) => {
        res.status(400).send({ bar: "baz" });
      })
      .post((_, res) => {
        res.status(400).send({ post: "baz" });
      })
      .patch((_, res) => {
        res.status(400).send({ patch: "baz" });
      })
      .put((_, res) => {
        res.status(400).send({ put: "baz" });
      })
      .delete((_, res) => {
        res.status(400).send({ delete: "baz" });
      });

    app.use(router);

    app.post("/hellowz", (_, res) => {
      res.status(404).send({ foo: "sbar" });
    });
  }
}
