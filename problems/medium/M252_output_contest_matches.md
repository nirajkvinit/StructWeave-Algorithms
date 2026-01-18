---
id: M252
old_id: A041
slug: output-contest-matches
title: Output Contest Matches
difficulty: medium
category: medium
topics: ["string", "recursion", "simulation"]
patterns: ["recursion", "divide-and-conquer", "simulation"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - M536_construct_binary_tree_from_string.md
  - M385_mini_parser.md
prerequisites:
  - recursion basics
  - string manipulation
  - tournament bracket concepts
---
# Output Contest Matches

## Problem

Design a tournament bracket system where teams are seeded from 1 to n (with n guaranteed to be a power of 2), and matches follow the classic sports seeding rule: the strongest seed always faces the weakest remaining seed. Given an integer n representing the number of teams, generate the complete bracket structure as a nested string.

Teams are numbered 1 through n based on their ranking. Team 1 is the top seed and team n is the bottom seed. In each round, pair teams using this strategy: first plays last, second plays second-to-last, and so on. Represent each matchup using parentheses like "(1,8)" and nest subsequent rounds inside larger parentheses.

For n=4, the first round produces two games: (1,4) and (2,3). These two matchups then face each other in the finals, giving "((1,4),(2,3))". For n=8, you'll have three rounds of nesting: quarterfinals, semifinals, and finals. The output captures the entire tournament structure in a single compact string.

Think of this as building a binary tree where leaf nodes are individual teams and internal nodes represent matches. You can solve it iteratively by simulating each round, or recursively by dividing the bracket in half. The iterative approach repeatedly pairs teams from the ends moving inward, while the recursive approach naturally creates the nested structure.

## Why This Matters

Tournament bracket generation appears in sports scheduling software, gaming platforms, and competitive coding competitions. Understanding this pattern helps you work with hierarchical tournament structures and teaches recursive string building. The problem also demonstrates how recursion can elegantly solve problems with nested structure, a skill that transfers to parsing expressions, building syntax trees, and handling hierarchical data formats. It's a favorite interview question for testing recursion understanding without requiring complex data structures.

## Examples

**Example 1:**
- Input: `n = 4`
- Output: `"((1,4),(2,3))"`
- Explanation: Initially, team 1 pairs with team 4, and team 2 pairs with team 3, following the strongest-versus-weakest rule. This gives us (1,4),(2,3). After the first round completes, the two winners advance to face each other in the final. We wrap these matchups in another set of parentheses to represent this next round, resulting in ((1,4),(2,3)).

**Example 2:**
- Input: `n = 8`
- Output: `"(((1,8),(4,5)),((2,7),(3,6)))"`
- Explanation: Round 1 produces four matchups: (1,8),(2,7),(3,6),(4,5)
Round 2 pairs the winners: ((1,8),(4,5)),((2,7),(3,6))
Round 3 is the championship: (((1,8),(4,5)),((2,7),(3,6)))
The final output shows the entire bracket structure with all rounds nested appropriately.

## Constraints

- n == 2x where x in in the range [1, 12].

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Simulate Round by Round</summary>

Start with teams as strings ["1", "2", "3", ..., "n"]. In each round:
1. Pair the first team with the last team: (teams[0], teams[-1])
2. Pair the second team with second-to-last: (teams[1], teams[-2])
3. Continue until all teams are paired

The resulting pairings become the "teams" for the next round. Repeat until only one match remains.

Example for n=4: ["1","2","3","4"] → ["(1,4)","(2,3)"] → ["((1,4),(2,3))"]
</details>

<details>
<summary>Hint 2: Use Two-Pointer Technique for Pairing</summary>

In each round, use two pointers:
- Left pointer starts at index 0
- Right pointer starts at index len(teams)-1
- Create pairs: `(teams[left], teams[right])`
- Move left forward and right backward
- Repeat until left >= right

This ensures highest seed always plays lowest seed.
</details>

<details>
<summary>Hint 3: Recursive Divide and Conquer</summary>

Think of the tournament as a binary tree:
- Leaf nodes are individual teams
- Internal nodes are matches
- The root is the final match

You can build this recursively:
```python
def buildBracket(left, right):
    if left == right:
        return str(left)
    mid = (left + right) // 2
    left_bracket = buildBracket(left, mid)
    right_bracket = buildBracket(mid+1, right)
    return f"({left_bracket},{right_bracket})"
```

This automatically creates the nested structure!
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Iterative Simulation | O(n) | O(n) | Process all n teams once per round, log(n) rounds |
| Recursive Divide & Conquer | O(n) | O(log n) | Recursion depth is log(n), each call processes O(1) |
| String Building (Naive) | O(n²) | O(n) | String concatenation can be expensive |

## Common Mistakes

### Mistake 1: Incorrect Pairing Order
```python
# Wrong: Pairs sequentially instead of strongest-vs-weakest
def findContestMatch(n):
    teams = [str(i) for i in range(1, n+1)]
    while len(teams) > 1:
        new_teams = []
        for i in range(0, len(teams), 2):
            new_teams.append(f"({teams[i]},{teams[i+1]})")
        teams = new_teams
    return teams[0]
# This gives: ((1,2),(3,4)) instead of ((1,4),(2,3))

# Correct: Pair from both ends
def findContestMatch(n):
    teams = [str(i) for i in range(1, n+1)]
    while len(teams) > 1:
        new_teams = []
        for i in range(len(teams) // 2):
            new_teams.append(f"({teams[i]},{teams[len(teams)-1-i]})")
        teams = new_teams
    return teams[0]
```

### Mistake 2: Not Updating Teams After Each Round
```python
# Wrong: Only does one round of pairing
def findContestMatch(n):
    teams = [str(i) for i in range(1, n+1)]
    result = []
    for i in range(n // 2):
        result.append(f"({teams[i]},{teams[n-1-i]})")
    return ','.join(result)  # Missing outer parentheses and subsequent rounds

# Correct: Continue until single match remains
def findContestMatch(n):
    teams = [str(i) for i in range(1, n+1)]
    while len(teams) > 1:
        new_teams = []
        for i in range(len(teams) // 2):
            new_teams.append(f"({teams[i]},{teams[len(teams)-1-i]})")
        teams = new_teams
    return teams[0]
```

### Mistake 3: Inefficient String Building
```python
# Wrong: Creates intermediate strings unnecessarily
def findContestMatch(n):
    teams = [str(i) for i in range(1, n+1)]
    while len(teams) > 1:
        new_teams = []
        for i in range(len(teams) // 2):
            match = "(" + teams[i] + "," + teams[len(teams)-1-i] + ")"
            new_teams.append(match)
        teams = new_teams
    return teams[0]

# Better: Use f-strings or join
def findContestMatch(n):
    teams = [str(i) for i in range(1, n+1)]
    while len(teams) > 1:
        teams = [f"({teams[i]},{teams[-1-i]})"
                 for i in range(len(teams) // 2)]
    return teams[0]
```

## Variations

| Variation | Difference | Complexity Impact |
|-----------|------------|-------------------|
| Random Seeding | Teams paired randomly each round | Add shuffle step O(n log n) |
| Swiss System | Winners play winners, losers play losers | More complex pairing logic |
| Double Elimination | Losers bracket included | Need to track two separate brackets |
| Output as Tree Structure | Return binary tree instead of string | Build actual TreeNode objects |

## Practice Checklist

Track your progress with spaced repetition:

- [ ] First attempt (understand tournament pairing rules)
- [ ] Implement iterative simulation solution
- [ ] Implement recursive divide-and-conquer solution
- [ ] Test with different values of n (4, 8, 16)
- [ ] After 1 day: Solve without hints
- [ ] After 1 week: Solve in under 20 minutes
- [ ] Before interview: Explain both approaches

**Strategy**: See [Recursion Pattern](../strategies/patterns/recursion.md)
