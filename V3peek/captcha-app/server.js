// V3:Teknisk profilering och Nätverksanalys. Granskar hårdvara, rendering och IP.
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
const verifyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1',
    message: { success: false, isBot: true, reasons: ['Rate limit exceeded'] }
});

// Utvärderar sessionen baserat på insamlad data från klienten och IP-analys
function evaluateSession(data, geoIp) {
    let result = {
        isBot: false,
        reasons: [],
        details: []
    };

    let score = 0;

    const addDetail = (name, isBotIndicator, value, points) => {
        result.details.push({ name, isBotIndicator, value, points });
        if (isBotIndicator) {
            score += points;
            result.reasons.push(name);
        }
    };
    const hasWebdriver = data.webdriver === true;
    addDetail(
        "Webdriver",
        hasWebdriver,
        hasWebdriver ? "Detekterad" : "Nej",
        hasWebdriver ? 100 : 0
    );
    const quickAction = typeof data.timeToAction === 'number' && data.timeToAction < 2000;
    addDetail(
        "Snabb Totaltid",
        quickAction,
        `${data.timeToAction !== undefined ? data.timeToAction : 0} ms`,
        quickAction ? 40 : 0
    );
    const quickStartPage = typeof data.timeOnStartPage === 'number' && data.timeOnStartPage < 500;
    addDetail(
        "Tid på förstasida",
        quickStartPage,
        `${data.timeOnStartPage !== undefined ? data.timeOnStartPage : 0} ms`,
        quickStartPage ? 30 : 0
    );
    const quickForm = typeof data.timeOnForm === 'number' && data.timeOnForm < 1500;
    addDetail(
        "Tid i formulär",
        quickForm,
        `${data.timeOnForm !== undefined ? data.timeOnForm : 0} ms`,
        quickForm ? 60 : 0
    );
    const honeypotTrigged = data.honeypot && data.honeypot.trim() !== '';
    addDetail(
        "Honeypot",
        !!honeypotTrigged,
        honeypotTrigged ? "Ifylld" : "Tom",
        honeypotTrigged ? 100 : 0
    );
    const tooFewMoves = typeof data.mouseMoveCount === 'number' && data.mouseMoveCount < 15;
    addDetail(
        "För få musrörelser",
        tooFewMoves,
        `${data.mouseMoveCount !== undefined ? data.mouseMoveCount : 0} händelser`,
        tooFewMoves ? 50 : 0
    );
    const shortPath = typeof data.mousePathLength === 'number' && data.mousePathLength < 50 && !tooFewMoves;
    addDetail(
        "För kort musbana",
        shortPath,
        `${data.mousePathLength !== undefined ? data.mousePathLength : 0} px`,
        shortPath ? 30 : 0
    );
    const straightLine = typeof data.straightLineRatio === 'number' && data.straightLineRatio > 0.98 && !tooFewMoves;
    addDetail(
        "Robotisk rätlinje",
        straightLine,
        `ratio ${data.straightLineRatio !== undefined ? data.straightLineRatio : 0}`,
        straightLine ? 35 : 0
    );
    const enoughEvents = typeof data.mouseMoveCount === 'number' && data.mouseMoveCount >= 10;
    const lowSpeedVar = enoughEvents &&
                        typeof data.speedVariance === 'number' &&
                        data.speedVariance < 1 &&
                        !tooFewMoves;
    addDetail(
        "Låg hastighetsvarians",
        lowSpeedVar,
        enoughEvents ? `varians ${data.speedVariance !== undefined ? data.speedVariance : 0}` : `${data.mouseMoveCount !== undefined ? data.mouseMoveCount : 0} event (min 10)`,
        lowSpeedVar ? 25 : 0
    );
    const noMoveBeforeClick = data.mouseMovedBeforeClick === false;
    addDetail(
        "Ingen musrörelse före klick",
        noMoveBeforeClick,
        noMoveBeforeClick ? "Saknas" : "Finns",
        noMoveBeforeClick ? 30 : 0
    );
    const tooFewScrolls = typeof data.scrollCount === 'number' && data.scrollCount < 3;
    addDetail(
        "För få scrollningar",
        tooFewScrolls,
        `${data.scrollCount !== undefined ? data.scrollCount : 0} scrolls`,
        tooFewScrolls ? 60 : 0
    );
    const hasScrollData = typeof data.scrollCount === 'number' && data.scrollCount > 0;
    const instantScroll = hasScrollData && typeof data.maxScrollSpeed === 'number' && data.maxScrollSpeed > 50;
    addDetail(
        "Omedelbar scrollhastighet",
        instantScroll,
        hasScrollData ? `max ${data.maxScrollSpeed !== undefined ? data.maxScrollSpeed : 0} px/ms` : "N/A",
        instantScroll ? 50 : 0
    );
    const enoughScrolls = typeof data.scrollCount === 'number' && data.scrollCount >= 3;
    const constantScrollSpeed = enoughScrolls &&
                                typeof data.scrollSpeedVariance === 'number' &&
                                data.scrollSpeedVariance < 0.1 &&
                                !tooFewScrolls;
    addDetail(
        "Konstant scrollhastighet",
        constantScrollSpeed,
        enoughScrolls ? `varians ${data.scrollSpeedVariance !== undefined ? data.scrollSpeedVariance : 0}` : `${data.scrollCount !== undefined ? data.scrollCount : 0} scrolls (min 3)`,
        constantScrollSpeed ? 25 : 0
    );
    const untrustedEvents = data.allEventsTrusted === false;
    addDetail(
        "Icke-betrodda händelser (V3)",
        untrustedEvents,
        untrustedEvents ? "Script-triggat" : "Äkta",
        untrustedEvents ? 100 : 0
    );
    const perfNowPatched = data.performanceNowNative === false;
    addDetail(
        "performance.now Patchad (V3)",
        perfNowPatched,
        perfNowPatched ? "Patchad (Bot)" : "Native (OK)",
        perfNowPatched ? 100 : 0
    );
    const hwCores = data.hardwareConcurrency || 0;
    const hwMem = data.deviceMemory || 0;
    const lowHw = (hwCores > 0 && hwCores < 4) || (hwMem > 0 && hwMem <= 1);
    addDetail(
        "Låg Hårdvara (V3)",
        lowHw,
        `CPU: ${hwCores}, RAM: ${hwMem}GB`,
        lowHw ? 40 : 0
    );
    const zeroHw = hwCores === 0 || hwMem === 0;
    addDetail(
        "Saknad Hårdvara (V3)",
        zeroHw,
        "N/A",
        zeroHw ? 50 : 0
    );
    const canvasLatency = data.canvasLatency || 0;
    const canvasError = data.canvasHash === "error" || !data.canvasHash;
    const highCanvasLatency = canvasLatency > 20;
    addDetail(
        "Canvas Error (V3)",
        canvasError,
        canvasError ? "Misslyckades" : "OK",
        canvasError ? 100 : 0
    );
    if (!canvasError) {
        addDetail(
            "Canvas Latency (V3)",
            highCanvasLatency,
            `${canvasLatency.toFixed(2)} ms`,
            highCanvasLatency ? 85 : 0
        );
    }
    const audioLatency = data.audioLatency || 0;
    const audioError = data.audioHash === "error" || data.audioHash === "not_supported" || !data.audioHash;
    const highAudioLatency = audioLatency > 150;
    addDetail(
        "Audio Error (V3)",
        audioError,
        audioError ? "Misslyckades/Stöds ej" : "OK",
        audioError ? 50 : 0
    );
    if (!audioError) {
        addDetail(
            "Audio Latency (V3)",
            highAudioLatency,
            `${audioLatency.toFixed(2)} ms`,
            highAudioLatency ? 40 : 0
        );
    }
    const isDatacenter = geoIp.type === 'Datacenter';
    addDetail(
        "Datacenter-IP (V3)",
        isDatacenter,
        isDatacenter ? "Datacenter" : "Bredband (OK)",
        isDatacenter ? 40 : 0
    );
    const clientTz = data.timezone || 'Okänd';
    const tzMismatch = clientTz !== geoIp.timezone;
    addDetail(
        "Tidszon-motsägelse (V3)",
        tzMismatch,
        tzMismatch ? `IP: ${geoIp.timezone} vs Klient: ${clientTz}` : "Matchar (OK)",
        tzMismatch ? 50 : 0
    );
    const clientLang = data.language ? data.language.toLowerCase() : '';
    const langMismatch = geoIp.country === 'SE' && !clientLang.includes('sv');
    addDetail(
        "Språk-motsägelse (V3)",
        langMismatch,
        langMismatch ? `IP: ${geoIp.country} vs Klient: ${data.language}` : "Matchar (OK)",
        langMismatch ? 30 : 0
    );

    result.isBot = score >= 50;
    result.totalScore = score;
    return result;
}

// Hanterar API-anrop från klienten och slår upp IP-adressen.
app.post('/api/verify', verifyLimiter, async (req, res) => {
    let geoIp = { type: 'Unknown', country: 'Unknown', timezone: 'Unknown' };
    
    try {
        let lookupIp = req.ip;
        if (lookupIp === '127.0.0.1' || lookupIp === '::1' || lookupIp === '::ffff:127.0.0.1') {
            lookupIp = ''; 
        }
        
        const response = await fetch(`http://ip-api.com/json/${lookupIp}?fields=status,countryCode,timezone,hosting`);
        const apiData = await response.json();
        
        if (apiData.status === 'success') {
            geoIp = {
                type: apiData.hosting ? 'Datacenter' : 'Bredband',
                country: apiData.countryCode,
                timezone: apiData.timezone
            };
        }
    } catch (e) {
        console.error("GeoIP lookup failed:", e.message);
    }

    const evaluation = evaluateSession(req.body, geoIp);

    console.log(`\n[${new Date().toISOString()}] SESSION ANALYSIS`);
    console.log(`Version: V3 - Webbläsarintegritet & Nätverksanalys`);
    console.log(`Resultat: ${evaluation.isBot ? 'BOT DETECTED' : 'HUMAN (Godkänd)'} (Score: ${evaluation.totalScore}, Gräns: 50)`);
    console.log(`IP-adress: ${req.ip}`);
    console.log(`Totaltid: ${req.body.totalTime || 0} ms`);

    const v1Details = [];
    const v2Details = [];
    const v3Details = [];

    evaluation.details.forEach(d => {
        if (['Webdriver', 'Snabb Totaltid', 'Tid på förstasida', 'Tid i formulär', 'Honeypot'].includes(d.name)) {
            v1Details.push(d);
        } else if (d.name.includes('(V3)')) {
            v3Details.push(d);
        } else {
            v2Details.push(d);
        }
    });

    if (v1Details.length > 0) {
        console.log(`\n-- V1: Grundläggande analys --`);
        v1Details.forEach(d => console.log(`${d.name}: ${d.value} (+${d.points}p)`));
    }
    if (v2Details.length > 0) {
        console.log(`\n-- V2: Interaktionsanalys --`);
        v2Details.forEach(d => console.log(`${d.name}: ${d.value} (+${d.points}p)`));
    }
    if (v3Details.length > 0) {
        console.log(`\n-- V3: Webbläsarintegritet --`);
        v3Details.forEach(d => console.log(`${d.name}: ${d.value} (+${d.points}p)`));
    }
    console.log();

    res.json({ success: true, isBot: evaluation.isBot, reasons: evaluation.reasons });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
