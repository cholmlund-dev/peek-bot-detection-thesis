// V3: Teknisk profilering. Boten har inga specifika anpassningar för att kringgå hårdvaru- och IP-analys.
const puppeteer = require('puppeteer');
async function moveMouseHumanLike(page, startX, startY, endX, endY) {
    const steps = Math.floor(Math.random() * 20) + 30;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const normX = -dy / dist;
    const normY = dx / dist;
    const curveDeviation = (50 + Math.random() * 100) * (Math.random() > 0.5 ? 1 : -1);
    const cpX = midX + normX * curveDeviation;
    const cpY = midY + normY * curveDeviation;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const x = (1 - easeT) * (1 - easeT) * startX + 2 * (1 - easeT) * easeT * cpX + easeT * easeT * endX;
        const y = (1 - easeT) * (1 - easeT) * startY + 2 * (1 - easeT) * easeT * cpY + easeT * easeT * endY;
        
        const jitterX = (Math.random() - 0.5) * 4;
        const jitterY = (Math.random() - 0.5) * 4;
        await page.mouse.move(x + jitterX, y + jitterY);

        const pauseMs = Math.random() > 0.8 ? 60 : 5;
        await new Promise(res => setTimeout(res, pauseMs));
    }

    if (Math.random() > 0.4) {
        await page.mouse.move(endX + (Math.random() - 0.5) * 15, endY + (Math.random() - 0.5) * 15);
        await new Promise(r => setTimeout(r, 60));
    }
    await page.mouse.move(endX, endY);
}
async function humanScroll(page, scrolls = 5) {
    for (let i = 0; i < scrolls; i++) {
        const targetDelta = 80 + Math.floor(Math.random() * 120);
        let scrolled = 0;
        while (scrolled < targetDelta) {
            await page.mouse.wheel({ deltaY: 10 });
            await new Promise(r => setTimeout(r, 10 + Math.random() * 20));
            scrolled += 10;
        }
        await new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 400)));
    }
}

(async () => {
    console.log('Startar realistisk bot-test mot V3-server...');
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.goto('http://localhost:3000');
    console.log('Sida laddad');
    console.log('Scrollar ner mot knappen...');
    await humanScroll(page, 5 + Math.floor(Math.random() * 3));
    console.log('\n--- Steg 1: Förstasida ---');
    const startPageDelay = 700 + Math.random() * 600;
    await new Promise(r => setTimeout(r, startPageDelay));

    const btnStart = await page.waitForSelector('#btn-start-register');
    const startBox = await btnStart.boundingBox();

    const initX = 100 + Math.random() * 200;
    const initY = 100 + Math.random() * 200;
    await page.mouse.move(initX, initY);

    console.log('  Rör musen mot "Registrera"-knappen');
    await moveMouseHumanLike(page, initX, initY, startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
    console.log('  Klickar "Registrera" (isTrusted=false)');
    await page.evaluate(() => document.querySelector('#btn-start-register').click());
    console.log('\n--- Steg 2: Formulär ---');
    await page.waitForSelector('#name');

    const formDelay = 1700 + Math.random() * 800;
    await new Promise(r => setTimeout(r, formDelay));

    console.log('  Scrollar i formuläret');
    await humanScroll(page, 3 + Math.floor(Math.random() * 3));

    console.log('  Fyller i fält...');
    await page.type('#name', 'Bot Botsson', { delay: 80 });
    await page.type('#email', 'bot@example.com', { delay: 90 });
    await page.type('#password', 'Lösenord123!', { delay: 70 });

    await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

    const btnSubmit = await page.$('#btn-submit-form');
    const submitBox = await btnSubmit.boundingBox();

    console.log('  Rör musen mot knappen i formuläret');
    await moveMouseHumanLike(page, startBox.x, startBox.y, submitBox.x + submitBox.width / 2, submitBox.y + submitBox.height / 2);

    console.log('  Klickar (isTrusted=false)');
    await page.evaluate(() => document.querySelector('#btn-submit-form').click());
    console.log('\n--- Steg 3: CAPTCHA ---');
    const btnCaptcha = await page.waitForSelector('#btn-captcha');

    const captchaDelay = 900 + Math.random() * 700;
    await new Promise(r => setTimeout(r, captchaDelay));

    console.log('  Scrollar på CAPTCHA-sidan');
    await humanScroll(page, 3 + Math.floor(Math.random() * 3));

    const captchaBox = await btnCaptcha.boundingBox();
    console.log('  Rör musen mot CAPTCHA-knappen');
    await moveMouseHumanLike(page, submitBox.x, submitBox.y, captchaBox.x + captchaBox.width / 2, captchaBox.y + captchaBox.height / 2);

    console.log('  Klickar CAPTCHA (isTrusted=false)');
    await page.evaluate(() => document.querySelector('#btn-captcha').click());

    console.log('\nSekvens klar! Kolla serverns loggar.');

    setTimeout(async () => {
        await browser.close();
    }, 4000);
})();
