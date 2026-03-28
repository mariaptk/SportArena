import { toggleElementVisibility } from "../utils/helpers.js";
import { TableSorter } from "./TableSorter.js";

export class NewsModal {
    constructor(options) {
        this.newsContainer = document.querySelector(options.newsContainerSelector);
        this.modal = document.querySelector(options.modalSelector);
        this.modalBody = document.querySelector(options.modalBodySelector);
        this.tableSorter = null;
    }

    init() {
        try {
            if (!this.newsContainer || !this.modal || !this.modalBody) {
                console.log("NewsModal: required elements not found.");
                return;
            }

            // Используем делегирование событий:
            // один обработчик на общий контейнер новостей.
            this.newsContainer.addEventListener("click", (event) => {
                const newsItem = event.target.closest(".news-item");

                if (!newsItem) {
                    return;
                }

                this.openModal(newsItem);
            });

            this.modal.addEventListener("click", (event) => {
                if (event.target.matches("[data-close-modal]")) {
                    this.closeModal();
                }
            });

            console.log("NewsModal initialized successfully.");
        } catch (error) {
            console.log("Error in NewsModal.init:", error);
        }
    }

    openModal(newsItem) {
        try {
            const title = newsItem.dataset.title || "News";
            const fullText = newsItem.dataset.fullText || "";
            const images = newsItem.dataset.images || "";
            const firstImage = images.split(",")[0]?.trim() || "";

            // Собираем содержимое модального окна через innerHTML,
            // чтобы быстро обновить большой блок подробной новости.
            this.modalBody.innerHTML = `
                <p class="news-modal__meta">SportArena News</p>
                <h3 class="modal__title" id="news-modal-title">${title}</h3>
                <div class="match-slider news-modal__slider" data-slider data-images="${images}" data-alt="${title}">
                    <button type="button" class="match-slider__button" data-direction="prev" aria-label="Previous image">&lt;</button>
                    <img src="${firstImage}" alt="${title}" class="event-card__image match-slider__image">
                    <button type="button" class="match-slider__button" data-direction="next" aria-label="Next image">&gt;</button>
                </div>
                <div class="news-modal__text">
                    ${fullText}
                </div>
            `;

            // Check if there's a table in the modal and initialize sorting
            const table = this.modalBody.querySelector("table");
            if (table) {
                // Use the table's id if available, otherwise use data-sort-enabled
                const tableId = table.id || "[data-sort-enabled]";
                this.tableSorter = new TableSorter(`#${tableId}`);
                this.tableSorter.init();
            }

            toggleElementVisibility(this.modal, true);
            this.modal.setAttribute("aria-hidden", "false");

            console.log(`NewsModal: opened news "${title}".`);
        } catch (error) {
            console.log("Error in NewsModal.openModal:", error);
        }
    }

    closeModal() {
        try {
            toggleElementVisibility(this.modal, false);
            this.modal.setAttribute("aria-hidden", "true");
            console.log("NewsModal: modal closed.");
        } catch (error) {
            console.log("Error in NewsModal.closeModal:", error);
        }
    }
}
