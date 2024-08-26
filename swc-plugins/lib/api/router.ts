import { router } from "@/lib/base";

import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { compatRangeRouter } from "./compatRange/router";
import { userRouter } from "./users/router";

export const apiRouter = router({
  users: userRouter,

  compatRange: compatRangeRouter,
});

export type ApiRouter = typeof apiRouter;
export type ApiInput = inferRouterInputs<ApiRouter>;
export type ApiOutput = inferRouterOutputs<ApiRouter>;
