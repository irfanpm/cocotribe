/**
 * Real-browser checks. Run only against a migrated, seeded, isolated koko_test database,
 * after `npm run build`. Starts its own production server on 127.0.0.1:3001.
 *   RUN_DATABASE_TESTS=1 DATABASE_URL=... npx tsx tests/e2e-browser.ts
 * Set E2E_CHROMIUM to use an already-installed Chromium. Screenshots go to E2E_SHOTS if set.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { chromium, type Page } from "@playwright/test";

const db = new PrismaClient();
const origin = "http://127.0.0.1:3001";
const shots = process.env.E2E_SHOTS;
const pages = ["/", "/book", "/products", "/products/pooja-coconut-2", "/services", "/about", "/faq", "/contact", "/privacy", "/terms"];
const langs = ["en", "ml", "ta", "hi"] as const;
const widths = [320, 360, 390, 768, 1280];
const problems: string[] = [];
const note = (message: string) => {
  problems.push(message);
  console.log("PROBLEM:", message);
};
const step = (message: string) => console.log("OK:", message);

/** Sentences left in English on a page that should be Tamil or Hindi. */
async function englishLeftovers(page: Page) {
  return page.evaluate(() => {
    const allowed = /^(COCOTRIBE|WhatsApp|Razorpay|UPI|IST|\+?\d|KT-)/;
    const out: string[] = [];
    const walker = document.createTreeWalker(document.querySelector("#main")!.parentElement!, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent!.trim();
      const parent = walker.currentNode.parentElement!;
      if (["SCRIPT", "STYLE", "OPTION", "NOSCRIPT"].includes(parent.tagName)) continue;
      if (getComputedStyle(parent).display === "none" || parent.closest(".honeypot,.sr-only")) continue;
      if (text.split(/\s+/).length >= 2 && /^[\x20-\x7E’–·—₹]+$/.test(text) && /[a-z]{3}/.test(text) && !allowed.test(text))
        out.push(text.slice(0, 70));
    }
    return out;
  });
}
async function overflow(page: Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= width + 1) return null;
    const culprits = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > width + 1 && getComputedStyle(el).position !== "fixed")
      .slice(0, 3)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 30)}`);
    return { scrollWidth: document.documentElement.scrollWidth, width, culprits };
  });
}
async function smallTargets(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main a.button,main button,main select,main input:not([type=radio]):not([type=checkbox]):not(.honeypot input),.mobile-actions a,.ref-menu,.coco-language select")]
      .filter((el) => el.offsetParent !== null && !el.closest(".honeypot"))
      .filter((el) => el.getBoundingClientRect().height < 40)
      .slice(0, 5)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 25)}:${Math.round(el.getBoundingClientRect().height)}px`),
  );
}
async function main() {
  assert.equal(process.env.RUN_DATABASE_TESTS, "1");
  assert.match(process.env.DATABASE_URL || "", /koko_test/);
  await db.product.updateMany({ where: { active: true }, data: { stock: 10 } });
  await db.settings.update({ where: { id: "main" }, data: { onlineEnabled: false, deliveryEnabled: true } });
  const email = `e2e-${randomBytes(6).toString("hex")}@example.invalid`;
  const password = randomBytes(18).toString("hex");
  const admin = await db.admin.create({ data: { email, passwordHash: await hash(password, 10) } });
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3001"], {
    env: { ...process.env, DEMO_MODE: "false", APP_URL: origin, RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "" },
    stdio: "ignore",
    windowsHide: true,
  });
  const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined });
  try {
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }

    // Every page, every language, phone to desktop.
    for (const lang of langs) {
      const context = await browser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true });
      await context.addCookies([{ name: "koko-language", value: lang, url: origin }]);
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text().slice(0, 160));
      });
      page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
      for (const path of pages) {
        for (const width of widths) {
          await page.setViewportSize({ width, height: 780 });
          await page.goto(origin + path, { waitUntil: "load" });
          const over = await overflow(page);
          if (over) note(`overflow ${lang} ${path} @${width}: ${JSON.stringify(over)}`);
        }
        await page.setViewportSize({ width: 360, height: 780 });
        await page.goto(origin + path, { waitUntil: "load" });
        assert.equal(await page.locator("html").getAttribute("lang"), lang, "html lang");
        assert.equal(await page.locator(".coco-language select").inputValue(), lang, "language selector on " + path);
        if (lang === "ta" || lang === "hi")
          for (const text of await englishLeftovers(page)) note(`English in ${lang} ${path}: "${text}"`);
        const small = await smallTargets(page);
        if (small.length) note(`small tap targets ${lang} ${path}: ${small.join(", ")}`);
        if (shots && lang !== "en" && (path === "/" || path === "/book"))
          await page.screenshot({ path: `${shots}/${lang}${path.replace("/", "-")}.png`, fullPage: true });
      }
      for (const error of new Set(errors)) note(`console ${lang}: ${error}`);
      await context.close();
    }
    step("all pages in 4 languages at 5 widths");

    // Design: browser zoom-out and huge screens keep proportions; cards stay even and readable.
    for (const width of [360, 768, 1024, 1366, 1920, 3840, 7680]) {
      const design = await browser.newPage({ viewport: { width, height: 900 } });
      for (const path of ["/", "/products"]) {
        await design.goto(origin + path, { waitUntil: "load" });
        // The page streams in; measure only once the cards are really on screen.
        await design.locator(".reference-site article .product-actions .button").first().waitFor();
        const m = await design.evaluate(() => {
          const cards = [...document.querySelectorAll("article")];
          return {
            widths: cards.map((c) => Math.round(c.getBoundingClientRect().width)),
            imageWidest: Math.max(...cards.map((c) => c.querySelector("img")!.getBoundingClientRect().width)),
            buttonFont: Math.min(...cards.map((c) => parseFloat(getComputedStyle(c.querySelector(".product-actions .button")!).fontSize))),
            buttonHeight: Math.min(...cards.map((c) => c.querySelector(".product-actions .button")!.getBoundingClientRect().height)),
            rows: new Set(cards.map((c) => Math.round(c.getBoundingClientRect().top))).size,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });
        const label = `${path} @${width}`;
        if (m.overflow > 1) note(`overflow ${label}: ${m.overflow}`);
        if (new Set(m.widths).size !== 1) note(`uneven card widths ${label}: ${m.widths}`);
        if (m.widths[0] > 480) note(`card too wide ${label}: ${m.widths[0]}`);
        if (m.imageWidest > 480) note(`image too wide ${label}: ${m.imageWidest}`);
        if (m.buttonFont < 14) note(`small button text ${label}: ${m.buttonFont}px`);
        if (m.buttonHeight < 44) note(`small button ${label}: ${m.buttonHeight}px`);
        if (width >= 1920 && m.rows !== 1) note(`cards should fit one row ${label}: ${m.rows}`);
      }
      await design.close();
    }
    step("cards stay even, bounded and readable from 360 to 7680 px");

    // The language switch applies without a reload and survives navigation.
    const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
    });
    await page.goto(origin + "/products");
    await page.locator(".coco-language select").selectOption("hi");
    await page.waitForFunction(() => document.documentElement.lang === "hi");
    await page.goto(origin + "/faq");
    assert.equal(await page.locator(".coco-language select").inputValue(), "hi");
    await page.locator(".coco-language select").selectOption("en");
    step("language switch persists");

    // Keyboard: skip link first, language selector reachable.
    await page.goto(origin + "/");
    await page.keyboard.press("Tab");
    assert.match((await page.evaluate(() => document.activeElement?.textContent)) || "", /Skip to content/);
    let reached = false;
    for (let i = 0; i < 15 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.tagName === "SELECT");
    }
    assert.ok(reached, "language selector reachable by keyboard");
    step("keyboard skip link and selector");

    // Product card: variant selector, WhatsApp text and Book Now follow the chosen pack.
    await page.goto(origin + "/products");
    const card = page.locator("article", { hasText: "Pooja Coconut" }).first();
    await card.locator("select").selectOption("pooja-coconut-10");
    const wa = decodeURIComponent((await card.locator('a[href*="wa.me"]').getAttribute("href")) || "");
    assert.match(wa, /Temple Pack \(10 pcs\)/, "WhatsApp message includes the selected pack");
    assert.match((await card.locator("text=/₹250/").first().textContent()) || "", /250/);
    assert.equal(await page.locator("article select").count(), 5, "5 product families");
    await card.locator('a[href*="/book?product=pooja-coconut-10"]').click();
    await page.waitForURL(/\/book\?/);
    assert.equal(await page.locator('select[required]').first().inputValue(), "pooja-coconut-10");
    step("variant selector, WhatsApp and Book Now");

    // Booking validation, then review, confirm and private receipt.
    await page.locator('input[name="name"]').fill("E2E Customer");
    await page.locator('input[name="phone"]').fill("5000000000");
    const date = new Date(Date.now() + 3 * 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);
    await page.locator('input[type="date"]').fill(date);
    await page.locator("select").nth(2).selectOption({ index: 1 });
    await page.locator('button:has-text("Review my booking")').click();
    await page.locator('.notice.error[role="alert"]').waitFor();
    step("invalid phone shows a visible error on the form");
    await page.locator('input[name="phone"]').fill("9999999999");
    await page.locator('input[name="phone"]').press("Tab");
    await page.locator('button:has-text("Review my booking")').click();
    await page.locator("text=Everything look right?").waitFor();
    const review = (await page.locator(".panel").first().textContent()) || "";
    assert.match(review, /E2E Customer/);
    assert.match(review, /₹250/);
    assert.match(review, new RegExp(date));
    if (shots) await page.screenshot({ path: `${shots}/review.png`, fullPage: true });
    // Friendly error if the server fails, and the same request can be retried.
    await page.route("**/api/bookings", (r) => r.fulfill({ status: 503, json: { error: "SERVICE_UNAVAILABLE" } }));
    await page.locator('button:has-text("Place booking")').click();
    await page.locator('.notice.error[role="alert"]').waitFor();
    await page.unroute("**/api/bookings");
    step("server failure shows a friendly error");
    await page.locator('button:has-text("Place booking")').click();
    await page.waitForURL(/\/booking\/KT-/);
    const bookingUrl = page.url();
    await page.locator('h1:has-text("Your booking has been received.")').waitFor();
    assert.match((await page.locator("main").textContent()) || "", /Pay at Delivery/);
    assert.equal((await db.product.findUniqueOrThrow({ where: { slug: "pooja-coconut-10" } })).stock, 9, "stock reserved");
    assert.equal(await db.order.count({ where: { name: "E2E Customer" } }), 1, "exactly one booking after retry");
    if (shots) await page.screenshot({ path: `${shots}/receipt.png`, fullPage: true });
    step("booking flow, review, receipt, stock reserved");

    // The receipt is private: no token or a wrong token shows nothing.
    const stranger = await browser.newContext();
    const strangerPage = await stranger.newPage();
    await strangerPage.goto(bookingUrl.split("#")[0]);
    await strangerPage.locator('.notice.error[role="alert"]').waitFor();
    assert.equal((await strangerPage.locator("main").textContent())?.includes("E2E Customer"), false);
    await stranger.close();
    step("receipt without the private link shows no customer data");

    // Admin sign-in, sidebar, search, transitions, stock, audit.
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const adminPage = await adminContext.newPage();
    await adminPage.goto(origin + "/admin");
    await adminPage.waitForURL(/\/admin\/login/);
    await adminPage.locator('input[name="email"]').fill(email);
    await adminPage.locator('input[name="password"]').fill("definitely-wrong-password");
    await adminPage.locator("button").click();
    await adminPage.locator("text=The email or password is incorrect.").waitFor();
    await adminPage.locator('input[name="password"]').fill(password);
    await adminPage.locator("button").click();
    await adminPage.waitForURL(origin + "/admin");
    await adminPage.locator("text=Bookings overview").waitFor();
    for (const tab of ["Products", "Time slots", "FAQs", "Website settings", "Messages", "Audit log", "Orders"])
      await adminPage.locator(`nav[aria-label="Admin sections"] button:has-text("${tab}")`).click();
    await adminPage.locator('input[aria-label="Search bookings"]').fill("E2E Customer");
    await adminPage.locator('td:has-text("E2E Customer")').waitFor();
    await adminPage.locator('button:has-text("View")').first().click();
    const statusOptions = await adminPage.locator(".modal select").first().locator("option").allTextContents();
    assert.deepEqual(statusOptions, ["PENDING", "CONFIRMED", "CANCELLED"], "only valid next steps are offered");
    await adminPage.locator(".modal select").first().selectOption("CONFIRMED");
    // Nothing is saved until the question is answered, and Go back keeps the order as it was.
    await adminContext.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "whatsapp stub" }));
    await adminPage.locator('button:has-text("Update order")').click();
    await adminPage.locator("text=a WhatsApp message about this update?").waitFor();
    assert.equal((await db.order.findFirstOrThrow({ where: { name: "E2E Customer" } })).status, "PENDING");
    await adminPage.locator('button:has-text("Go back")').click();
    await adminPage.locator('button:has-text("Update order")').click();
    // Yes: saved, and WhatsApp opens with the customer's number and the new status.
    const whatsappTab = adminContext.waitForEvent("page");
    await adminPage.locator('button:has-text("Yes, update and open WhatsApp")').click();
    const opened = await whatsappTab;
    await opened.waitForURL(/wa\.me/);
    const sentTo = decodeURIComponent(opened.url());
    assert.match(sentTo, /wa\.me\/919999999999/, "goes to the customer's number");
    assert.match(sentTo, /Order status: Confirmed/);
    assert.match(sentTo, /KT-/);
    await opened.close();
    await adminPage.locator('td:has-text("CONFIRMED")').first().waitFor();
    assert.equal((await db.order.findFirstOrThrow({ where: { name: "E2E Customer" } })).status, "CONFIRMED");
    step("admin login, sidebar, search, order transition; Yes saves and opens WhatsApp");

    // Customer's open receipt updates with no reload (20-second background check).
    await page.locator('h1:has-text("Your coconuts are booked.")').waitFor({ timeout: 30000 });
    step("customer receipt updated by itself after admin change");

    // No: saved, and no WhatsApp window or prompt appears.
    await adminPage.locator('button:has-text("View")').first().click();
    await adminPage.locator(".modal select").first().selectOption("PREPARING");
    await adminPage.locator('button:has-text("Update order")').click();
    let extraWindow = false;
    const onPage = () => { extraWindow = true; };
    adminContext.on("page", onPage);
    await adminPage.locator('button:has-text("No, update only")').click();
    await adminPage.locator('td:has-text("PREPARING")').first().waitFor();
    adminContext.off("page", onPage);
    assert.equal(extraWindow, false, "no WhatsApp window when the admin says no");
    assert.equal(await adminPage.locator('a:has-text("Send WhatsApp update")').count(), 0);
    assert.equal((await db.order.findFirstOrThrow({ where: { name: "E2E Customer" } })).status, "PREPARING");
    step("No saves the status without any message");

    // Edit a price through the product form; stock must not move; customer page updates on focus.
    await adminPage.locator('nav[aria-label="Admin sections"] button:has-text("Products")').click();
    const panel = adminPage.locator("article.panel", { hasText: "Roasted Coconut" });
    await panel.locator('button:has-text("Edit product")').click();
    const stockBefore = (await db.product.findUniqueOrThrow({ where: { slug: "roasted-coconut-100g" } })).stock;
    await adminPage.locator('.modal input[type="number"]').first().fill("6100");
    await adminPage.locator('.modal button:has-text("Save changes")').click();
    await adminPage.locator("text=Changes saved.").waitFor();
    const roasted = await db.product.findUniqueOrThrow({ where: { slug: "roasted-coconut-100g" } });
    assert.equal(roasted.price, 6100);
    assert.equal(roasted.stock, stockBefore);
    await page.goto(origin + "/products");
    await page.locator("article", { hasText: "Roasted Coconut" }).locator('.price:has-text("₹61")').waitFor();
    await db.product.update({ where: { id: roasted.id }, data: { price: 6000 } });
    // Saving stock from a stale screen is refused, then succeeds on the refreshed value.
    await db.product.update({ where: { id: roasted.id }, data: { stock: stockBefore - 1 } });
    await panel.locator('input[name="stock"]').fill("7");
    await panel.locator('button:has-text("Save stock")').click();
    await adminPage.locator("text=A customer booked this product").waitFor();
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: roasted.id } })).stock, stockBefore - 1);
    await db.product.update({ where: { id: roasted.id }, data: { stock: stockBefore } });
    step("price edit keeps stock; customer page shows it; stale stock save refused");

    // Out of stock: Book Now disappears at once, the enquiry stays, and the booking form blocks it.
    const desiccated = adminPage.locator("article.panel", { hasText: "Desiccated Coconut" });
    await desiccated.locator('input[name="stock"]').fill("0");
    await desiccated.locator('button:has-text("Save stock")').click();
    await desiccated.locator("text=/0 available/").waitFor();
    const fresh = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const freshPage = await fresh.newPage();
    await freshPage.goto(origin + "/products");
    const soldOut = freshPage.locator("article", { hasText: "Desiccated Coconut" });
    await soldOut.locator('span[aria-disabled="true"]:has-text("Currently unavailable")').waitFor();
    assert.equal(await soldOut.locator('a[href*="/book?"]').count(), 0, "no Book Now when out of stock");
    assert.equal(await soldOut.locator('a[href*="wa.me"]').count(), 1, "enquiry stays available");
    await freshPage.goto(origin + "/book?product=desiccated-coconut-100g");
    await freshPage.locator('[role="status"]:has-text("currently unavailable for booking")').waitFor();
    assert.equal(await freshPage.locator('button:has-text("Review my booking")').isDisabled(), true);
    await fresh.close();
    await desiccated.locator('input[name="stock"]').fill("10");
    await desiccated.locator('button:has-text("Save stock")').click();
    await desiccated.locator("text=/10 available/").waitFor();
    step("out-of-stock pack cannot be booked; enquiry stays");

    await adminPage.locator('nav[aria-label="Admin sections"] button:has-text("Audit log")').click();
    await adminPage.locator('td:has-text("Updated product")').first().waitFor();
    await adminPage.locator('small:has-text("price: 6000 → 6100")').first().waitFor();
    if (shots) await adminPage.screenshot({ path: `${shots}/admin-audit.png` });
    step("audit log shows who changed what");

    // Admin at phone width: sidebar opens, no overflow.
    await adminPage.setViewportSize({ width: 360, height: 780 });
    await adminPage.locator('button:has-text("Menu")').click();
    await adminPage.locator(".admin-sidebar.open").waitFor();
    await adminPage.keyboard.press("Escape");
    const adminOver = await overflow(adminPage);
    if (adminOver) note(`admin overflow @360: ${JSON.stringify(adminOver)}`);
    await adminPage.locator('button:has-text("Sign out")').click();
    await adminPage.waitForURL(/\/admin\/login/);
    step("admin at phone width and sign-out");

    for (const error of new Set(consoleErrors))
      if (!/503|401/.test(error)) note(`console: ${error}`);
    await context.close();
    await adminContext.close();
  } finally {
    await browser.close();
    server.kill();
    await db.auditLog.deleteMany({ where: { adminId: admin.id } });
    await db.order.deleteMany({ where: { name: "E2E Customer" } });
    await db.admin.delete({ where: { id: admin.id } });
    await db.$disconnect();
  }
  console.log(problems.length ? `\n${problems.length} problem(s) found.` : "\nNo problems found.");
  if (problems.length) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
