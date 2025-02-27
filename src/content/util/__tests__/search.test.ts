import { fuzzyMatch, enhancedFuzzySearch } from "../search";

describe("fuzzyMatch", () => {
  it("returns 100 for exact matches", () => {
    expect(fuzzyMatch("test", "test")).toBe(100);
    expect(fuzzyMatch("buildkite", "buildkite")).toBe(100);
    expect(fuzzyMatch("pipeline-123", "pipeline-123")).toBe(100);
  });

  it("returns 80 for contains matches", () => {
    expect(fuzzyMatch("testing", "test")).toBe(80);
    expect(fuzzyMatch("my-buildkite-pipeline", "buildkite")).toBe(80);
    expect(fuzzyMatch("frontend-service", "service")).toBe(80);
  });

  it("handles case-insensitive matching", () => {
    expect(fuzzyMatch("Test", "test")).toBe(100);
    expect(fuzzyMatch("BUILDKITE", "buildkite")).toBe(100);
    expect(fuzzyMatch("frontend-service", "SERVICE")).toBe(80);
  });

  it("scores partial matches based on consecutive characters", () => {
    // Expect scores > 0 for partial matches
    expect(fuzzyMatch("frontend", "frnt")).toBeGreaterThan(0);
    expect(fuzzyMatch("buildkite", "bldkt")).toBeGreaterThan(0);

    // Consecutive characters should score higher
    const scoreConsecutive = fuzzyMatch("testing", "tes");
    const scoreNonConsecutive = fuzzyMatch("testing", "tsg");
    expect(scoreConsecutive).toBeGreaterThan(scoreNonConsecutive);
  });

  it("returns 0 for non-matches", () => {
    expect(fuzzyMatch("test", "xyz")).toBe(0);
    expect(fuzzyMatch("buildkite", "github")).toBe(0);
    expect(fuzzyMatch("", "test")).toBe(0);
  });

  it("handles edge cases", () => {
    expect(fuzzyMatch("", "")).toBe(0); // Empty input should return 0
    expect(fuzzyMatch("a", "a")).toBe(100); // Single character match
    expect(fuzzyMatch("a", "b")).toBe(0); // Single character mismatch
  });

  it("produces same results as original implementation", () => {
    // Test cases taken from existing code
    expect(fuzzyMatch("test", "test")).toBe(100);
    expect(fuzzyMatch("testing", "test")).toBe(80);

    const scoreWith3Letters = fuzzyMatch("testing", "tst");
    expect(scoreWith3Letters).toBeGreaterThan(0);

    // Verify that all search chars must be found in sequence
    expect(fuzzyMatch("testing", "tsx")).toBe(0);
  });
});

describe("enhancedFuzzySearch", () => {
  // Define the test object type explicitly
  type TestObject = {
    name: string;
    slug: string;
    organization: string;
    description: string;
  };

  // Create the test object with the explicit type
  const testObj: TestObject = {
    name: "Frontend Service",
    slug: "frontend-service",
    organization: "testorg",
    description: "A service for rendering UI components",
  };

  // Define test fields with the explicit key type
  const testFields: Array<{ key: keyof TestObject; weight: number }> = [
    { key: "name", weight: 1.5 },
    { key: "slug", weight: 1.0 },
    { key: "organization", weight: 0.7 },
    { key: "description", weight: 0.5 },
  ];

  it("scores exact matches highest", () => {
    const exactMatchScore = enhancedFuzzySearch<TestObject>(
      testObj,
      "Frontend Service",
      testFields,
    );
    const partialMatchScore = enhancedFuzzySearch<TestObject>(
      testObj,
      "frontend",
      testFields,
    );

    expect(exactMatchScore).toBeGreaterThan(partialMatchScore);
  });

  it("gives weight to prefix matches", () => {
    const prefixMatchScore = enhancedFuzzySearch<TestObject>(
      testObj,
      "front",
      testFields,
    );
    const containsMatchScore = enhancedFuzzySearch<TestObject>(
      testObj,
      "service",
      testFields,
    );

    expect(prefixMatchScore).toBeGreaterThan(0);
    expect(containsMatchScore).toBeGreaterThan(0);
  });

  it("handles multi-term searches", () => {
    const multiTermScore = enhancedFuzzySearch<TestObject>(
      testObj,
      "frontend ui",
      testFields,
    );

    expect(multiTermScore).toBeGreaterThan(0);
  });

  it("returns 0 for no matches", () => {
    expect(enhancedFuzzySearch<TestObject>(testObj, "xyz123", testFields)).toBe(
      0,
    );
  });

  it("respects field weights", () => {
    // Name has weight 1.5, slug has weight 1.0
    const nameMatchScore = enhancedFuzzySearch<TestObject>(
      testObj,
      "Frontend",
      testFields,
    );

    // Create a similar object with the values swapped
    const swappedObj: TestObject = {
      ...testObj,
      name: "service-xyz",
      slug: "frontend",
    };

    const slugMatchScore = enhancedFuzzySearch<TestObject>(
      swappedObj,
      "Frontend",
      testFields,
    );

    // Name matches should score higher due to weight
    expect(nameMatchScore).toBeGreaterThan(slugMatchScore);
  });

  it("handles empty input gracefully", () => {
    expect(enhancedFuzzySearch<TestObject>(testObj, "", testFields)).toBe(0);

    // For the empty object test, we need to handle the type differently
    const emptyObj = {} as Partial<TestObject>;
    expect(
      enhancedFuzzySearch<Partial<TestObject>>(
        emptyObj,
        "test",
        testFields as Array<{ key: keyof Partial<TestObject>; weight: number }>,
      ),
    ).toBe(0);
  });
});
