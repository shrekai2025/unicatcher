import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

// 确保在 Node.js 运行时执行（Playwright 不支持 Edge Runtime）
export const runtime = 'nodejs';
// 强制动态（避免被静态化）
export const dynamic = 'force-dynamic';
// 允许更长执行时间（部分平台生效）
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, twoFA } = body as { username: string; password: string; twoFA?: string };
    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码必填' }, { status: 400 });
    }

    const headless = true;
    const storagePath = '/app/data/browser-state.json';

    const browser = await chromium.launch({ headless, args: [
      '--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'
    ]});
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 1) 用户名
    await page.waitForSelector('input[name="text"]', { timeout: 60000 });
    await page.fill('input[name="text"]', username);
    await Promise.any([
      page.click('div[role="button"][data-testid="LoginForm_Login_Button"]'),
      page.click('div[role="button"]:has-text("Next")'),
      page.click('div[role="button"]:has-text("下一步")')
    ]).catch(() => {});

    // 2) 若再次询问用户名
    try {
      await page.waitForSelector('input[name="text"]', { timeout: 3000 });
      await page.fill('input[name="text"]', username);
      await Promise.any([
        page.click('div[role="button"]:has-text("Next")'),
        page.click('div[role="button"]:has-text("下一步")')
      ]).catch(() => {});
    } catch {}

    // 3) 密码
    await page.waitForSelector('input[name="password"]', { timeout: 60000 });
    await page.fill('input[name="password"]', password);
    await Promise.any([
      page.click('div[role="button"][data-testid="LoginForm_Login_Button"]'),
      page.click('div[role="button"]:has-text("Log in")'),
      page.click('div[role="button"]:has-text("登录")')
    ]).catch(() => {});

    // 4) 若有 2FA，一般会出现输入框 name="text" 或 name="verfication_code" 等，这里做通用处理
    if (twoFA && twoFA.trim()) {
      try {
        await page.waitForSelector('input[name="text"], input[name*="code" i]', { timeout: 15000 });
        const sel = (await page.$('input[name*="code" i]')) ? 'input[name*="code" i]' : 'input[name="text"]';
        await page.fill(sel, twoFA.trim());
        await Promise.any([
          page.click('div[role="button"]:has-text("Verify")'),
          page.click('div[role="button"]:has-text("验证")'),
          page.click('div[role="button"]:has-text("Next")')
        ]).catch(() => {});
      } catch {
        // 如果没出现 2FA 输入框则忽略
      }
    }

    // 5) 兜底跳转主页并保存状态
    try { await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch {}

    // 保存登录状态
    await context.storageState({ path: storagePath });

    // 将 twitter.com 的通用 Cookie 克隆到 x.com，增强兼容
    try {
      const fs = await import('fs');
      const raw = fs.readFileSync(storagePath, 'utf8');
      const state = JSON.parse(raw);
      const seen = new Set(state.cookies.map((c: any) => `${c.domain}|${c.name}`));
      const add = (c: any, domain: string) => {
        const k = `${domain}|${c.name}`;
        if (!seen.has(k)) { state.cookies.push({ ...c, domain }); seen.add(k); }
      };
      for (const c of [...state.cookies]) {
        if (/^(?:\.?)twitter\.com$/.test(c.domain)) { add(c, '.x.com'); add(c, 'x.com'); }
        if (/^(?:\.?)x\.com$/.test(c.domain))       { add(c, '.twitter.com'); add(c, 'twitter.com'); }
      }
      fs.writeFileSync(storagePath, JSON.stringify(state, null, 2));
    } catch {}
    await browser.close();

    return NextResponse.json({ success: true, message: '登录流程已执行，状态已保存' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal Error' }, { status: 500 });
  }
}

