/**
 * Utility functions for search functionality
 */

/**
 * Performs fuzzy matching between a text string and a search term.
 *
 * This algorithm:
 * 1. Returns 100 for exact matches (case-insensitive)
 * 2. Returns 80 for substring matches (if search is contained within text)
 * 3. For partial matches, scores based on character matches with a bonus for consecutive matches
 * 4. Returns 0 for no match
 *
 * @param text The source text to search within
 * @param search The search term to look for
 * @returns A score between 0-100 indicating the quality of the match (0 means no match)
 */
export function fuzzyMatch(text: string, search: string): number {
  // Handle edge cases
  if (!search.trim() || !text) return 0;

  // Special case: exact match when both strings are empty
  if (text === "" && search === "") return 100;

  const textLower = text.toLowerCase();
  const searchLower = search.toLowerCase();

  // Exact match gets highest score
  if (textLower === searchLower) return 100;

  // Contains match gets high score
  if (textLower.includes(searchLower)) return 80;

  // Perform character-by-character fuzzy matching
  let score = 0;
  let searchIndex = 0;
  let consecutiveMatches = 0;

  // Scan through text looking for characters that match search term in order
  for (
    let i = 0;
    i < textLower.length && searchIndex < searchLower.length;
    i++
  ) {
    if (textLower[i] === searchLower[searchIndex]) {
      // Add points for match with bonus for consecutive characters
      score += 10 + consecutiveMatches;
      consecutiveMatches++;
      searchIndex++;
    } else {
      // Reset consecutive match counter
      consecutiveMatches = 0;
    }
  }

  // Only return a score if all search characters were found in sequence
  return searchIndex === searchLower.length ? score : 0;
}

/**
 * Enhanced fuzzy search specifically designed for pipeline searches.
 * Takes multiple match strategies into account like prefix matching,
 * exact matches on different fields, and multi-term search.
 *
 * @param item Object containing text fields to search in (name, slug, org, etc.)
 * @param searchTerm The search term(s) to look for
 * @param fields Field configuration with weights for scoring
 * @returns A score indicating the quality of the match
 */
export function enhancedFuzzySearch<T extends Record<string, any>>(
  item: T,
  searchTerm: string,
  fields: Array<{ key: keyof T; weight: number }>,
): number {
  if (!searchTerm.trim()) return 0;

  const terms = searchTerm
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  let totalScore = 0;

  // Process each field with its weight
  fields.forEach(({ key, weight }) => {
    const fieldValue = String(item[key] || "").toLowerCase();

    // Skip empty values
    if (!fieldValue) return;

    // Check for exact match
    if (fieldValue === searchTerm.toLowerCase()) {
      totalScore += 100 * weight;
      return;
    }

    // Check for prefix match (starts with)
    if (fieldValue.startsWith(searchTerm.toLowerCase())) {
      totalScore += 70 * weight;
      return;
    }

    // Check for contains match
    if (fieldValue.includes(searchTerm.toLowerCase())) {
      totalScore += 50 * weight;
      return;
    }

    // For multi-term searches
    if (terms.length > 1) {
      const matchedTerms = terms.filter((term) => fieldValue.includes(term));

      // Bonus for matching all terms
      if (matchedTerms.length === terms.length) {
        totalScore += 40 * weight;
      } else if (matchedTerms.length > 0) {
        // Partial bonus for partial matches
        totalScore += 15 * matchedTerms.length * weight;
      }
    }

    // Use character-by-character fuzzy match as fallback
    const fuzzyScore = fuzzyMatch(fieldValue, searchTerm) * weight;
    if (fuzzyScore > 0) {
      totalScore += fuzzyScore;
    }
  });

  return totalScore;
}
