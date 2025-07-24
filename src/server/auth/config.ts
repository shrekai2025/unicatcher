// import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// import { db } from "~/server/db";
import { config } from "~/lib/config";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        console.log('[AUTH] 尝试登录:', { 
          username: credentials?.username,
          hasPassword: !!credentials?.password 
        });
        
        if (!credentials?.username || !credentials?.password) {
          console.log('[AUTH] 缺少用户名或密码');
          return null;
        }

        // 验证固定账号密码
        const isValidUsername = credentials.username === config.auth.username;
        const isValidPassword = credentials.password === config.auth.password;
        
        console.log('[AUTH] 验证结果:', { 
          isValidUsername, 
          isValidPassword,
          expectedUsername: config.auth.username,
          expectedPassword: config.auth.password 
        });

        if (isValidUsername && isValidPassword) {
          console.log('[AUTH] 登录成功');
          return {
            id: "admin",
            name: "管理员",
            email: "admin@unicatcher.local",
          };
        }

        console.log('[AUTH] 登录失败');
        return null;
      },
    }),
  ],
  // 移除 PrismaAdapter，因为我们使用 JWT 策略
  // adapter: PrismaAdapter(db),
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub ?? "admin",
      },
    }),
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt", // 使用JWT而不是数据库会话
    maxAge: config.auth.sessionMaxAge,
  },
} satisfies NextAuthConfig;
