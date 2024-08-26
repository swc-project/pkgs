import { router } from "@/lib/base";

import { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { userRouter } from "./users/router";

export const apiRouter = router({
  users: userRouter,
});

export type ApiRouter = typeof apiRouter;
export type ApiInput = inferRouterInputs<ApiRouter>;
export type ApiOutput = inferRouterOutputs<ApiRouter>;
