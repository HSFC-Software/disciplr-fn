import { pathToRegexp } from "https://deno.land/x/path_to_regexp@v6.2.1/index.ts";

type Req = {
  path: string;
  baseUrl: string;
  query: { [key: string]: string };
  method: string;
  body: any;
};

type Res = {
  send: (data: any) => void;
  locals: any;
  status: (code: number) => Res;
};

type Handler = (req: Req, res: Res) => void;
type MiddleWare = (req: Req, res: Res, next: () => void) => void;

class Express {
  locals: any;
  app: any;
  req: Req;
  res: Res;
  middlewares: MiddleWare[] = [];
  statusCode = 200;

  constructor(app: any) {
    this.locals = {};
    this.app = app;

    const url = new URL(this.app.request.url);
    const baseUrl = url.pathname;
    const query = Object.fromEntries(new URLSearchParams(url.search));
    const method = this.app.request.method;
    const body = this.app.meta.body;

    this.req = {
      path: baseUrl,
      baseUrl,
      query,
      method,
      body,
    };

    this.res = {
      send: (data: any) => {
        this.app.respondWith(
          new Response(JSON.stringify(data), {
            status: this.statusCode,
            headers: { "content-type": "application/json" },
          })
        );
      },
      status: (code: number) => {
        this.statusCode = code || this.statusCode;
        return this.res;
      },
      locals: {},
    };
  }

  #method(path: string, handler: Handler) {
    if (pathToRegexp(path).exec(this.req.baseUrl)) {
      handler(this.req, this.res);
      return this;
    }
  }

  get(path: string, handler: Handler) {
    if (this.req.method !== "GET") return;

    if (this.middlewares.length > 0)
      this.middlewares.push(() => {
        this.#method(path, handler);
      });
    else this.#method(path, handler);
  }

  post(path: string, handler: Handler) {
    if (this.req.method !== "POST") return;

    if (this.middlewares.length > 0)
      this.middlewares.push(() => {
        this.#method(path, handler);
      });
    else this.#method(path, handler);
  }

  put(path: string, handler: Handler) {
    if (this.req.method !== "PUT") return;

    if (this.middlewares.length > 0)
      this.middlewares.push(() => {
        this.#method(path, handler);
      });
    else this.#method(path, handler);
  }

  delete(path: string, handler: Handler) {
    if (this.req.method !== "DELETE") return;

    if (this.middlewares.length > 0)
      this.middlewares.push(() => {
        this.#method(path, handler);
      });
    else this.#method(path, handler);
  }

  patch(path: string, handler: Handler) {
    if (this.req.method !== "PATCH") return;

    if (this.middlewares.length > 0)
      this.middlewares.push(() => {
        this.#method(path, handler);
      });
    else this.#method(path, handler);
  }

  use(handler: MiddleWare) {
    this.middlewares.push(handler);

    const nextHandler = () => {
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
