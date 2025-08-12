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
    const { username, password, twoFA, phase } = body as { username: string; password?: string; twoFA?: string; phase?: 'username'|'confirm'|'password' };
    if (!username) return NextResponse.json({ error: '用户名必填' }, { status: 400 });
    if ((phase === 'password' || !phase) && !password) return NextResponse.json({ error: '密码必填' }, { status: 400 });

    const headless = true;
    const storagePath = '/app/data/browser-state.json';
    const mask = (s: string) => (s?.length ?? 0) <= 3 ? '***' : `${s.slice(0,2)}***${s.slice(-1)}`;
    const now = () => new Date().toISOString();
    const log = (step: string, extra?: unknown) => console.log('[XLOGIN]', now(), step, extra ?? '');
    log('START', { user: mask(username) });

    const browser = await chromium.launch({ headless, args: [
      '--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'
    ]});
    log('BROWSER_LAUNCHED');
    const context = await browser.newContext();
    const page = await context.newPage();

    log('GOTO_LOGIN');
    await page.goto('https://x.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    log('LOGIN_LOADED', { url: page.url() });

    // 1) 用户名
    log('FILL_USERNAME_WAIT');
    await page.waitForSelector('input[name="text"]', { timeout: 60000 });
    await page.fill('input[name="text"]', username);
    log('FILL_USERNAME_DONE');
    await Promise.any([
      page.click('div[role="button"][data-testid="LoginForm_Login_Button"]'),
      page.click('div[role="button"]:has-text("Next")'),
      page.click('div[role="button"]:has-text("下一步")')
    ]).catch(() => {});
    log('CLICK_NEXT_AFTER_USERNAME');

    if (phase === 'username') {
      log('STEP1_DONE');
      await browser.close();
      return NextResponse.json({ success: true, message: '第一步完成' });
    }

    // 2) 若再次询问用户名
    try {
      await page.waitForSelector('input[name="text"]', { timeout: 3000 });
      await page.fill('input[name="text"]', username);
      await Promise.any([
        page.click('div[role="button"]:has-text("Next")'),
        page.click('div[role="button"]:has-text("下一步")')
      ]).catch(() => {});
      log('RECONFIRM_USERNAME');
    } catch {}

    if (phase === 'confirm') {
      log('STEP2_DONE');
      await browser.close();
      return NextResponse.json({ success: true, message: '第二步完成' });
    }

    // 3) 密码
    log('FILL_PASSWORD_WAIT');
    await page.waitForSelector('input[name="password"]', { timeout: 60000 });
    await page.fill('input[name="password"]', password!);
    log('FILL_PASSWORD_DONE');
    await Promise.any([
      page.click('div[role="button"][data-testid="LoginForm_Login_Button"]'),
      page.click('div[role="button"]:has-text("Log in")'),
      page.click('div[role="button"]:has-text("登录")')
    ]).catch(() => {});
    log('CLICK_LOGIN');

    // 4) 若有 2FA，一般会出现输入框 name="text" 或 name="verfication_code" 等，这里做通用处理
    if (twoFA && twoFA.trim()) {
      try {
        log('2FA_WAIT');
        await page.waitForSelector('input[name="text"], input[name*="code" i]', { timeout: 15000 });
        const sel = (await page.$('input[name*="code" i]')) ? 'input[name*="code" i]' : 'input[name="text"]';
        await page.fill(sel, twoFA.trim());
        await Promise.any([
          page.click('div[role="button"]:has-text("Verify")'),
          page.click('div[role="button"]:has-text("验证")'),
          page.click('div[role="button"]:has-text("Next")')
        ]).catch(() => {});
        log('2FA_SUBMITTED');
      } catch {
        // 如果没出现 2FA 输入框则忽略
        log('2FA_NOT_PRESENT');
      }
    }

    // 5) 兜底跳转主页并保存状态
    try { await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch {}
    log('GOTO_HOME', { url: page.url() });

    // 保存登录状态
    await context.storageState({ path: storagePath });
    log('STATE_SAVED', { path: storagePath });

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
      log('COOKIE_CLONED');
    } catch {}
    await browser.close();
    log('BROWSER_CLOSED');

    return NextResponse.json({ success: true, message: '登录流程已执行，状态已保存' });
  } catch (error: any) {
    console.error('[XLOGIN] ERROR', error);
    return NextResponse.json({ error: error?.message || 'Internal Error' }, { status: 500 });
  }
}

