import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  // 如果未登录，重定向到登录页面
  if (!session?.user) {
    redirect("/login");
  }

  // 登录后直接重定向到管理仪表板
  redirect("/dashboard");
}
