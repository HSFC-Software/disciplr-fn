import { Request } from "./express.ts";
import { jwt } from "./jwt.ts";

export default (req: Request, _: any, next?: () => void) => {
  const token = req.headers.get("x-authorization-key");

  req.locals = {
    ...req.locals,
    auth: jwt.decode(token ?? ""),
  };

  next?.();
};
