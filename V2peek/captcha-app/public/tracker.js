// V2: Utökad med muskoordinater och scroll-event.
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

        this.initListeners();
    }

    initListeners() {
        document.addEventListener('mousemove', (e) => {
            this.mousePoints.push({
                x: e.clientX,
                y: e.clientY,
                t: Date.now() - this.startTime
            });
        });
        document.addEventListener('mousedown', (e) => {
            this.clicks.push({
                x: e.clientX,
                y: e.clientY,
                time: Date.now() - this.startTime,
                target: e.target.tagName
            });
        });
        document.addEventListener('keydown', (e) => {
            this.keyStrokes.push({
                key: e.key,
                time: Date.now() - this.startTime
            });
        });
        document.addEventListener('wheel', (e) => {
            this.scrollEvents.push({
                delta: e.deltaY,
                t:     Date.now() - this.startTime
            });
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

    getTelemetryData() {
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
        const scrollEvts = this.scrollEvents;
        const scrollCount = scrollEvts.length;
        let avgScrollSpeed = 0;
        if (scrollEvts.length >= 2) {
            const totalDelta = scrollEvts.reduce((sum, e) => sum + Math.abs(e.delta), 0);
            const scrollDuration = scrollEvts[scrollEvts.length - 1].t - scrollEvts[0].t;
            avgScrollSpeed = scrollDuration > 0 ? parseFloat((totalDelta / scrollDuration).toFixed(4)) : 0;
        }

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
            avgScrollSpeed,
            screen: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            userAgent: navigator.userAgent,
            webdriver: navigator.webdriver,
            honeypot: honeypotField ? honeypotField.value : null
        };
    }
}
window.tracker = new Tracker();
