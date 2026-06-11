class Tracker {
    constructor() {
        this.startTime = Date.now();
        this.clicks = [];
        this.keyStrokes = [];
        this.viewTimes = {
            view1Start: this.startTime,
            view2Start: null,
            view3Start: null
        };
        
        this.initListeners();
    }

    initListeners() {
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
    }

    recordViewTransition(viewIndex) {
        if (viewIndex === 1 && !this.viewTimes.view2Start) {
            this.viewTimes.view2Start = Date.now();
        } else if (viewIndex === 2 && !this.viewTimes.view3Start) {
            this.viewTimes.view3Start = Date.now();
        }
    }

    getTelemetryData() {
        const honeypotField = document.querySelector('input[name="honeypot"]');
        const now = Date.now();
        const timeOnStartPage = this.viewTimes.view2Start 
            ? (this.viewTimes.view2Start - this.viewTimes.view1Start) 
            : (now - this.viewTimes.view1Start);
            
        const timeOnForm = this.viewTimes.view3Start && this.viewTimes.view2Start
            ? (this.viewTimes.view3Start - this.viewTimes.view2Start)
            : (this.viewTimes.view2Start ? (now - this.viewTimes.view2Start) : 0);

        return {
            totalTime: now - this.startTime,
            timeOnStartPage: timeOnStartPage,
            timeOnForm: timeOnForm,
            timeToAction: this.viewTimes.view3Start ? (this.viewTimes.view3Start - this.startTime) : (now - this.startTime),
            clicks: this.clicks,
            keyStrokes: this.keyStrokes,
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
