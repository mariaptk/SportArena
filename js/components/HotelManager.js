import {
    clearText,
    toggleElementVisibility,
    validateEmail,
    validateRequired
} from "../utils/helpers.js";

export class HotelManager {
    constructor(options) {
        this.hotelList = document.querySelector(options.hotelListSelector);
        this.loadMoreButton = document.querySelector(options.loadMoreButtonSelector);
        this.modal = document.querySelector(options.modalSelector);
        this.form = document.querySelector(options.formSelector);
        this.hotelNameElement = document.querySelector(options.hotelNameSelector);
        this.hotelInput = document.querySelector(options.hotelInputSelector);
        this.nameInput = document.querySelector(options.nameInputSelector);
        this.emailInput = document.querySelector(options.emailInputSelector);
        this.nameError = document.querySelector(options.nameErrorSelector);
        this.emailError = document.querySelector(options.emailErrorSelector);
        this.successMessage = document.querySelector(options.successSelector);

        this.additionalHotels = [
            {
                name: "Victory Plaza Hotel",
                description: "Modern hotel with a gym, transfer to the arena and breakfast included.",
                image: "images/hotel.jfif",
                alt: "Victory Plaza Hotel building",
                rating: "4.7"
            },
            {
                name: "Champion's Rest Hotel",
                description: "Comfortable rooms for fans who want to stay close to the main venue.",
                image: "images/hotel2.png",
                alt: "Champion's Rest Hotel rooms",
                rating: "4.6"
            }
        ];
    }

    init() {
        try {
            if (!this.hotelList || !this.modal || !this.form) {
                console.log("HotelManager: required elements not found.");
                return;
            }

            if (this.loadMoreButton && this.loadMoreButton.tagName === "BUTTON") {
                this.loadMoreButton.addEventListener("click", () => {
                    this.renderAdditionalHotels();
                });
            }

            this.hotelList.addEventListener("click", (event) => {
                const bookButton = event.target.closest("[data-book-hotel]");

                if (!bookButton) {
                    return;
                }

                this.openModal(bookButton.dataset.bookHotel);
            });

            this.modal.addEventListener("click", (event) => {
                if (event.target.matches("[data-close-modal]")) {
                    this.closeModal();
                }
            });

            this.nameInput.addEventListener("input", () => {
                this.validateName();
            });

            this.emailInput.addEventListener("input", () => {
                this.validateEmailField();
            });

            this.form.addEventListener("submit", (event) => {
                event.preventDefault();
                this.handleBooking();
            });

            console.log("HotelManager initialized successfully.");
        } catch (error) {
            console.log("Error in HotelManager.init:", error);
        }
    }

    renderAdditionalHotels() {
        try {
            if (this.loadMoreButton.dataset.loaded === "true") {
                console.log("Additional hotels have already been added previously.");
                return;
            }

            this.additionalHotels.forEach((hotel) => {
                // Создаем карточку через createElement по требованию задания.
                const hotelCard = document.createElement("div");
                hotelCard.className = "hotel-card";
                hotelCard.setAttribute("itemscope", "");
                hotelCard.setAttribute("itemtype", "https://schema.org/Hotel");

                // Внутреннее наполнение вставляем через innerHTML,
                // чтобы продемонстрировать еще один способ динамического DOM.
                hotelCard.innerHTML = `
                    <h4 class="hotel-card__name" itemprop="name">${hotel.name}</h4>
                    <p class="hotel-card__desc" itemprop="description">${hotel.description}</p>
                    <img src="${hotel.image}" alt="${hotel.alt}" class="hotel-card__image">
                    <p class="hotel-card__rating">Rating:
                        <span itemprop="starRating" itemscope itemtype="https://schema.org/Rating">
                            <span itemprop="ratingValue">${hotel.rating}</span>/5
                        </span>
                    </p>
                    <button type="button" class="hotel-card__link hotel-card__button" data-book-hotel="${hotel.name}">Book</button>
                `;

                this.hotelList.append(hotelCard);
            });

            this.loadMoreButton.dataset.loaded = "true";
            this.loadMoreButton.textContent = "Больше отелей нет";
            this.loadMoreButton.disabled = true;

            console.log("HotelManager: additional hotels added to DOM.");
        } catch (error) {
            console.log("Error in HotelManager.renderAdditionalHotels:", error);
        }
    }

    openModal(hotelName) {
        try {
            this.form.reset();
            clearText(this.nameError);
            clearText(this.emailError);
            clearText(this.successMessage);

            this.hotelNameElement.textContent = `Вы выбрали: ${hotelName}`;
            this.hotelInput.value = hotelName;

            toggleElementVisibility(this.modal, true);
            this.modal.setAttribute("aria-hidden", "false");

            console.log(`HotelManager: modal opened for hotel ${hotelName}.`);
        } catch (error) {
            console.log("Error in HotelManager.openModal:", error);
        }
    }

    closeModal() {
        try {
            toggleElementVisibility(this.modal, false);
            this.modal.setAttribute("aria-hidden", "true");
            console.log("HotelManager: modal closed.");
        } catch (error) {
            console.log("Error in HotelManager.closeModal:", error);
        }
    }

    validateName() {
        try {
            if (!validateRequired(this.nameInput.value)) {
                this.nameError.textContent = "Please enter a name for booking.";
                return false;
            }

            clearText(this.nameError);
            return true;
        } catch (error) {
            console.log("Error in HotelManager.validateName:", error);
            return false;
        }
    }

    validateEmailField() {
        try {
            if (!validateRequired(this.emailInput.value)) {
                this.emailError.textContent = "Please enter email.";
                return false;
            }

            if (!validateEmail(this.emailInput.value)) {
                this.emailError.textContent = "Please enter a valid email.";
                return false;
            }

            clearText(this.emailError);
            return true;
        } catch (error) {
            console.log("Error in HotelManager.validateEmailField:", error);
            return false;
        }
    }

    handleBooking() {
        try {
            const isNameValid = this.validateName();
            const isEmailValid = this.validateEmailField();

            if (!isNameValid || !isEmailValid) {
                return;
            }

            this.successMessage.textContent = `Booking for "${this.hotelInput.value}" successfully completed!`;
            console.log("HotelManager: booking form submitted successfully.");

            setTimeout(() => {
                this.closeModal();
            }, 1500);
        } catch (error) {
            console.log("Error in HotelManager.handleBooking:", error);
        }
    }
}
