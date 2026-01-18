---
id: M529
old_id: A417
slug: reveal-cards-in-increasing-order
title: Reveal Cards In Increasing Order
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Reveal Cards In Increasing Order

## Problem

Imagine you're preparing a magic card trick where cards are revealed in a specific pattern, but you want them to appear in sorted order to create an impressive effect. You have a deck of cards with unique integer values, and you need to arrange them initially so that when revealed using a particular algorithm, they appear in ascending order.

Given an integer array `deck` where `deck[i]` represents the value on the i-th card, you can arrange these cards in any initial order you want. All cards start face-down in a single stack.

The reveal algorithm works like this:

1. Take the top card from the deck and reveal it (remove it)
2. If any cards remain, take the new top card and move it to the bottom of the deck (without revealing it)
3. Repeat from step 1 until all cards are revealed

For example, with deck `[17,13,11,2,3,5,7]`, if you arrange it as `[2,13,3,11,5,17,7]` and follow the reveal process:
- Reveal 2, move 13 to bottom → deck is now [3,11,5,17,7,13]
- Reveal 3, move 11 to bottom → deck is now [5,17,7,13,11]
- Reveal 5, move 17 to bottom → deck is now [7,13,11,17]
- Continue until all revealed: [2,3,5,7,11,13,17] (sorted ascending)

Your task is to find an initial arrangement that makes the reveal sequence sorted in ascending order. The first element of your answer represents the top of the deck.

## Why This Matters

This problem models reverse-engineering workflows found in compiler design where you work backward from desired output to determine required input. Operating systems use similar reverse simulation for process scheduling, determining the queue order that will yield optimal execution sequences. Data streaming applications employ this pattern when buffering packets, where you need to arrange incoming data so that after processing delays and reordering, output arrives in the correct sequence. Encryption algorithms use simulation reversal for decryption, working backward from ciphertext patterns. The technique of simulating a process in reverse to construct inputs teaches you a powerful problem-solving pattern applicable to undo/redo systems, animation sequencing, and state machine design.

## Examples

**Example 1:**
- Input: `deck = [17,13,11,2,3,5,7]`
- Output: `[2,13,3,11,5,17,7]`
- Explanation: Starting with arrangement [2,13,3,11,5,17,7]:
Reveal 2, move 13 to bottom → [3,11,5,17,7,13]
Reveal 3, move 11 to bottom → [5,17,7,13,11]
Reveal 5, move 17 to bottom → [7,13,11,17]
Reveal 7, move 13 to bottom → [11,17,13]
Reveal 11, move 17 to bottom → [13,17]
Reveal 13, move 17 to bottom → [17]
Reveal 17
The reveal sequence [2,3,5,7,11,13,17] is in ascending order.

**Example 2:**
- Input: `deck = [1,1000]`
- Output: `[1,1000]`

## Constraints

- 1 <= deck.length <= 1000
- 1 <= deck[i] <= 10⁶
- All the values of deck are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The key is to work backwards. If you know the final reveal order should be sorted, simulate the process in reverse: start with sorted values and reverse the reveal operations to determine the initial deck arrangement.
</details>

<details>
<summary>Main Approach</summary>
Use a queue (deque) to simulate the reverse process. Start with indices [0, 1, 2, ..., n-1]. Sort the deck values. For each sorted value from smallest to largest, place it at the position indicated by popping from the queue, then simulate the reverse of "move to bottom" by rotating the queue. The queue tracks which positions to fill next.
</details>

<details>
<summary>Optimization Tip</summary>
Instead of simulating the forward process and trying different arrangements, the reverse simulation guarantees the correct answer in a single pass. Use collections.deque for O(1) rotation operations rather than a list.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Try All Arrangements) | O(n! × n) | O(n) | Factorial time makes this impractical |
| Optimal (Reverse Simulation) | O(n log n) | O(n) | Sorting dominates; queue operations are O(1) amortized |

## Common Mistakes

1. **Simulating forward instead of backward**
   ```python
   # Wrong: Trying to simulate forward is much harder
   def deckRevealedIncreasing(deck):
       # Attempting to figure out placement by forward simulation
       # This leads to complex logic and is error-prone
       pass

   # Correct: Reverse simulation with queue
   from collections import deque
   def deckRevealedIncreasing(deck):
       n = len(deck)
       indices = deque(range(n))
       result = [0] * n
       for card in sorted(deck):
           result[indices.popleft()] = card
           if indices:
               indices.append(indices.popleft())
       return result
   ```

2. **Using list instead of deque**
   ```python
   # Wrong: List operations are O(n) for rotation
   indices = list(range(n))
   indices.append(indices.pop(0))  # O(n) operation

   # Correct: Deque provides O(1) rotation
   from collections import deque
   indices = deque(range(n))
   indices.rotate(-1)  # O(1) operation
   ```

3. **Not handling empty queue**
   ```python
   # Wrong: Rotating when queue is empty or has one element
   indices.append(indices.popleft())  # Can fail on last element

   # Correct: Check if rotation is needed
   if indices:
       indices.append(indices.popleft())
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Reveal Cards in Decreasing Order | Medium | Sort in reverse, same simulation technique |
| K-Step Card Reveal | Medium | Move K cards to bottom instead of 1 |
| Circular Card Game | Medium | Different reveal pattern, similar simulation approach |
| Queue Reconstruction by Height | Medium | Similar reverse-engineering of queue operations |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Simulation Patterns](../../strategies/patterns/simulation.md)
