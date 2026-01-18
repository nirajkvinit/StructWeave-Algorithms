---
id: M379
old_id: A220
slug: cracking-the-safe
title: Cracking the Safe
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Cracking the Safe

## Problem

You're faced with a high-security safe that has an unusual password mechanism. The password is `n` digits long, with each digit ranging from `0` to `k-1`. However, the safe doesn't have a "clear" button. Instead, it has a special checking mechanism:

As you continuously type digits, the safe constantly examines the most recent `n` digits you've entered. Whenever those last `n` digits match the password, the safe opens immediately. Older digits beyond the last `n` are ignored for the current check.

For example, with password `"345"` (n=3), if you type the sequence `"012345"`:
- After typing `"012"`: last 3 digits are "012" (wrong)
- After typing `"0123"`: last 3 digits are "123" (wrong)
- After typing `"01234"`: last 3 digits are "234" (wrong)
- After typing `"012345"`: last 3 digits are "345" (correct - safe opens!)

Here's the challenge: you don't know the password, but you know `n` (password length) and `k` (number of possible digits). Find the shortest sequence of digits that is guaranteed to open the safe regardless of what the password is. In other words, your sequence must contain every possible `n`-digit combination as a substring at some position.

There are `k^n` possible passwords (for example, with n=2 and k=10, there are 100 possible 2-digit codes: "00", "01", ..., "99"). A naive approach would concatenate them all: "00" + "01" + ... + "99", resulting in length 200. But you can overlap these combinations cleverly. For instance, "001" contains both "00" and "01"! Your goal is to find this minimal overlapping sequence.

This is known as finding a **De Bruijn sequence**, a mathematical construct discovered in the study of combinatorics and graph theory. The solution involves modeling the problem as an Eulerian path in a directed graph.

## Why This Matters

This is a classic application of Eulerian paths (visiting every edge exactly once in a graph), a fundamental concept in graph theory with surprising real-world applications. De Bruijn sequences appear in DNA sequencing (genome assembly), pseudorandom number generation, robot position tracking (encoding positions with overlapping patterns), and even magic tricks. The problem teaches you Hierholzer's algorithm for finding Eulerian paths, which is used in network routing, circuit design (finding paths that traverse all connections), and even video game level generation. Understanding the transformation from a seemingly string-based problem to a graph traversal problem demonstrates the power of abstraction in algorithm design. This is an advanced problem that tests deep algorithmic knowledge, appearing in interviews for research-oriented positions and companies working on computational biology or cryptography.

## Examples

**Example 1:**
- Input: `n = 1, k = 2`
- Output: `"10"`
- Explanation: The password is a single digit, so enter each digit. "01" would also unlock the safe.

**Example 2:**
- Input: `n = 2, k = 2`
- Output: `"01100"`
- Explanation: For each possible password:
- "00" is typed in starting from the 4th digit.
- "01" is typed in starting from the 1st digit.
- "10" is typed in starting from the 3rd digit.
- "11" is typed in starting from the 2ⁿd digit.
Thus "01100" will unlock the safe. "10011", and "11001" would also unlock the safe.

## Constraints

- 1 <= n <= 4
- 1 <= k <= 10
- 1 <= kⁿ <= 4096

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a classic Eulerian path problem (De Bruijn sequence). Model it as a directed graph where nodes represent (n-1)-digit strings and edges represent n-digit passwords. An Eulerian path visits every edge exactly once, creating the minimal sequence that contains all k^n passwords.
</details>

<details>
<summary>Main Approach</summary>
Use Hierholzer's algorithm to find an Eulerian path in a directed graph. Start with "0"*(n-1) as the initial node. For each node, try all k possible next digits (edges). Use DFS with backtracking to visit all k^n edges exactly once. The path taken represents the final string.
</details>

<details>
<summary>Optimization Tip</summary>
Track visited edges, not visited nodes (since we must visit all edges exactly once but may revisit nodes). Use a set of strings representing edge "from+digit" to mark edges as used. Construct the result string by appending the last digit of each edge taken.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(k^n * n!) | O(k^n) | Try all permutations, infeasible |
| DFS with backtracking | O(k^n) | O(k^n) | Visit each edge once |
| Hierholzer's Algorithm | O(k^n) | O(k^n) | Optimal for Eulerian path |

## Common Mistakes

1. **Treating nodes as passwords instead of edges**
   ```python
   # Wrong: Node represents password
   graph[node] = [next_passwords]

   # Correct: Edge represents password, node is (n-1) prefix
   node = password[:-1]  # last n-1 digits
   edge = password[-1]    # last digit is the edge
   ```

2. **Not handling revisiting nodes**
   ```python
   # Wrong: Mark nodes as visited (we may need to revisit)
   visited_nodes.add(node)

   # Correct: Mark edges as visited
   visited_edges.add(current_node + digit)
   ```

3. **Building result incorrectly**
   ```python
   # Wrong: Append entire n-digit password each time
   result += next_password  # creates overlaps

   # Correct: Append only the new digit (last char)
   result += next_password[-1]  # minimal overlap
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Arrangement of Pairs | Hard | Eulerian path on integer pairs |
| Reconstruct Itinerary | Hard | Lexicographically smallest Eulerian path |
| K-Similar Strings | Hard | Graph search with string transformations |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Graph Theory](../../strategies/data-structures/graphs.md)
