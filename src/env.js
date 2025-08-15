import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.string().optional(),
    NEXTAUTH_URL: z.string().optional(),
    PLAYWRIGHT_BROWSERS_PATH: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

// 调试输出环境变量
console.log("[ENV] 环境变量加载情况:", {
  NODE_ENV: process.env.NODE_ENV,
  hasAUTH_SECRET: !!process.env.AUTH_SECRET,
  hasDATABASE_URL: !!process.env.DATABASE_URL,
  hasNEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
  hasPORT: !!process.env.PORT,
  hasPLAYWRIGHT_BROWSERS_PATH: !!process.env.PLAYWRIGHT_BROWSERS_PATH,
  SKIP_ENV_VALIDATION: !!process.env.SKIP_ENV_VALIDATION,
  timestamp: new Date().toISOString()
});
