let translations = {};
let currentLang = 'en';

const loadTranslations = async (lang) => {
    try {
        const response = await fetch(`${lang}.json`);
        if (!response.ok) {
            throw new Error(`Could not load ${lang}.json`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        // Fallback to English if translation file not found
        const response = await fetch(`en.json`);
        return await response.json();
    }
};

export const translatePage = () => {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            // Handle different types of elements/attributes
            if (element.hasAttribute('data-i18n-title')) {
                 element.setAttribute('title', translations[key]);
            } else if (element.placeholder !== undefined) {
                 element.placeholder = translations[key];
            } else {
                 element.textContent = translations[key];
            }
        }
    });
};

export const setLang = async (lang) => {
    currentLang = lang;
    localStorage.setItem('language', lang);
    translations = await loadTranslations(lang);
    translatePage();
    // A bit of a hack to force re-render components with translated text
    // A proper framework would handle this more gracefully.
    document.dispatchEvent(new CustomEvent('languageChanged'));
    document.documentElement.lang = lang;
};

export const get = (key) => {
    return translations[key] || key;
};

export const init = async () => {
    const savedLang = localStorage.getItem('language') || 'en';
    await setLang(savedLang);
};

