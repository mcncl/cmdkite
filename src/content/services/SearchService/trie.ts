/**
 * A trie (prefix tree) data structure optimized for fast prefix-based lookups.
 * This allows the command palette to quickly find commands that match a prefix,
 * which is especially useful for short search terms.
 */
export class PrefixTrie<T = any> {
  private root: TrieNode<T>;

  constructor() {
    this.root = new TrieNode<T>();
  }

  /**
   * Insert a new key into the trie with the associated value
   * @param key The key to index (typically a word or command ID)
   * @param value The value to associate with this key
   */
  public insert(key: string, value: T): void {
    if (!key) return;

    let current = this.root;
    const normalizedKey = key.toLowerCase();

    for (let i = 0; i < normalizedKey.length; i++) {
      const char = normalizedKey[i];

      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode<T>());
      }

      current = current.children.get(char)!;
    }

    // Mark as the end of a word and store the value
    current.isEndOfWord = true;

    // Store the value - allow duplicates for different keys that point to the same item
    if (!current.values.some((item) => this.areEqual(item, value))) {
      current.values.push(value);
    }
  }

  /**
   * Check if two values are the same (used to prevent duplicates)
   */
  private areEqual(a: T, b: T): boolean {
    if (a === b) return true;

    // For objects with an ID (like commands), compare by ID
    if (
      typeof a === "object" &&
      a !== null &&
      "id" in a &&
      typeof b === "object" &&
      b !== null &&
      "id" in b
    ) {
      return (a as any).id === (b as any).id;
    }

    return false;
  }

  /**
   * Find all values that match the given prefix
   * @param prefix The prefix to search for
   * @returns Array of values that match the prefix
   */
  public search(prefix: string): T[] {
    const normalizedPrefix = prefix.toLowerCase();

    // Handle empty prefix case - return empty array
    if (!normalizedPrefix) {
      return [];
    }
    
    // Special case for single character searches to prevent performance issues
    if (normalizedPrefix.length === 1) {
      // For single character, limit to exact matches only, don't traverse the trie
      const firstCharNode = this.root.children.get(normalizedPrefix[0]);
      if (!firstCharNode) return [];
      
      // Only return values that are direct matches
      return firstCharNode.isEndOfWord ? [...firstCharNode.values] : [];
    }

    // Find the node corresponding to the prefix
    let current = this.root;
    for (let i = 0; i < normalizedPrefix.length; i++) {
      const char = normalizedPrefix[i];

      if (!current.children.has(char)) {
        return []; // Prefix not found
      }

      current = current.children.get(char)!;
    }

    // Collect all values from this point in the trie
    return this.collectValues(current);
  }

  /**
   * Collect all values from a given node and its children
   * @param node The starting node
   * @returns Array of all values in the subtree
   */
  private collectValues(node: TrieNode<T>): T[] {
    const result: T[] = [];
    const visited = new Set<T | string>();
    
    // Use depth-first search with depth limit for better performance
    const MAX_DEPTH = 5; // Limit depth to prevent excessive traversal
    const MAX_RESULTS = 30; // Lower maximum to improve performance
    
    const dfs = (current: TrieNode<T>, depth: number) => {
      // Check termination conditions
      if (depth > MAX_DEPTH || result.length >= MAX_RESULTS) {
        return;
      }
      
      // Process current node
      if (current.isEndOfWord) {
        for (const value of current.values) {
          // Skip duplicates
          if (!this.isVisited(value, visited)) {
            result.push(value);
            this.markVisited(value, visited);
            
            // Early termination if we have enough results
            if (result.length >= MAX_RESULTS) {
              return;
            }
          }
        }
      }
      
      // Process direct children first (prioritize exact matches)
      for (const child of current.children.values()) {
        dfs(child, depth + 1);
      }
    };
    
    // Start DFS from the provided node
    dfs(node, 0);
    
    return result;
  }

  /**
   * Check if a value has been visited (prevents duplicates)
   */
  private isVisited(value: T, visited: Set<T | string>): boolean {
    if (typeof value === "object" && value !== null && "id" in value) {
      return visited.has((value as any).id);
    }
    return visited.has(value);
  }

  /**
   * Mark a value as visited (prevents duplicates)
   */
  private markVisited(value: T, visited: Set<T | string>): void {
    if (typeof value === "object" && value !== null && "id" in value) {
      visited.add((value as any).id);
    } else {
      visited.add(value as any);
    }
  }

  /**
   * Delete a key from the trie
   * @param key The key to delete
   */
  public delete(key: string): boolean {
    return this.deleteHelper(this.root, key.toLowerCase(), 0);
  }

  private deleteHelper(
    current: TrieNode<T>,
    key: string,
    index: number,
  ): boolean {
    // If we've reached the end of the key
    if (index === key.length) {
      // If this isn't an end of word, the key doesn't exist
      if (!current.isEndOfWord) {
        return false;
      }

      // Mark as not the end of a word and clear values
      current.isEndOfWord = false;
      current.values = [];

      // Return whether this node can be deleted
      return current.children.size === 0;
    }

    const char = key[index];
    if (!current.children.has(char)) {
      return false; // Key not found
    }

    const shouldDeleteChild = this.deleteHelper(
      current.children.get(char)!,
      key,
      index + 1,
    );

    if (shouldDeleteChild) {
      // Delete the child if it's no longer needed
      current.children.delete(char);
      // Return whether this node can also be deleted
      return current.children.size === 0 && !current.isEndOfWord;
    }

    return false;
  }

  /**
   * Clear the entire trie
   */
  public clear(): void {
    this.root = new TrieNode<T>();
  }
}

/**
 * Node in the prefix trie
 */
class TrieNode<T> {
  public children: Map<string, TrieNode<T>> = new Map();
  public isEndOfWord: boolean = false;
  public values: T[] = [];
}
