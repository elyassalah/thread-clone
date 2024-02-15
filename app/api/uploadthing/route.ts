import { createRouteHandler } from "uploadthing/next";

import { ourFileRouter } from "./core";
// this exposes what simply we are crated in core.ts which is(ourFileRouter)
// Export routes for Next App Router
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});

