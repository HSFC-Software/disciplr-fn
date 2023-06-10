import express from "../_shared/express.ts";
import google from "./_route/google.ts";
import hello from "./_route/hello.ts";

const server = Deno.listen({ port: 4507 });

for await (const conn of server) {
  serveHttp(conn);
}

async function serveHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const conn of httpConn) {
    const body = await conn.request.json().catch(() => {});
    (globalThis as any).__EXPRESS__ = { ...conn, meta: { body } };

    const app = express();

    app.use(google());
    app.use(hello());
  }
}
