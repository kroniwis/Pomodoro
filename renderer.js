// Lógica del temporizador Pomodoro
(() => {
  const DEFAULTS = { pomodoro: 25, short: 5, long: 15 };
  const selectors = {
    time: document.getElementById("time"),
    start: document.getElementById("start"),
    pause: document.getElementById("pause"),
    reset: document.getElementById("reset"),
    modeP: document.getElementById("mode-pomodoro"),
    modeS: document.getElementById("mode-short"),
    modeL: document.getElementById("mode-long"),
    completed: document.getElementById("completed"),
    inputP: document.getElementById("input-pomo"),
    inputS: document.getElementById("input-short"),
    inputL: document.getElementById("input-long"),
    body: document.body,
  };

  class PomodoroTimer {
    constructor() {
      this.loadSettings();
      this.mode = "pomodoro";
      this.remaining = this.minutesToSeconds(this.settings.pomodoro);
      this.interval = null;
      this.running = false;
      this.sessions = parseInt(
        localStorage.getItem("pomo_sessions") || "0",
        10
      );
      this.updateCompleted();
      this._bind();
      this.updateDisplay();
      this.requestNotificationPermission();
    }

    loadSettings() {
      const saved = JSON.parse(localStorage.getItem("pomo_settings") || "null");
      this.settings = saved || { ...DEFAULTS };
      // populate inputs if present
      if (selectors.inputP) selectors.inputP.value = this.settings.pomodoro;
      if (selectors.inputS) selectors.inputS.value = this.settings.short;
      if (selectors.inputL) selectors.inputL.value = this.settings.long;
    }

    saveSettings() {
      localStorage.setItem("pomo_settings", JSON.stringify(this.settings));
    }

    _bind() {
      selectors.start.addEventListener("click", () => this.start());
      selectors.pause.addEventListener("click", () => this.pause());
      selectors.reset.addEventListener("click", () => this.reset());
      selectors.modeP.addEventListener("click", () => this.setMode("pomodoro"));
      selectors.modeS.addEventListener("click", () => this.setMode("short"));
      selectors.modeL.addEventListener("click", () => this.setMode("long"));
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.running) {
          this.pause();
        }
      });
      selectors.inputP.addEventListener("change", () => {
        this.settings.pomodoro = Math.max(
          1,
          parseInt(selectors.inputP.value || DEFAULTS.pomodoro, 10)
        );
        this.saveSettings();
        if (this.mode === "pomodoro") this.reset();
      });
      selectors.inputS.addEventListener("change", () => {
        this.settings.short = Math.max(
          1,
          parseInt(selectors.inputS.value || DEFAULTS.short, 10)
        );
        this.saveSettings();
        if (this.mode === "short") this.reset();
      });
      selectors.inputL.addEventListener("change", () => {
        this.settings.long = Math.max(
          1,
          parseInt(selectors.inputL.value || DEFAULTS.long, 10)
        );
        this.saveSettings();
        if (this.mode === "long") this.reset();
      });
    }

    minutesToSeconds(min) {
      return Math.round(min * 60);
    }
    formatTime(s) {
      const m = Math.floor(s / 60)
        .toString()
        .padStart(2, "0");
      const sec = (s % 60).toString().padStart(2, "0");
      return `${m}:${sec}`;
    }

    updateDisplay() {
      selectors.time.textContent = this.formatTime(this.remaining);
    }

    updateCompleted() {
      selectors.completed.textContent = this.sessions;
    }

    exitFullscreenMode() {
      if (selectors.body.classList.contains("fullscreen-mode")) {
        selectors.body.classList.remove("fullscreen-mode");
        selectors.body.classList.add("fullscreen-mode-exit");
        setTimeout(() => {
          selectors.body.classList.remove("fullscreen-mode-exit");
        }, 800);
      } else if (selectors.body.classList.contains("fullscreen-mode-blue")) {
        selectors.body.classList.remove("fullscreen-mode-blue");
        selectors.body.classList.add("fullscreen-mode-exit-blue");
        setTimeout(() => {
          selectors.body.classList.remove("fullscreen-mode-exit-blue");
        }, 800);
      }
    }

    setMode(mode) {
      this.mode = mode;
      this.remaining = this.minutesToSeconds(this.settings[mode]);
      this.updateDisplay();
    }

    start() {
      if (this.running) return;
      this.running = true;
      selectors.start.disabled = true;
      selectors.pause.disabled = false;
      if (this.mode === "short" || this.mode === "long") {
        selectors.body.classList.add("fullscreen-mode-blue");
      } else {
        selectors.body.classList.add("fullscreen-mode");
      }
      this.interval = setInterval(() => this.tick(), 1000);
    }
    pause() {
      if (!this.running) return;
      this.running = false;
      selectors.start.disabled = false;
      selectors.pause.disabled = true;
      this.exitFullscreenMode();
      clearInterval(this.interval);
    }
    reset() {
      this.pause();
      this.exitFullscreenMode();
      this.remaining = this.minutesToSeconds(this.settings[this.mode]);
      this.updateDisplay();
    }

    tick() {
      if (this.remaining <= 0) {
        this.onFinish();
        return;
      }
      this.remaining--;
      this.updateDisplay();
    }

    onFinish() {
      this.pause();
      this.playBeep();
      this.notify(
        `${
          this.mode === "pomodoro" ? "Pomodoro terminado" : "Descanso terminado"
        }`
      );
      if (this.mode === "pomodoro") {
        this.sessions++;
        localStorage.setItem("pomo_sessions", String(this.sessions));
        this.updateCompleted(); // after a pomodoro, default to short break
        this.setMode("short");
      } else {
        // after break, go back to pomodoro
        this.setMode("pomodoro");
      }
    }

    playBeep() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 880;
        g.gain.value = 0.05;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        setTimeout(() => {
          o.stop();
          ctx.close();
        }, 400);
      } catch (e) {
        console.warn("Audio not available", e);
      }
    }

    requestNotificationPermission() {
      if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission()
          .then(() => {})
          .catch(() => {});
      }
    }

    notify(message) {
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Pomodoro", { body: message });
        }
      } catch (e) {
        console.warn("No notifications", e);
      }
    }
  }

  // Inicializar la app
  document.addEventListener("DOMContentLoaded", () => {
    const app = new PomodoroTimer();
    // inicial UI state
    selectors.pause.disabled = true;
  });
})();
