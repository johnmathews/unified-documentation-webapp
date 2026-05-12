import { describe, it, expect } from "vitest";
import { countDocStats } from "./docStats";

describe("countDocStats", () => {
 it("returns zeros for null content", () => {
  expect(countDocStats(null)).toEqual({ words: 0, lines: 0 });
 });

 it("returns zeros for empty content", () => {
  expect(countDocStats("")).toEqual({ words: 0, lines: 0 });
 });

 it("returns zeros for whitespace-only content", () => {
  expect(countDocStats("   \n\t  \n")).toEqual({ words: 0, lines: 0 });
 });

 it("counts a single word and a single line", () => {
  expect(countDocStats("hello")).toEqual({ words: 1, lines: 1 });
 });

 it("counts multiple words separated by spaces", () => {
  expect(countDocStats("the quick brown fox")).toEqual({ words: 4, lines: 1 });
 });

 it("counts words split by newlines and tabs", () => {
  expect(countDocStats("one two\nthree\tfour")).toEqual({ words: 4, lines: 2 });
 });

 it("counts multi-line content (markdown punctuation counted as word chars)", () => {
  expect(countDocStats("# Title\n\nA paragraph here.\n\nAnother one.")).toEqual({
   words: 7,
   lines: 5,
  });
 });

 it("does not add a phantom line for trailing newline", () => {
  expect(countDocStats("a\nb\nc\n")).toEqual({ words: 3, lines: 3 });
 });

 it("counts multi-byte unicode words", () => {
  expect(countDocStats("héllo wörld 你好")).toEqual({ words: 3, lines: 1 });
 });

 it("handles CRLF line endings", () => {
  expect(countDocStats("alpha\r\nbeta\r\ngamma")).toEqual({ words: 3, lines: 3 });
 });
});
