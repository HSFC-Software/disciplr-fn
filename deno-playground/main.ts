import Express from "./express.ts";

const server = Deno.listen({ port: 8080 });

// Connections to the server will be yielded up as an async iterable.
for await (const conn of server) {
  serveHttp(conn);
}

async function serveHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const requestEvent of httpConn) {
    const app = new Express(requestEvent);

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

    // router
  }
}
