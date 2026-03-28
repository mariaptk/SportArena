// В этом файле находятся небольшие вспомогательные функции,
// которые переиспользуются в разных компонентах сайта.

export function validateRequired(value) {
    // Проверяем, что строка существует и не состоит только из пробелов.
    return String(value).trim().length > 0;
}

export function validateEmail(email) {
    // Простая регулярка для учебной валидации email.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(String(email).trim());
}

export function saveToStorage(key, value) {
    try {
        // Сохраняем данные в LocalStorage в формате JSON.
        localStorage.setItem(key, JSON.stringify(value));
        console.log(`Data saved to LocalStorage with key: ${key}`);
    } catch (error) {
        console.log("Error saving to LocalStorage:", error);
    }
}

export function loadFromStorage(key) {
    try {
        // Получаем строку из LocalStorage.
        const rawValue = localStorage.getItem(key);

        // Если данных нет, возвращаем null.
        if (!rawValue) {
            return null;
        }

        console.log(`Data loaded from LocalStorage with key: ${key}`);
        return JSON.parse(rawValue);
    } catch (error) {
        console.log("Error reading from LocalStorage:", error);
        return null;
    }
}

export function formatTimeUnit(value) {
    // Делает вид таймера аккуратным: 2 вместо 02 недопустимо по макету.
    return String(value).padStart(2, "0");
}

export function toggleElementVisibility(element, shouldShow) {
    if (!element) {
        return;
    }

    // Если shouldShow = true, убираем класс скрытия.
    element.classList.toggle("is-hidden", !shouldShow);
}

export function clearText(element) {
    if (!element) {
        return;
    }

    // Очищаем текст ошибки или сообщения.
    element.textContent = "";
}
