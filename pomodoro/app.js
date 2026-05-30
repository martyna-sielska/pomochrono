const screens = Array.from(document.querySelectorAll(".screen"));
const taskInput = document.querySelector(".task-input");
const taskSlots = Array.from(document.querySelectorAll("[data-slot='task']"));
const timerSlots = Array.from(document.querySelectorAll("[data-slot='timer']"));
const clickSound = document.getElementById("click-sound");
const themeToggle = document.querySelector("[data-action='theme']");
const setTimerButton = document.querySelector("[data-action='set-timer']");

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

let timerId = null;
let remaining = FOCUS_SECONDS;
let currentMode = "focus";
let isPaused = false;
let wakeLock = null;

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  if (wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch (error) {
    wakeLock = null;
  }
}

function releaseWakeLock() {
  if (!wakeLock) return;
  wakeLock.release().catch(() => {});
  wakeLock = null;
}

function playClick() {
  if (!clickSound) return;
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});
}

function setScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === name);
  });
}

function setTaskText(value) {
  const text = value.trim() || "Finish that damn maths exercises";
  taskSlots.forEach((slot) => {
    slot.textContent = text;
  });
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateTimers() {
  const text = formatTime(remaining);
  timerSlots.forEach((slot) => {
    slot.textContent = text;
  });
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  releaseWakeLock();
}

function startTimer() {
  stopTimer();
  isPaused = false;
  requestWakeLock();
  timerId = setInterval(() => {
    if (remaining <= 0) {
      stopTimer();
      handleTimerEnd();
      return;
    }
    remaining -= 1;
    updateTimers();
  }, 1000);
}

function handleTimerEnd() {
  if (currentMode === "focus") {
    currentMode = "break";
    remaining = BREAK_SECONDS;
    updateTimers();
    setScreen("break");
  } else {
    currentMode = "focus";
    remaining = FOCUS_SECONDS;
    updateTimers();
    setScreen("focus");
    startTimer();
  }
}

function resetFocus() {
  currentMode = "focus";
  remaining = FOCUS_SECONDS;
  updateTimers();
}

function pauseResume() {
  if (!timerId) return;
  if (isPaused) {
    isPaused = false;
    startTimer();
    return;
  }
  isPaused = true;
  stopTimer();
}

document.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  if (!action) return;

  playClick();

  switch (action) {
    case "start":
      setScreen("task");
      break;
    case "set-timer":
      setTaskText(taskInput.value);
      currentMode = "focus";
      remaining = FOCUS_SECONDS;
      updateTimers();
      setScreen("focus");
      startTimer();
      break;
    case "pause":
      pauseResume();
      break;
    case "reset":
      stopTimer();
      resetFocus();
      setScreen("task");
      break;
    case "start-break":
      currentMode = "break";
      remaining = BREAK_SECONDS;
      updateTimers();
      startTimer();
      break;
    case "skip-break":
      stopTimer();
      currentMode = "focus";
      remaining = FOCUS_SECONDS;
      updateTimers();
      setScreen("focus");
      startTimer();
      break;
    case "fullscreen":
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      break;
    case "theme":
      document.body.classList.toggle("theme-dark");
      if (themeToggle) {
        themeToggle.textContent = document.body.classList.contains("theme-dark")
          ? "LIGHT MODE"
          : "DARK MODE";
      }
      break;
    default:
      break;
  }
});

taskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (setTimerButton) {
      setTimerButton.click();
    }
  }
});

document.addEventListener("fullscreenchange", () => {
  document.body.classList.toggle("is-fullscreen", !!document.fullscreenElement);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && timerId && !isPaused) {
    requestWakeLock();
  }
});

updateTimers();
