import { fuzzyMatch } from "../../../../test/utils/fuzzyMatch";

// If you want to test the actual implementation from pick.ts later,
// you can update this import and use that version instead.
// import { fuzzyMatch } from '../pick';

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
    const scoreConsecutive = fuzzyMatch("testing", "test");
    const scoreNonConsecutive = fuzzyMatch("testing", "tsng");
    expect(scoreConsecutive).toBeGreaterThan(scoreNonConsecutive);
  });

  it("returns 0 for non-matches", () => {
    expect(fuzzyMatch("test", "xyz")).toBe(0);
    expect(fuzzyMatch("buildkite", "github")).toBe(0);
    expect(fuzzyMatch("", "test")).toBe(0);
  });

  it("handles edge cases", () => {
    expect(fuzzyMatch("", "")).toBe(100); // Empty strings match exactly
    expect(fuzzyMatch("a", "a")).toBe(100); // Single character match
    expect(fuzzyMatch("a", "b")).toBe(0); // Single character mismatch
  });
});
