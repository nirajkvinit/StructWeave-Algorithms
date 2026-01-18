---
id: E134
old_id: I183
slug: shuffle-an-array
title: Shuffle an Array
difficulty: easy
category: easy
topics: ["array", "random", "design"]
patterns: ["backtrack-permutation", "fisher-yates"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M384", "E215", "M528"]
prerequisites: ["random-algorithms", "fisher-yates-shuffle", "array-manipulation"]
strategy_ref: ../strategies/fundamentals/randomization.md
---
# Shuffle an Array

## Problem

Design and implement a class that can randomly shuffle an integer array. The critical requirement is that your shuffling algorithm must produce every possible permutation with equal probability. This means that if your array has 3 elements, all 6 possible arrangements (3! = 6) must each have exactly a 1/6 chance of occurring.

Your `Solution` class should support three operations:

- `Solution(int[] nums)`: Constructor that stores the original array
- `int[] reset()`: Returns the array to its original state as provided during initialization
- `int[] shuffle()`: Returns a random permutation of the array where every permutation has equal probability

The naive approach of repeatedly swapping random positions doesn't guarantee uniform distribution. Some permutations end up more likely than others due to the way swaps can duplicate certain arrangements. The Fisher-Yates shuffle algorithm solves this mathematically, guaranteeing perfect uniformity by carefully limiting the random choices at each step.

Up to 10,000 total calls will be made to reset and shuffle, so your solution should be efficient.

## Why This Matters

Random shuffling with uniform distribution is crucial for many real-world systems. Recommendation engines shuffle product lists to avoid position bias, online card games must shuffle decks fairly to prevent cheating, machine learning systems shuffle training data to prevent overfitting patterns based on data order, and A/B testing platforms randomize user assignments to experimental groups. Understanding the Fisher-Yates algorithm teaches you why certain randomization approaches are biased and others are provably fair, which is essential for security-sensitive applications like cryptographic key generation, lottery systems, and random sampling in statistical analysis. The requirement to maintain the original array for reset operations also teaches proper state management in object-oriented design.

## Constraints

- 1 <= nums.length <= 50
- -10⁶ <= nums[i] <= 10⁶
- All the elements of nums are **unique**.
- At most 10⁴ calls **in total** will be made to reset and shuffle.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Copy and Sort Randomly
Create a copy and repeatedly pick random elements to build shuffled array.

**Key Steps:**
1. Create a copy of the array
2. For each position, randomly pick from remaining elements
3. Remove picked element from pool
4. Continue until all elements placed

**When to use:** Initial understanding, but inefficient - O(n²) due to removals.

### Intermediate Approach - Fisher-Yates (Knuth) Shuffle
The classic algorithm that guarantees uniform random permutation in O(n) time.

**Key Steps:**
1. Start from the last element
2. Pick a random index from 0 to current position
3. Swap current element with randomly selected element
4. Move to previous position
5. Repeat until reaching the start

**When to use:** This is the standard optimal solution - O(n) time, correct probability distribution.

### Advanced Approach - Inside-Out Fisher-Yates
Can you build the shuffled array in forward order instead of backward?

**Key Steps:**
1. Start with empty result array
2. For each position i, pick random j from 0 to i
3. Copy element at position j to position i
4. Place new element at position j
5. Avoids extra copy operation

**When to use:** When you want to avoid modifying the original array or need forward iteration.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Random Pick & Remove | O(n²) | O(n) | Inefficient; removal is O(n) per element |
| Fisher-Yates | O(n) | O(n) | Optimal; standard algorithm |
| Inside-Out Variant | O(n) | O(n) | Same complexity, different iteration order |
| Sort with Random Keys | O(n log n) | O(n) | Works but slower than Fisher-Yates |

## Common Mistakes

### Mistake 1: Biased shuffling
```python
# Wrong - produces biased distribution
def shuffle(self):
    result = self.nums.copy()
    for i in range(len(result)):
        j = random.randint(0, len(result) - 1)  # Wrong: should be 0 to i
        result[i], result[j] = result[j], result[i]
    return result
```

**Why it's wrong:** Swapping with any random position (not just 0 to i) doesn't give uniform probability for all permutations. Some permutations become more likely than others.

**Fix:** In Fisher-Yates, always swap with a random element from the unprocessed portion (0 to i for forward, i to n-1 for backward).

### Mistake 2: Not preserving original array
```python
# Wrong - modifies the original array
def __init__(self, nums):
    self.nums = nums  # No copy made

def shuffle(self):
    for i in range(len(self.nums) - 1, 0, -1):
        j = random.randint(0, i)
        self.nums[i], self.nums[j] = self.nums[j], self.nums[i]
    return self.nums  # Original is now shuffled!

def reset(self):
    return self.nums  # Can't reset - original was modified!
```

**Why it's wrong:** The reset() method needs to return the original unmodified array, but shuffle() has modified it in place.

**Fix:** Store a copy of the original array separately, and shuffle a working copy.

### Mistake 3: Incorrect random range
```python
# Wrong - off-by-one error in random range
def shuffle(self):
    result = self.nums.copy()
    for i in range(len(result) - 1, 0, -1):
        j = random.randint(0, i - 1)  # Wrong: should include i
        result[i], result[j] = result[j], result[i]
    return result
```

**Why it's wrong:** The random index should include the current position i. Excluding it means the element at position i can never stay in its current position, creating bias.

**Fix:** Use random.randint(0, i) to include i in the range.

## Variations

| Variation | Difficulty | Description | Key Difference |
|-----------|-----------|-------------|----------------|
| Shuffle String | Easy | Shuffle characters in a string | Same algorithm, different data type |
| Random Pick Index | Medium | Pick random index of target value | Reservoir sampling |
| Random Pick with Weight | Medium | Shuffle with weighted probabilities | Prefix sum + binary search |
| Linked List Random Node | Medium | Shuffle/pick from linked list | Reservoir sampling without length |

## Practice Checklist

Track your progress and spaced repetition:

- [ ] Initial attempt (after reading problem)
- [ ] Reviewed approach hints
- [ ] Implemented Fisher-Yates shuffle
- [ ] Understood why equal probability is guaranteed
- [ ] Handled reset() correctly with original copy
- [ ] All test cases passing
- [ ] Reviewed common mistakes
- [ ] Revisit after 1 day
- [ ] Revisit after 3 days
- [ ] Revisit after 1 week
- [ ] Can explain probability distribution clearly

**Strategy Guide:** For pattern recognition and detailed techniques, see [Randomization Fundamentals](../strategies/fundamentals/randomization.md)
