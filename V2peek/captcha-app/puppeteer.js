// V2: Boten har uppgraderats för att generera mänskliga musrörelser via Bézier-kurvor och variera scrollhastighet.
const puppeteer = require('puppeteer');
// Skapar en naturlig kurvad musrörelse istället för en rak linje
async function moveMouseHumanLike(page, startX, startY, endX, endY) {
    const steps = Math.floor(Math.random() * 20) + 30;
    console.log(`  Smyger: (${Math.round(startX)}, ${Math.round(startY)}) -> (${Math.round(endX)}, ${Math.round(endY)}) [${steps} steg]`);
    
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    
    const normX = -dy / dist;
    const normY = dx / dist;
    
    const curveDeviation = (50 + Math.random() * 100) * (Math.random() > 0.5 ? 1 : -1);
    const cpX = midX + normX * curveDeviation;
    const cpY = midY + normY * curveDeviation;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        
        // Easing för att efterlikna muskelrörelse
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        const x = (1 - easeT) * (1 - easeT) * startX + 2 * (1 - easeT) * easeT * cpX + easeT * easeT * endX;
        const y = (1 - easeT) * (1 - easeT) * startY + 2 * (1 - easeT) * easeT * cpY + easeT * easeT * endY;
        
        const jitterX = (Math.random() - 0.5) * 4;
        const jitterY = (Math.random() - 0.5) * 4;

        await page.mouse.move(x + jitterX, y + jitterY);
        
        const delay = Math.floor(Math.random() * 20) + 5;
        await new Promise(r => setTimeout(r, delay));
    }
    
    if (Math.random() > 0.4) {
        await page.mouse.move(endX + (Math.random() - 0.5)*15, endY + (Math.random() - 0.5)*15);
        await new Promise(r => setTimeout(r, 60));
    }
    await page.mouse.move(endX, endY);
}

(async () => {
    console.log("Startar bot-test (V2)");

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    });

    await page.goto('http://localhost:3000');

    // Scroll neråt för att nå formuläret
    console.log("Scrollar ner på hero-sektionen...");
    const scrollSteps = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < scrollSteps; i++) {
        const delta = 80 + Math.floor(Math.random() * 120);
        await page.mouse.wheel({ deltaY: delta });
        const pause = 200 + Math.floor(Math.random() * 400);
        console.log(`  Scroll ${i + 1}/${scrollSteps}: ${delta}px (paus ${pause}ms)`);
        await new Promise(r => setTimeout(r, pause));
    }
    await page.mouse.wheel({ deltaY: -60 });
    await new Promise(r => setTimeout(r, 300));

    // Steg 1: Förstasida
    console.log("Väntar på förstasidan...");
    await new Promise(r => setTimeout(r, 600));
    const btnStart = await page.waitForSelector('#btn-start-register');
    const startBox = await btnStart.boundingBox();
    
    const currX = 100;
    const currY = 100;
    await page.mouse.move(currX, currY);

    await moveMouseHumanLike(page, currX, currY, startBox.x + startBox.width/2, startBox.y + startBox.height/2);
    console.log("Klickar på Register...");
    await page.click('#btn-start-register');

    // Steg 2: Formulär
    console.log("Väntar innan formulärifyllnad...");
    await page.waitForSelector('#name');
    await new Promise(r => setTimeout(r, 500));

    console.log("Fyller i formuläret...");
    await page.type('#name', 'Bot Botsson', { delay: 80 });
    await page.type('#email', 'bot@example.com', { delay: 90 });
    await page.type('#password', 'Lösenord123!', { delay: 70 });

    await new Promise(r => setTimeout(r, 400));
    
    const btnSubmit = await page.$('#btn-submit-form');
    const submitBox = await btnSubmit.boundingBox();

    await moveMouseHumanLike(page, startBox.x + 20, startBox.y + 20, submitBox.x + submitBox.width/2, submitBox.y + submitBox.height/2);

    await page.click('#btn-submit-form');

    
    console.log("Navigerar till CAPTCHA...");
    const btnCaptcha = await page.waitForSelector('#btn-captcha');
    await new Promise(r => setTimeout(r, 800));

    const captchaBox = await btnCaptcha.boundingBox();
    await moveMouseHumanLike(page, submitBox.x + 20, submitBox.y + 20, captchaBox.x + captchaBox.width/2, captchaBox.y + captchaBox.height/2);

    console.log("Klickar på CAPTCHA...");
    await page.click('#btn-captcha');

    console.log("Sekvens klar! Kolla serverns loggar.");

    setTimeout(async () => {
        await browser.close();
    }, 4000);
})();

