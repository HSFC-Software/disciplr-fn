type MiddleWare = (req: any, res: any, next: () => void) => void;
type Handler = (req: any, res: any) => void;

import { pathToRegexp } from "https://deno.land/x/path_to_regexp@v6.2.1/index.ts";

class Express {
  constructor(app: any) {
    this.locals = {};
    this.app = app;

    const url = new URL(this.app.request.url);
    const baseUrl = url.pathname;
    const query = Object.fromEntries(new URLSearchParams(url.search));
    const method = this.app.request.method;

    this.req = {
      baseUrl,
      query,
      method,
    };

    this.res = {
      send: (data: any) => {
        this.app.respondWith(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        );
      },
    };
  }

  locals: any;
  app: any;
  req: { baseUrl: string; query: { [key: string]: string }; method: string };
  res: {
    send: (data: any) => void;
  };
  middlewares: MiddleWare[] = [];

  get(path: string, handler: Handler) {
    if (pathToRegexp(path).exec(this.req.baseUrl)) {
      handler(this.req, this.res);
      return this;
    }
  }

  use(handler: MiddleWare) {
    this.middlewares.push(handler);

    const nextHandler = () => {
      console.log("nextHandler is called.");
      this.middlewares.shift();

      if (this.middlewares.length > 0) {
        this.middlewares[0](this.req, this.res, nextHandler);
      }
    };

    if (this.middlewares.length === 1)
      this.middlewares[0](this.req, this.res, nextHandler);
  }
}

export default Express;
