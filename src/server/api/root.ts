import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { tasksRouter } from "~/server/api/routers/tasks";
import { tweetsRouter } from "~/server/api/routers/tweets";
import { systemRouter } from "~/server/api/routers/system";
import { extractsRouter } from "~/server/api/routers/extracts";
import { tweetProcessingRouter } from "~/server/api/routers/tweet-processing";
import { listIdsRouter } from "~/server/api/routers/list-ids";
import { youtubeRouter } from "~/server/api/routers/youtube";
import { contentPlatformsRouter } from "~/server/api/routers/content-platforms";
import { articleTypesRouter } from "~/server/api/routers/article-types";
import { collectedArticlesRouter } from "~/server/api/routers/collected-articles";
import { contentStructuresRouter } from "~/server/api/routers/content-structures";
import { articleGenerationRouter } from "~/server/api/routers/article-generation";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
  tweets: tweetsRouter,
  system: systemRouter,
  extracts: extractsRouter,
  tweetProcessing: tweetProcessingRouter,
  listIds: listIdsRouter,
  youtube: youtubeRouter,
  contentPlatforms: contentPlatformsRouter,
  articleTypes: articleTypesRouter,
  collectedArticles: collectedArticlesRouter,
  contentStructures: contentStructuresRouter,
  articleGeneration: articleGenerationRouter,
  // 注释掉或删除post路由，因为我们不需要它
  // post: postRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
