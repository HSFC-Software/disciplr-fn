import { pathToRegexp } from "https://deno.land/x/path_to_regexp@v6.2.1/index.ts";

type Req = {
  path: string;
  baseUrl: string;
  query: { [key: string]: string };
  method: string;
  body: any;
  locals: any;
};

type Res = {
  send: (data: any) => void;
  locals: any;
  status: (code: number) => Res;
};

type Handler = (req: Req, res: Res) => void;
type MiddleWare = (req: Req, res: Res, next: () => void) => void;
type Router = Omit<Express, "use">;

class Express {
  #app: any;
  #req: Req;
  #res: Res;
  #middlewares: MiddleWare[] = [];
  #statusCode = 200;
  #routePath = "/";

  constructor(app: any) {
    this.#app = app;

    const url = new URL(this.#app.request.url);
    const baseUrl = url.pathname;
    const query = Object.fromEntries(new URLSearchParams(url.search));
    const method = this.#app.request.method;
    const body = this.#app.meta.body;

    this.#req = {
      path: baseUrl,
      baseUrl,
      query,
      method,
      body,
      locals: {},
    };

    this.#res = {
      send: (data: any) => {
        this.#app.respondWith(
          new Response(JSON.stringify(data), {
            status: this.#statusCode,
            headers: { "content-type": "application/json" },
          })
        );
      },
      status: (code: number) => {
        this.#statusCode = code || this.#statusCode;
        return this.#res;
      },
      locals: {},
    };
  }

  #method(path: string | Handler, handler?: Handler) {
    console.log("routePath:", this.#routePath);

    if (typeof path === "function") {
      handler = path;
      path = this.#routePath;
    }

    if (pathToRegexp(String(path)).exec(this.#req.baseUrl)) {
      handler?.(this.#req, this.#res);
      return this;
    }
  }

  get(path: string | Handler, handler?: Handler) {
    if (this.#req.method !== "GET") return;

    if (this.#middlewares.length > 0)
      this.#middlewares.push(() => {
        this.#method(path, handler);
      });
    else this.#method(path, handler);
  }

  post(path: string, handler: Handler) {
    if (this.#req.method !== "POST") return;

    if (this.#middlewares.length > 0)
      this.#middlewares.push(() => {
        this.#method(path, handler);
      });
    else this.#method(path, handler);
  }

  put(path: string, handler: Handler) {
    if (this.#req.method !== "PUT") return;

    if (this.#middlewares.length > 0)
      this.#middlewares.push(() => {
        this.#method(path, handler);
      });
    else this.#method(path, handler);
  }

  delete(path: string, handler: Handler) {
    if (this.#req.method !== "DELETE") return;

    if (this.#middlewares.length > 0)
      this.#middlewares.push(() => {
        this.#method(path, handler);
      });
    else this.#method(path, handler);
  }

  patch(path: string, handler: Handler) {
    if (this.#req.method !== "PATCH") return;

    if (this.#middlewares.length > 0)
      this.#middlewares.push(() => {
        this.#method(path, handler);
      });
    else this.#method(path, handler);
  }

  use(handler: MiddleWare | Router) {
    if (typeof handler !== "function") {
      return;
    }
    this.#middlewares.push(handler);

    const nextHandler = () => {
      this.#middlewares.shift();

      if (this.#middlewares.length > 0) {
        this.#middlewares[0](this.#req, this.#res, nextHandler);
      }
    };

    if (this.#middlewares.length === 1)
      this.#middlewares[0](this.#req, this.#res, nextHandler);
  }

  route(path: string): Omit<this, "route"> {
    this.#routePath = path;
    return this;
  }
}

const app = (app?: any) => new Express(app ?? (globalThis as any)?.__EXPRESS__);

app.Router = (): Router => new Express((globalThis as any)?.__EXPRESS__);

export default app;
