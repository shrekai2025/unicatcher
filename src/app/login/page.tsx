import { redirect } from "next/navigation";
import { auth, signIn } from "~/server/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await auth();

  // 如果已登录，重定向到主页
  if (session?.user) {
    redirect("/");
  }

  async function handleLogin(formData: FormData) {
    "use server";
    
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      await signIn("credentials", {
        username,
        password,
        redirectTo: "/",
      });
    } catch (error) {
      // 重定向到登录页面并显示错误
      redirect("/login?error=credentials");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-blue-950">
      <div className="w-full max-w-md space-y-8 px-6">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl mb-4">
            <span className="text-blue-300">Uni</span>Catcher
          </h1>
          <p className="text-xl text-blue-200 mb-8">
            通用浏览器爬虫系统
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            管理员登录
          </h2>

          {searchParams.error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-200 text-sm text-center">
                {searchParams.error === 'credentials' 
                  ? '用户名或密码错误，请重试'
                  : '登录失败，请重试'
                }
              </p>
            </div>
          )}

          <form action={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-blue-100 mb-2">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                defaultValue="admin"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="请输入用户名"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-100 mb-2">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="请输入密码"
              />
            </div>

            <div className="text-center">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                登录
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-blue-200">
              默认账号: <span className="font-mono">admin</span>
            </p>
            <p className="text-sm text-blue-200">
              默认密码: <span className="font-mono">a2885828</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
} 