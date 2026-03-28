import {
    clearText,
    loadFromStorage,
    saveToStorage,
    toggleElementVisibility
} from "../utils/helpers.js";

export class Voting {
    constructor(formSelector, resultSelector, errorSelector, storageKey) {
        this.form = document.querySelector(formSelector);
        this.result = document.querySelector(resultSelector);
        this.errorElement = document.querySelector(errorSelector);
        this.storageKey = storageKey;
    }

    init() {
        try {
            if (!this.form || !this.result) {
                console.log("Voting: необходимые элементы не найдены.");
                return;
            }

            this.restoreVote();

            this.form.addEventListener("submit", (event) => {
                event.preventDefault();
                this.handleSubmit();
            });

            this.form.addEventListener("change", () => {
                // Событие change используем для очистки ошибки после выбора radio-кнопки.
                clearText(this.errorElement);
            });

            console.log("Voting initialized successfully.");
        } catch (error) {
            console.log("Error in Voting.init:", error);
        }
    }

    restoreVote() {
        try {
            const savedVote = loadFromStorage(this.storageKey);

            if (!savedVote) {
                return;
            }

            toggleElementVisibility(this.form, false);
            toggleElementVisibility(this.result, true);
            this.result.textContent = `Your vote is counted. You chose: ${savedVote.player}`;

            console.log("Voting: найден сохраненный голос.");
        } catch (error) {
            console.log("Error in Voting.restoreVote:", error);
        }
    }

    handleSubmit() {
        try {
            const selectedPlayer = this.form.querySelector('input[name="player"]:checked');

            if (!selectedPlayer) {
                this.errorElement.textContent = "Please select a player before submitting.";
                return;
            }

            const voteData = {
                player: selectedPlayer.value,
                createdAt: new Date().toISOString()
            };

            saveToStorage(this.storageKey, voteData);
            toggleElementVisibility(this.form, false);
            toggleElementVisibility(this.result, true);
            this.result.textContent = `Your vote is counted. You chose: ${selectedPlayer.value}`;

            console.log("Voting: vote saved successfully.");
        } catch (error) {
            console.log("Error in Voting.handleSubmit:", error);
        }
    }
}
