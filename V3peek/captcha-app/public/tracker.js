// V3: Utökad med mätning av rendering (Canvas/Audio) samt avläsning av hårdvara och språk.
class Tracker {
    constructor() {
        this.startTime = Date.now();
        this.clicks = [];
        this.keyStrokes = [];
        this.mousePoints = [];
        this.scrollEvents = [];
        this.viewTimes = {
            view1Start: this.startTime,
            view2Start: null,
            view3Start: null
        };
        this.allEventsTrusted = true;
        this.performanceNowNative = performance.now.toString().indexOf('[native code]') !== -1;

        this.initListeners();
    }

    initListeners() {
        document.addEventListener('mousemove', (e) => {
            if (!e.isTrusted) this.allEventsTrusted = false;
            this.mousePoints.push({
                x: e.clientX,
                y: e.clientY,
                t: Date.now() - this.startTime
            });
        });
        document.addEventListener('click', (e) => {
            if (!e.isTrusted) this.allEventsTrusted = false;
            this.clicks.push({
                x: e.clientX,
                y: e.clientY,
                time: Date.now() - this.startTime,
                target: e.target.tagName,
                isTrusted: e.isTrusted
            });
        });
        document.addEventListener('keydown', (e) => {
            if (!e.isTrusted) this.allEventsTrusted = false;
            this.keyStrokes.push({
                key: e.key,
                time: Date.now() - this.startTime
            });
        });
        let _lastScrollTime = null;
        let _lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            const now = Date.now();
            const t = now - this.startTime;
            const currentY = window.scrollY;
            const delta = Math.abs(currentY - _lastScrollY);
            const dt = _lastScrollTime !== null ? (now - _lastScrollTime) : 1;
            const speed = delta / Math.max(dt, 1);
            this.scrollEvents.push({ delta, t, speed });
            _lastScrollTime = now;
            _lastScrollY = currentY;
        }, { passive: true });
    }

    recordViewTransition(viewIndex) {
        if (viewIndex === 1 && !this.viewTimes.view2Start) {
            this.viewTimes.view2Start = Date.now();
        } else if (viewIndex === 2 && !this.viewTimes.view3Start) {
            this.viewTimes.view3Start = Date.now();
        }
    }

    _calcPathLength(points) {
        let len = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            len += Math.sqrt(dx * dx + dy * dy);
        }
        return len;
    }

    _calcStraightLineRatio(points) {
        if (points.length < 2) return 1;
        const first = points[0];
        const last = points[points.length - 1];
        const dx = last.x - first.x;
        const dy = last.y - first.y;
        const directDist = Math.sqrt(dx * dx + dy * dy);
        const pathLen = this._calcPathLength(points);
        if (pathLen === 0) return 1;
        return directDist / pathLen;
    }

    _calcSpeedStats(points) {
        if (points.length < 2) return { avgSpeed: 0, variance: 0 };
        const speeds = [];
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const dt = (points[i].t - points[i - 1].t) || 1;
            speeds.push(dist / dt);
        }
        const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const variance = speeds.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / speeds.length;
        return { avgSpeed: avg, variance };
    }

    _didMouseMoveBeforeClick(captchaBtn) {
        const captchaClick = this.clicks.find(c => {
            const rect = captchaBtn ? captchaBtn.getBoundingClientRect() : null;
            if (!rect) return c.target === 'BUTTON';
            return c.x >= rect.left && c.x <= rect.right &&
                   c.y >= rect.top && c.y <= rect.bottom;
        });
        if (!captchaClick) return this.mousePoints.length > 0;
        return this.mousePoints.some(p => p.t < captchaClick.time);
    }

    async getV3Fingerprints() {
        const data = {
            hardwareConcurrency: navigator.hardwareConcurrency || 0,
            deviceMemory: navigator.deviceMemory || 0,
            canvasHash: null,
            canvasLatency: 0,
            audioHash: null,
            audioLatency: 0,
            allEventsTrusted: this.allEventsTrusted
        };
        const canvasStart = performance.now();
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 50;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            ctx.textBaseline = "top";
            ctx.font = "14px 'Arial'";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = "#069";
            ctx.fillText("C4P7CH4!", 2, 15);
            ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
            ctx.fillText("C4P7CH4!", 4, 17);
            
            const dataURL = canvas.toDataURL();
            let hash = 0;
            for (let i = 0; i < dataURL.length; i++) {
                const char = dataURL.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            data.canvasHash = hash.toString();
        } catch (e) {
            data.canvasHash = "error";
        }
        data.canvasLatency = performance.now() - canvasStart;
        const audioStart = performance.now();
        try {
            const OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
            if (OfflineAudioContext) {
                const context = new OfflineAudioContext(1, 44100, 44100);
                const oscillator = context.createOscillator();
                oscillator.type = "triangle";
                oscillator.frequency.setValueAtTime(10000, context.currentTime);
                
                const compressor = context.createDynamicsCompressor();
                compressor.threshold.setValueAtTime(-50, context.currentTime);
                compressor.knee.setValueAtTime(40, context.currentTime);
                compressor.ratio.setValueAtTime(12, context.currentTime);
                compressor.attack.setValueAtTime(0, context.currentTime);
                compressor.release.setValueAtTime(0.25, context.currentTime);
                
                oscillator.connect(compressor);
                compressor.connect(context.destination);
                oscillator.start(0);
                const buffer = await new Promise((resolve, reject) => {
                    context.oncomplete = e => resolve(e.renderedBuffer);
                    context.startRendering().then(resolve).catch(reject);
                });
                
                let audioHash = 0;
                const channelData = buffer.getChannelData(0);
                for (let i = 4500; i < 5000; i++) {
                    audioHash += Math.abs(channelData[i]);
                }
                data.audioHash = audioHash.toString();
            } else {
                data.audioHash = "not_supported";
            }
        } catch (e) {
            data.audioHash = "error";
        }
        data.audioLatency = performance.now() - audioStart;

        return data;
    }

    async getTelemetryData() {
        const honeypotField = document.querySelector('input[name="honeypot"]');
        const captchaBtn = document.getElementById('btn-captcha');
        const now = Date.now();
        const timeOnStartPage = this.viewTimes.view2Start
            ? (this.viewTimes.view2Start - this.viewTimes.view1Start)
            : (now - this.viewTimes.view1Start);

        const timeOnForm = this.viewTimes.view3Start && this.viewTimes.view2Start
            ? (this.viewTimes.view3Start - this.viewTimes.view2Start)
            : (this.viewTimes.view2Start ? (now - this.viewTimes.view2Start) : 0);
        const pts = this.mousePoints;
        const pathLength = this._calcPathLength(pts);
        const straightLineRatio = this._calcStraightLineRatio(pts);
        const { avgSpeed, variance: speedVariance } = this._calcSpeedStats(pts);
        const mouseMovedBeforeClick = this._didMouseMoveBeforeClick(captchaBtn);
        const scrollCount = this.scrollEvents.length;
        const scrollSpeeds = this.scrollEvents.map(e => e.speed);
        const maxScrollSpeed = scrollSpeeds.length > 0 ? Math.max(...scrollSpeeds) : 0;
        const avgScrollSpeed = scrollSpeeds.length > 0
            ? scrollSpeeds.reduce((a, b) => a + b, 0) / scrollSpeeds.length
            : 0;
        const scrollSpeedVariance = scrollSpeeds.length > 1
            ? scrollSpeeds.reduce((sum, s) => sum + Math.pow(s - avgScrollSpeed, 2), 0) / scrollSpeeds.length
            : 0;

        const v3Data = await this.getV3Fingerprints();

        return {
            totalTime: now - this.startTime,
            timeOnStartPage,
            timeOnForm,
            timeToAction: this.viewTimes.view3Start
                ? (this.viewTimes.view3Start - this.startTime)
                : (now - this.startTime),
            clicks: this.clicks,
            keyStrokes: this.keyStrokes,
            mouseMoveCount: pts.length,
            mousePathLength: Math.round(pathLength),
            avgMouseSpeed: parseFloat(avgSpeed.toFixed(4)),
            speedVariance: parseFloat(speedVariance.toFixed(4)),
            straightLineRatio: parseFloat(straightLineRatio.toFixed(4)),
            mouseMovedBeforeClick,
            scrollCount,
            maxScrollSpeed: parseFloat(maxScrollSpeed.toFixed(4)),
            avgScrollSpeed: parseFloat(avgScrollSpeed.toFixed(4)),
            scrollSpeedVariance: parseFloat(scrollSpeedVariance.toFixed(4)),
            screen: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            userAgent: navigator.userAgent,
            webdriver: navigator.webdriver,
            honeypot: honeypotField ? honeypotField.value : null,
            performanceNowNative: this.performanceNowNative,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language || navigator.userLanguage,
            ...v3Data
        };
    }
}
window.tracker = new Tracker();
