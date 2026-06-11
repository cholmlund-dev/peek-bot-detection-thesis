// V2: Interaktionsanalys. Kontrollerar förutom grunderna även hur användaren rör musen och scrollar.
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

function evaluateSession(data) {
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
                        data.speedVariance < 5 &&
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
        `${data.scrollCount !== undefined ? data.scrollCount : 0} events (min 3)`,
        tooFewScrolls ? 50 : 0
    );
    const fastScroll = typeof data.scrollCount === 'number' && data.scrollCount >= 1 &&
                       typeof data.avgScrollSpeed === 'number' && data.avgScrollSpeed > 15;
    addDetail(
        "Robotisk scrollhastighet",
        fastScroll,
        `${data.avgScrollSpeed !== undefined ? data.avgScrollSpeed : 0} px/ms`,
        fastScroll ? 40 : 0
    );

    result.isBot = score >= 50;
    result.totalScore = score;
    return result;
}

app.post('/api/verify', (req, res) => {
    const evaluation = evaluateSession(req.body);

    console.log(`\n[${new Date().toISOString()}] SESSION ANALYSIS`);
    console.log(`Version: V2 - Interaktionsanalys`);
    console.log(`Resultat: ${evaluation.isBot ? 'BOT DETECTED' : 'HUMAN (Godkänd)'} (Score: ${evaluation.totalScore}, Gräns: 50)`);
    console.log(`Totaltid: ${req.body.totalTime || 0} ms`);

    const v1Details = [];
    const v2Details = [];

    evaluation.details.forEach(d => {
        if (['Webdriver', 'Snabb Totaltid', 'Tid på förstasida', 'Tid i formulär', 'Honeypot'].includes(d.name)) {
            v1Details.push(d);
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
    console.log();

    res.json({ success: true, isBot: evaluation.isBot, reasons: evaluation.reasons });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
