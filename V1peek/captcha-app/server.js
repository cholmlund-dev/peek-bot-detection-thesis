// V1: Utvärderar grundläggande skydd, tid, webdriver-flagga och honeypot.
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

    // Helper for adding score details
    const addDetail = (name, isBotIndicator, value, points) => {
        result.details.push({ name, isBotIndicator, value, points });
        if (isBotIndicator) {
            score += points;
            result.reasons.push(name);
        }
    };

    // Kontrollerar om webdriver-flaggan är satt (vanligt för enkla bottar)
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

    // Kollar om det osynliga honeypot-fältet har fyllts i

    const honeypotTrigged = data.honeypot && data.honeypot.trim() !== '';
    addDetail(
        "Honeypot", 
        !!honeypotTrigged, 
        honeypotTrigged ? "Ifylld" : "Tom", 
        honeypotTrigged ? 100 : 0
    );

    result.isBot = score >= 50;
    result.totalScore = score;
    return result;
}

app.post('/api/verify', (req, res) => {
    const evaluation = evaluateSession(req.body);
    
    console.log(`\n[${new Date().toISOString()}] SESSION ANALYSIS`);
    console.log(`Version: V1 - Grundläggande analys`);
    console.log(`Resultat: ${evaluation.isBot ? 'BOT DETECTED' : 'HUMAN (Godkänd)'} (Score: ${evaluation.totalScore}, Gräns: 50)`);
    console.log(`Totaltid: ${req.body.totalTime || 0} ms`);

    console.log(`\n-- V1: Grundläggande analys --`);
    evaluation.details.forEach(d => {
        console.log(`${d.name}: ${d.value} (+${d.points}p)`);
    });
    console.log();
    
    res.json({ success: true, isBot: evaluation.isBot, reasons: evaluation.reasons });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});