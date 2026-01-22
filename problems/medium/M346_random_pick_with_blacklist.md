---
id: M346
old_id: A177
slug: random-pick-with-blacklist
title: Random Pick with Blacklist
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems:
  - M124_insert_delete_getrandom_o1.md
  - M125_insert_delete_getrandom_o1_duplicates_allowed.md
  - M265_random_pick_index.md
prerequisites:
  - hash-tables
  - randomization
  - virtual-indexing
---
# Random Pick with Blacklist

## Problem

Design a randomized data structure that efficiently picks random integers from a range while excluding certain forbidden values.

You're given an integer `n` defining a range `[0, n-1]` and a blacklist array containing unique integers that should be excluded. Your task is to build a system that randomly selects from the valid (non-blacklisted) integers with uniform probability, meaning each valid number has an equal chance of being picked.

The challenge is doing this efficiently. A naive solution might be to store all valid numbers in an array and pick randomly, but when `n` is very large (up to 1 billion), this becomes infeasible. You need up to 10 gigabytes of memory just to store all the integers. Similarly, you can't afford to keep generating random numbers and rejecting them if they're blacklisted, as this could take many attempts when the blacklist is large.

The key insight is using virtual indexing. Instead of physically storing all valid numbers, create a mapping that remaps blacklisted positions in a compressed range to valid positions outside that range. This way, you only store the remapping (at most the size of the blacklist), not all valid numbers.

Your `Solution` class should implement:
- `Solution(int n, int[] blacklist)` - Initialize the structure with the range and blacklist
- `int pick()` - Return a uniformly random integer from the valid range, with minimal random number generation calls

## Why This Matters

This problem teaches space-efficient randomization techniques used in systems like load balancers (distributing requests while avoiding failed servers), recommendation engines (selecting from available items excluding already-shown content), and sampling algorithms in big data processing. The virtual indexing pattern you'll learn is crucial for handling large-scale systems where memory is constrained. Understanding how to achieve O(1) operations with minimal preprocessing appears frequently in system design interviews at top tech companies.

## Constraints

- 1 <= n <= 10⁹
- 0 <= blacklist.length <= min(10⁵, n - 1)
- 0 <= blacklist[i] < n
- All the values of blacklist are **unique**.
- At most 2 * 10⁴ calls will be made to pick.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Virtual Range Remapping</summary>

The key insight: instead of storing all valid numbers (which could be 10⁹), remap blacklisted values to valid ones.

Conceptually, imagine compressing the valid range:
- Total valid numbers: `n - len(blacklist)`
- Generate random index in `[0, valid_count - 1]`
- If the random index is blacklisted, map it to a valid replacement

Example: n=7, blacklist=[2,3,5]
- Valid range: [0,1,4,6] (4 numbers)
- Map blacklisted positions in [0,3] to valid positions in [4,6]
- Random pick from [0,3], remap if blacklisted

This avoids storing 10⁹ elements.
</details>

<details>
<summary>Hint 2: Two-Region Strategy</summary>

Divide the range into two regions:
1. **Left region**: [0, valid_count - 1]
2. **Right region**: [valid_count, n - 1]

Strategy:
- Generate random index in left region
- If blacklisted, map to a non-blacklisted number from right region
- Use hash map: blacklisted_in_left → valid_in_right

Construction algorithm:
```
valid_count = n - len(blacklist)
right_valid = [valid_count, n-1] excluding blacklist
mapping = {}

for each blacklisted value in [0, valid_count - 1]:
    mapping[blacklisted] = next valid from right_valid
```

Pick is O(1): generate random in [0, valid_count-1], use mapping if needed.
</details>

<details>
<summary>Hint 3: Handle Edge Cases Efficiently</summary>

Optimization considerations:
- If blacklist is empty: direct random from [0, n-1]
- If all blacklist values >= valid_count: no mapping needed
- Use set for O(1) blacklist lookups during construction

The mapping only needs to store blacklisted values in the left region, not all blacklisted values.
</details>

## Complexity Analysis

| Approach | Construction | Pick | Space Complexity | Notes |
|----------|-------------|------|------------------|-------|
| Store All Valid Numbers | O(n) | O(1) | O(n) | Infeasible for n=10⁹ |
| Rejection Sampling | O(b) | O(b) expected | O(b) | Keep picking until not blacklisted; slow if many blacklisted |
| Virtual Remapping (Optimal) | O(b) | O(1) | O(b) | b = blacklist length; uses hash map |

## Common Mistakes

### Mistake 1: Storing All Valid Numbers
```python
# DON'T: Store all valid numbers explicitly
class Solution:
    def __init__(self, n: int, blacklist: List[int]):
        blacklist_set = set(blacklist)
        # Problem: creates list of size n (up to 10^9!)
        self.valid = [i for i in range(n) if i not in blacklist_set]

    def pick(self) -> int:
        return random.choice(self.valid)
# Problem: O(n) space and time, infeasible for large n
```

**Why it's wrong:** When n = 10⁹, storing all valid numbers requires gigabytes of memory and is extremely slow.

**Fix:** Use virtual remapping with hash map storing only blacklisted→valid mappings.

### Mistake 2: Rejection Sampling Without Optimization
```python
# DON'T: Keep generating random numbers until valid
class Solution:
    def __init__(self, n: int, blacklist: List[int]):
        self.n = n
        self.blacklist = set(blacklist)

    def pick(self) -> int:
        # Problem: may take many iterations if blacklist is large
        while True:
            candidate = random.randint(0, self.n - 1)
            if candidate not in self.blacklist:
                return candidate
# Problem: Expected O(n / (n - b)) time per pick; slow when b is large
```

**Why it's wrong:** If half the numbers are blacklisted, this takes O(2) attempts on average, which is slow with many pick() calls.

**Fix:** Precompute mapping to guarantee O(1) pick.

### Mistake 3: Incorrect Mapping Logic
```python
# DON'T: Map all blacklisted values
class Solution:
    def __init__(self, n: int, blacklist: List[int]):
        self.valid_count = n - len(blacklist)
        self.mapping = {}
        blacklist_set = set(blacklist)

        # Problem: unnecessarily maps blacklisted values in right region
        valid_in_right = [i for i in range(self.valid_count, n) if i not in blacklist_set]
        j = 0
        for b in blacklist:  # Wrong: should only map left region
            self.mapping[b] = valid_in_right[j]
            j += 1

    def pick(self) -> int:
        r = random.randint(0, self.valid_count - 1)
        return self.mapping.get(r, r)
# Problem: Maps blacklisted values >= valid_count, wasting space
```

**Why it's wrong:** Only blacklisted values in [0, valid_count - 1] need mapping. Mapping values in the right region is unnecessary since we never generate random numbers there.

**Fix:** Filter blacklist: `for b in blacklist if b < valid_count`.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Random Pick with Whitelist | Only allow specific values instead of excluding | Medium |
| Random Pick with Weights | Each valid number has different selection probability | Medium |
| Random Pick from Stream | Handle dynamic additions to blacklist | Hard |
| Multi-Range Blacklist | Exclude entire ranges instead of individual values | Medium |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Understood virtual remapping concept
- [ ] Implemented two-region mapping approach
- [ ] Optimized to only map left-region blacklisted values
- [ ] Tested edge cases: empty blacklist, all left/right blacklist, n=10⁹
- [ ] Analyzed time/space complexity
- [ ] **Day 1-3:** Revisit and implement without reference
- [ ] **Week 1:** Solve weighted random pick variation
- [ ] **Week 2:** Apply virtual indexing to other problems

**Strategy**: See [Hash Table Pattern](../prerequisites/hash-tables.md)
