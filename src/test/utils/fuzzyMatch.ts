/**
 * Performs fuzzy matching between a text and a search term
 * 
 * @param text The text to search in
 * @param search The search term to look for
 * @returns A score indicating the quality of the match (0 means no match)
 */
export function fuzzyMatch(text: string, search: string): number {
  // Special case: both strings are empty - consider this an exact match
  if (text === "" && search === "") return 100;
  
  // Normal case: if either string is empty or search is whitespace, not a match
  if (!search.trim() || !text) return 0;

  const textLower = text.toLowerCase();
  const searchLower = search.toLowerCase();

  if (textLower === searchLower) return 100;
  if (textLower.includes(searchLower)) return 80;

  let score = 0;
  let searchIndex = 0;
  let consecutiveMatches = 0;

  for (
    let i = 0;
    i < textLower.length && searchIndex < searchLower.length;
    i++
  ) {
    if (textLower[i] === searchLower[searchIndex]) {
      score += 10 + consecutiveMatches;
      consecutiveMatches++;
      searchIndex++;
    } else {
      consecutiveMatches = 0;
    }
  }

  return searchIndex === searchLower.length ? score : 0;
}
