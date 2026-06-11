// V1: Grundläggande bot. Fyller i formuläret så snabbt som möjligt och fyller även i honeypot-fältet.
const puppeteer = require('puppeteer');

(async () => {
    console.log("Startar grundläggande bot-test (V1)...");
    
    const browser = await puppeteer.launch({ 
        headless: false 
    });
    
    const page = await browser.newPage();
    await page.goto('http://localhost:3000'); 

    console.log("Klickar på Register...");
    await page.waitForSelector('#btn-start-register');
    await page.click('#btn-start-register'); 

    console.log("Fyller snabbt i formuläret...");
    await page.waitForSelector('#name');
    
    // Fyller i det dolda honeypot-fältet
    await page.evaluate(() => {
        const hp = document.querySelector('input[name="honeypot"]');
        if (hp) hp.value = "bot@spam.com";
    });

    await page.type('#name', 'Bot Botsson');
    await page.type('#email', 'bot@example.com');
    await page.type('#password', 'Lösenord123!');
    
    await page.click('#btn-submit-form');

    console.log("Klickar direkt på CAPTCHA...");
    await page.waitForSelector('#btn-captcha');
    await page.click('#btn-captcha');

    console.log("Sekvens klar! Kolla serverns loggar.");
    
    setTimeout(async () => {
        await browser.close();
    }, 3000);
})();