import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // Paths only: booking tokens live in URL fragments, which never reach the server,
  // but query strings can carry customer search terms and are dropped here.
  const { reportError } = await import("./lib/monitor");
  await reportError("request", error, {
    path: request.path.split("?")[0],
    method: request.method,
    routerKind: context.routerKind,
    routeType: context.routeType,
  });
};
