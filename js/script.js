import { HotelManager } from "./components/HotelManager.js";
import { NewsModal } from "./components/NewsModal.js";
import { Slider } from "./components/Slider.js";
import { TableSorter } from "./components/TableSorter.js";
import { Timer } from "./components/Timer.js";
import { Voting } from "./components/Voting.js";

document.addEventListener("DOMContentLoaded", () => {
    try {
        console.log("DOMContentLoaded: SportArena components initialization started.");

        const tableSorter = new TableSorter("#league-table");
        const timer = new Timer("[data-timer]");
        const voting = new Voting("#voting-form", "#voting-result", "#voting-error", "sportarena-vote-v2");
        const hotelManager = new HotelManager({
            hotelListSelector: "[data-hotel-list]",
            loadMoreButtonSelector: "#load-more-hotels",
            modalSelector: "#booking-modal",
            formSelector: "#booking-form",
            hotelNameSelector: "#booking-hotel-name",
            hotelInputSelector: "#booking-hotel-input",
            nameInputSelector: "#booking-name",
            emailInputSelector: "#booking-email",
            nameErrorSelector: "#booking-name-error",
            emailErrorSelector: "#booking-email-error",
            successSelector: "#booking-success"
        });
        const newsModal = new NewsModal({
            newsContainerSelector: ".news",
            modalSelector: "#news-modal",
            modalBodySelector: "#news-modal-body"
        });
        const slider = new Slider("[data-slider]");

        tableSorter.init();
        timer.init();
        voting.init();
        hotelManager.init();
        newsModal.init();
        slider.init();

        console.log("DOMContentLoaded: all SportArena components initialized.");
    } catch (error) {
        console.log("Global application initialization error:", error);
    }
});
