

export function validateRequired(value) {
    
    return String(value).trim().length > 0;
}

export function validateEmail(email) {
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(String(email).trim());
}

export function saveToStorage(key, value) {
    try {
        
        localStorage.setItem(key, JSON.stringify(value));
        console.log(`Data saved to LocalStorage with key: ${key}`);
    } catch (error) {
        console.log("Error saving to LocalStorage:", error);
    }
}

export function loadFromStorage(key) {
    try {
        
        const rawValue = localStorage.getItem(key);

      
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
    
    return String(value).padStart(2, "0");
}

export function toggleElementVisibility(element, shouldShow) {
    if (!element) {
        return;
    }

    
    element.classList.toggle("is-hidden", !shouldShow);
}

export function clearText(element) {
    if (!element) {
        return;
    }

   
    element.textContent = "";
}
