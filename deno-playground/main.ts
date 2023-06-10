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
    app.post("/hello", (_, res) => {
      res.status(404).send({ foo: "bar" });
    });
  }
}
