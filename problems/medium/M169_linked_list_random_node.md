---
id: M169
old_id: I181
slug: linked-list-random-node
title: Linked List Random Node
difficulty: medium
category: medium
topics: ["linked-list", "reservoir-sampling"]
patterns: ["reservoir-sampling"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M168", "M210", "E001"]
prerequisites: ["linked-lists", "randomization", "probability"]
strategy_ref: ../strategies/data-structures/linked-lists.md
---
# Linked List Random Node

## Problem

You are provided with a singly linked list where nodes are connected in sequence, each pointing to the next node until the last node points to null. Your task is to design a data structure that can return a random node's value from this list, ensuring every node has exactly equal probability of being chosen—this is called uniform random selection. You'll implement a class with two methods: a constructor that receives the head of the linked list and stores whatever you need for later use, and a `getRandom()` method that returns a randomly selected value with each node having probability 1/n where n is the total number of nodes. The tricky part is that linked lists don't support random access like arrays do—you can't just pick a random index and jump to it in O(1) time. Instead, you have to traverse from the head, following the next pointers one by one. You could convert the entire list to an array during initialization for easy random access later, but that uses O(n) space. The challenge is whether you can achieve randomness without storing all values, or if you do store them, making the right space-time tradeoff. Consider edge cases like single-node lists and very long lists that might make certain approaches impractical.


**Diagram:**

```
Linked list: 1 -> 2 -> 3 -> null

┌───┬────┐    ┌───┬────┐    ┌───┬────┐
│ 1 │  ──┼───>│ 2 │  ──┼───>│ 3 │null│
└───┴────┘    └───┴────┘    └───┴────┘

getRandom() should return:
- 1 with probability 1/3
- 2 with probability 1/3
- 3 with probability 1/3

Each node has equal probability of being selected.
```


## Why This Matters

This problem introduces reservoir sampling, an elegant algorithm for uniformly sampling from streams of unknown or impractical-to-store length, which appears throughout data engineering and statistics. When analyzing massive log files or network traffic streams where you can't store all data in memory, reservoir sampling lets you maintain a random sample that remains statistically representative as new data arrives. Social media platforms use this to select random posts from continuous feeds for quality analysis without storing every post. Database query optimizers use reservoir sampling to estimate query result sizes by sampling rows from intermediate results during query execution. Machine learning pipelines apply this when creating training datasets from continuous data sources like sensor readings or user interactions. Network monitoring systems sample packets uniformly from high-speed traffic for analysis without overwhelming storage. Scientific computing uses reservoir sampling in Monte Carlo simulations and statistical analysis of large datasets. The beauty of reservoir sampling is that it processes data in a single pass with O(1) space while maintaining perfect statistical uniformity—each element has equal probability regardless of when it appeared in the stream or how long the stream becomes.

## Constraints

- The number of nodes in the linked list will be in the range [1, 10⁴].
- -10⁴ <= Node.val <= 10⁴
- At most 10⁴ calls will be made to getRandom.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Space-Time Tradeoff</summary>

The simplest approach is to convert the linked list to an array during initialization. This allows O(1) random access but requires O(n) space. For memory-constrained scenarios, consider if you can select a random node without storing all values.

</details>

<details>
<summary>🎯 Hint 2: Reservoir Sampling</summary>

There's an elegant algorithm called reservoir sampling that can select a random element from a stream of unknown length with uniform probability. The key insight: when you see the i-th element, decide whether to keep it with probability 1/i. This maintains equal probability for all elements seen so far.

</details>

<details>
<summary>📝 Hint 3: Implementation Strategy</summary>

For reservoir sampling on a linked list:
1. Initialize result with the first node's value
2. For each subsequent node at position i, generate a random number from 0 to i-1
3. If the random number is 0, replace result with current node's value
4. Continue until the end of the list

This guarantees each node has probability 1/n of being selected.

</details>

## Complexity Analysis

| Approach | Time (Init) | Time (getRandom) | Space | Notes |
|----------|-------------|------------------|-------|-------|
| Array Conversion | O(n) | O(1) | O(n) | Store all values in array for instant access |
| Count + Random Index | O(n) | O(n) | O(1) | Count nodes, pick random index, traverse again |
| **Reservoir Sampling** | **O(1)** | **O(n)** | **O(1)** | Optimal space, single pass per call |

## Common Mistakes

### Mistake 1: Incorrect probability distribution

```python
# Wrong: This doesn't give uniform probability
def getRandom(self):
    current = self.head
    while current:
        # Flipping coin at each node doesn't work
        if random.random() > 0.5:
            return current.val
        current = current.next
    return self.head.val  # Fallback

# Correct: Use reservoir sampling for uniform distribution
def getRandom(self):
    result = self.head.val
    current = self.head.next
    i = 2

    while current:
        # Probability 1/i of selecting current node
        if random.randint(1, i) == 1:
            result = current.val
        current = current.next
        i += 1

    return result
```

### Mistake 2: Off-by-one errors in random number generation

```python
# Wrong: Using range [0, i) instead of [1, i]
def getRandom(self):
    result = self.head.val
    current = self.head.next
    i = 1  # WRONG: Should start at 2

    while current:
        if random.randint(0, i) == 0:  # WRONG: Range doesn't match probability
            result = current.val
        current = current.next
        i += 1
    return result

# Correct: Proper indexing and range
def getRandom(self):
    result = self.head.val
    current = self.head.next
    i = 2  # Second node is at position 2

    while current:
        # Choose current with probability 1/i
        if random.randint(1, i) == 1:
            result = current.val
        current = current.next
        i += 1

    return result
```

### Mistake 3: Not handling single-node lists

```python
# Wrong: Crashes on single-node list
def getRandom(self):
    result = self.head.val
    current = self.head.next  # Could be None
    i = 2

    while current:  # Never enters if single node
        if random.randint(1, i) == 1:
            result = current.val
        current = current.next
        i += 1

    return result  # Works correctly, but unclear

# Correct: Explicitly handle edge case for clarity
def getRandom(self):
    if not self.head:
        return None

    result = self.head.val
    current = self.head.next
    i = 2

    while current:
        if random.randint(1, i) == 1:
            result = current.val
        current = current.next
        i += 1

    return result
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Array random pick | Same problem but with an array | Easy |
| Weighted random selection | Nodes have different weights/probabilities | Medium |
| Random k nodes | Select k random nodes without replacement | Hard |
| Skip list random | Random selection from a skip list structure | Hard |
| Stream sampling | Maintain reservoir of k items from infinite stream | Hard |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Implement array-based solution
- [ ] Implement reservoir sampling solution
- [ ] Verify probability distribution with testing
- [ ] Practice after 1 day
- [ ] Practice after 3 days
- [ ] Practice after 1 week

**Strategy**: See [Linked List Pattern](../strategies/data-structures/linked-lists.md)
