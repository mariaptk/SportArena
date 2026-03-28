export class Slider {
    constructor(selector) {
        this.selector = selector;
    }

    init() {
        try {
            // Используем делегирование на документ,
            // чтобы слайдер работал и у динамически созданных элементов.
            document.addEventListener("click", (event) => {
                const button = event.target.closest("[data-direction]");

                if (!button) {
                    return;
                }

                const slider = button.closest(this.selector);

                if (!slider) {
                    return;
                }

                if (!slider.dataset.currentIndex) {
                    slider.dataset.currentIndex = "0";
                }

                this.changeSlide(slider, button.dataset.direction);
            });

            console.log("Slider initialized successfully.");
        } catch (error) {
            console.log("Error in Slider.init:", error);
        }
    }

    changeSlide(slider, direction) {
        try {
            const imageElement = slider.querySelector(".match-slider__image");
            const images = slider.dataset.images.split(",");
            const altText = slider.dataset.alt || "Спортивная фотография";
            let currentIndex = Number(slider.dataset.currentIndex || 0);

            if (direction === "next") {
                currentIndex = (currentIndex + 1) % images.length;
            } else {
                currentIndex = (currentIndex - 1 + images.length) % images.length;
            }

            imageElement.src = images[currentIndex].trim();
            imageElement.alt = `${altText} ${currentIndex + 1}`;
            slider.dataset.currentIndex = String(currentIndex);

            console.log(`Slider: image №${currentIndex + 1} displayed.`);
        } catch (error) {
            console.log("Error in Slider.changeSlide:", error);
        }
    }
}
