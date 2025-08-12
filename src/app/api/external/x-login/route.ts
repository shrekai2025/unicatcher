import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

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
    await context.storageState({ path: storagePath });
    await browser.close();

    return NextResponse.json({ success: true, message: '登录流程已执行，状态已保存' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal Error' }, { status: 500 });
  }
}

