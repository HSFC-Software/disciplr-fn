import express from "../_shared/express.ts";
import google from "./_route/google.ts";
import hellow from "./_route/hellow.ts";

const server = Deno.listen({ port: 4507 });

for await (const conn of server) {
  serveHttp(conn);
}

async function serveHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const conn of httpConn) {
    const body = await conn.request.json().catch((err) => console.log(err));
    (globalThis as any).__EXPRESS__ = { ...conn, meta: { body } };

    const app = express();
    app.use(google());
    app.use(hellow());
  }
}
