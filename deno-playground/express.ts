import { pathToRegexp } from "https://deno.land/x/path_to_regexp@v6.2.1/index.ts";

export type Request = {
  path: string;
  baseUrl: string;
  query: { [key: string]: string };
  method: string;
  body: any;
  locals: any;
  params: { [key: string]: string };
};

export type Response = {
  send: (data: any) => void;
  locals: any;
  status: (code: number) => Response;
};

type Handler = (req: Request, res: Response) => void;
type MiddleWare = (req: Request, res: Response, next: () => void) => void;
type Router = Omit<Express, "use">;

class Express {
  #app: any;
  #req = {} as Request;
  #res = {} as Response;
  #middlewares: MiddleWare[] = [];
  #statusCode = 200;
  #routePath = "/";

  constructor(app?: any) {
    if (app) {
      this.#handleInit();
    }
  }

  #handleInit() {
    this.#app = (globalThis as any).__EXPRESS__;

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
      params: {},
    };

    this.#res = {
      send: (data: any) => {
        if (data.status !== "INVALID_REQUEST") {
          this.#app.respondWith(
            new Response(JSON.stringify(data), {
              status: this.#statusCode,
              headers: { "content-type": "application/json" },
            })
          );
        }
      },
      status: (code: number) => {
        this.#statusCode = code || this.#statusCode;
        return this.#res;
      },
      locals: {},
    };
  }

  #setParams(path: string) {
    const params: { [key: string]: string } = {};

    const str = path;
    const regex = /\/:(\w+)/g;
    const matchers: string[] = [];

    let match;
    while ((match = regex.exec(str)) !== null) {
      matchers.push(match[1]);
    }

    matchers.forEach((key) => {
      const pattern = new RegExp(path.replace(`:${key}`, "([^/]+)"));
      const match = this.#req.baseUrl.match(pattern);
      if (match) {
        const value = match[1];
        params[key] = value;
      }
    });

    this.#req.params = params;
  }

  #method(method: string, path: string | Handler, handler?: Handler) {
    if (this.#req.method === method) {
      if (typeof path === "function") {
        handler = path;
        path = this.#routePath;
      }

      this.#setParams(path);

      if (pathToRegexp(String(path)).exec(this.#req.baseUrl)) {
        handler?.(this.#req, this.#res);
        return this;
      }
    }
  }

  #handleMethod(method: string, path: string | Handler, handler?: Handler) {
    if (this.#middlewares.length > 0)
      this.#middlewares.push(() => {
        this.#method(method, path, handler);
      });
    else this.#method(method, path, handler);
  }

  get(path: string | Handler, handler?: Handler): Express {
    this.#handleMethod("GET", path, handler);
    return this;
  }

  post(path: string | Handler, handler?: Handler) {
    this.#handleMethod("POST", path, handler);
    return this;
  }

  put(path: string | Handler, handler?: Handler) {
    this.#handleMethod("PUT", path, handler);
    return this;
  }

  delete(path: string | Handler, handler?: Handler) {
    this.#handleMethod("DELETE", path, handler);
    return this;
  }

  patch(path: string | Handler, handler?: Handler) {
    this.#handleMethod("PATCH", path, handler);
    return this;
  }

  #handleNext = () => {
    this.#middlewares.shift();

    if (this.#middlewares.length > 0) {
      this.#middlewares[0](this.#req, this.#res, this.#handleNext);
    }
  };

  #handleStart(handler: MiddleWare | Router) {
    if (typeof handler === "function") {
      this.#middlewares.unshift(handler);
      this.#middlewares[0](this.#req, this.#res, this.#handleNext);
    }
  }

  use(handler: MiddleWare | Router) {
    if (typeof handler === "function") {
      this.#middlewares.push(handler);

      if (this.#app) {
        if (this.#middlewares.length === 1)
          this.#middlewares[0](this.#req, this.#res, this.#handleNext);
      }
    } else {
      // integrate new application
    }
  }

  route(path: string): Omit<this, "route"> {
    this.#routePath = path;
    return this;
  }

  async listen(port: string | number, callback?: () => void) {
    const server = Deno.listen({ port: Number(port) });

    const serveHttp = async (conn: Deno.Conn) => {
      const httpConn = Deno.serveHttp(conn);

      for await (const conn of httpConn) {
        const body = await conn.request.json().catch(() => {});
        (globalThis as any).__EXPRESS__ = { ...conn, meta: { body } };

        this.#handleInit();
        this.#handleStart((_, __, next) => next());
      }
    };

    callback?.();

    for await (const conn of server) {
      serveHttp(conn);
    }

    return this;
  }
}

const app = (app?: any) => new Express(app ?? (globalThis as any)?.__EXPRESS__);

app.Router = (): Router => new Express((globalThis as any)?.__EXPRESS__);

export default app;
