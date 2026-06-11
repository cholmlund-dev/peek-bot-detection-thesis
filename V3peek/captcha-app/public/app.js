document.addEventListener('DOMContentLoaded', () => {
    const views = [
        document.getElementById('view-1'),
        document.getElementById('view-2'),
        document.getElementById('view-3')
    ];

    const btnStart = document.getElementById('btn-start-register');
    const form = document.getElementById('registration-form');
    const btnCaptcha = document.getElementById('btn-captcha');

    function showView(index) {
        views.forEach((v, i) => {
            if (i === index) {
                v.style.display = 'block';
                setTimeout(() => v.classList.add('active'), 10);
            } else {
                v.style.display = 'none';
                v.classList.remove('active');
            }
        });
        window.scrollTo({ top: 0, behavior: 'instant' });
        if (window.tracker && typeof window.tracker.recordViewTransition === 'function') {
            window.tracker.recordViewTransition(index);
        }
    }

    btnStart.addEventListener('click', () => showView(1));

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        showView(2);
    });

    btnCaptcha.addEventListener('click', async () => {
        const trackingData = await window.tracker.getTelemetryData();
        const resultMsg = document.getElementById('result-message');
        const pMsg = resultMsg.querySelector('p');

        btnCaptcha.disabled = true;
        pMsg.textContent = "Verifierar...";
        resultMsg.classList.remove('hidden');
        
        try {
            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(trackingData)
            });

            const data = await response.json();

            if (data.isBot) {
                btnCaptcha.style.backgroundColor = "#ff4d4d";
                pMsg.textContent = "BOT DETEKTERAD: " + data.reasons.join(", ");
                pMsg.style.color = "#ff4d4d";
            } else {
                btnCaptcha.style.backgroundColor = "#4caf50";
                pMsg.textContent = "Verifiering godkänd! Du är en människa.";
                pMsg.style.color = "#4caf50";
            }
        } catch (error) {
            pMsg.textContent = "Kunde inte ansluta till servern.";
        }
    });
});
