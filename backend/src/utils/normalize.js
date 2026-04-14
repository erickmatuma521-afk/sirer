/**
 * Normalise une chaîne pour la recherche :
 * - Passage en majuscules
 * - Suppression des accents
 * - Suppression des espaces superflus
 */
export function normalizeSearch(text) {
    if (!text) return '';
    return String(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
}
