import { redirect } from "next/navigation";

export default function Home() {
  // 简化逻辑：直接重定向到仪表板
  // 中间件会处理认证检查
  redirect("/dashboard");
}
