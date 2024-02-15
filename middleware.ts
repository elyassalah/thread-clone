import { authMiddleware } from "@clerk/nextjs";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your Middleware
export default authMiddleware({
  // public route its the route that can user visit is without session
  // we were have a error on uploadthing cause this middleware is blocked there rout
  // from call it self and simulated callback for file , so we just add the path of it in public route
  // to disable the clerk auth from upload thing cause we in onboarding and already sign in
  publicRoutes: ["/", "/api/webhook/clerk", "/api/uploadthing"],
  ignoredRoutes: ["/api/webhook/clerk"],
});
// C:\Users\mr_al\Desktop\threads-next\app\api\uploadthing
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
