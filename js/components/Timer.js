import { formatTimeUnit } from "../utils/helpers.js";

export class Timer {
    constructor(selector) {
        this.timerElements = document.querySelectorAll(selector);
        this.intervalId = null;
    }

    init() {
        try {
            if (!this.timerElements.length) {
                console.log("Timer: элементы таймера не найдены.");
                return;
            }

            // Сразу обновляем таймер, чтобы пользователь увидел актуальные данные
            // без ожидания одной секунды.
            this.updateAllTimers();

            this.intervalId = setInterval(() => {
                this.updateAllTimers();
            }, 1000);

            console.log("Timer initialized successfully.");
        } catch (error) {
            console.log("Error in Timer.init:", error);
        }
    }

    updateAllTimers() {
        try {
            this.timerElements.forEach((timerElement) => {
                this.updateSingleTimer(timerElement);
            });
        } catch (error) {
            console.log("Error in Timer.updateAllTimers:", error);
        }
    }

    updateSingleTimer(timerElement) {
        try {
            const targetDate = new Date(timerElement.dataset.targetDate).getTime();
            const currentDate = Date.now();
            const difference = targetDate - currentDate;

            if (difference <= 0) {
                timerElement.innerHTML = `
                    <h4 class="match-timer__title">Match started</h4>
                `;
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / (1000 * 60)) % 60);
            const seconds = Math.floor((difference / 1000) % 60);

            timerElement.querySelector('[data-unit="days"]').textContent = formatTimeUnit(days);
            timerElement.querySelector('[data-unit="hours"]').textContent = formatTimeUnit(hours);
            timerElement.querySelector('[data-unit="minutes"]').textContent = formatTimeUnit(minutes);
            timerElement.querySelector('[data-unit="seconds"]').textContent = formatTimeUnit(seconds);
        } catch (error) {
            console.log("Error in Timer.updateSingleTimer:", error);
        }
    }
}
