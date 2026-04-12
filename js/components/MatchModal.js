import { toggleElementVisibility } from "../utils/helpers.js";

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export class MatchModal {
    constructor(options) {
        this.matchesContainer = document.querySelector(options.matchesContainerSelector);
        this.modal = document.querySelector(options.modalSelector);
        this.modalBody = document.querySelector(options.modalBodySelector);
        this.handleKeydown = this.handleKeydown.bind(this);
    }

    init() {
        if (!this.matchesContainer || !this.modal || !this.modalBody) {
            console.log("MatchModal: required elements not found.");
            return;
        }

        this.matchesContainer.addEventListener("click", (event) => {
            const trigger = event.target.closest("[data-match-payload]");
            if (!trigger) return;

            this.openModal(trigger.dataset.matchPayload);
        });

        this.modal.addEventListener("click", (event) => {
            if (event.target.matches("[data-close-modal]")) {
                this.closeModal();
            }
        });

        document.addEventListener("keydown", this.handleKeydown);
        console.log("MatchModal initialized successfully.");
    }

    handleKeydown(event) {
        if (event.key === "Escape" && !this.modal.classList.contains("is-hidden")) {
            this.closeModal();
        }
    }

    openModal(payload) {
        try {
            const match = JSON.parse(decodeURIComponent(payload));
            const score = match.score || "vs";
            const stage = match.stage ? `<p class="match-modal__line"><strong>Stage:</strong> ${escapeHtml(match.stage)}</p>` : "";

            this.modalBody.innerHTML = `
                <p class="news-modal__meta">Match Details</p>
                <h3 class="modal__title" id="match-modal-title">${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}</h3>
                <p class="modal__subtitle">${escapeHtml(match.competition)}</p>
                <div class="match-modal__scoreboard">
                    <div class="match-modal__team">
                        ${match.homeCrest ? `<img src="${escapeHtml(match.homeCrest)}" alt="${escapeHtml(match.homeTeam)} crest" class="match-modal__crest">` : ""}
                        <span>${escapeHtml(match.homeTeam)}</span>
                    </div>
                    <div class="match-modal__score">${escapeHtml(score)}</div>
                    <div class="match-modal__team">
                        ${match.awayCrest ? `<img src="${escapeHtml(match.awayCrest)}" alt="${escapeHtml(match.awayTeam)} crest" class="match-modal__crest">` : ""}
                        <span>${escapeHtml(match.awayTeam)}</span>
                    </div>
                </div>
                <div class="match-modal__details">
                    <p class="match-modal__line"><strong>Status:</strong> ${escapeHtml(match.statusLabel)}</p>
                    <p class="match-modal__line"><strong>Date:</strong> ${escapeHtml(match.dateLabel)}</p>
                    ${stage}
                </div>
            `;

            toggleElementVisibility(this.modal, true);
            this.modal.setAttribute("aria-hidden", "false");
        } catch (error) {
            console.log("Error in MatchModal.openModal:", error);
        }
    }

    closeModal() {
        toggleElementVisibility(this.modal, false);
        this.modal.setAttribute("aria-hidden", "true");
    }
}
