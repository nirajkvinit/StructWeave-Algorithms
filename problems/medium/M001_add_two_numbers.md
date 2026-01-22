---
id: M001
old_id: F002
slug: add-two-numbers
title: Add Two Numbers
difficulty: medium
category: medium
topics: ["linked-list", "math"]
patterns: ["linked-list-traversal", "digit-by-digit-processing"]
estimated_time_minutes: 25
frequency: high
related_problems: ["M066", "E030", "H002"]
prerequisites: ["linked-list-basics", "basic-arithmetic"]
strategy_ref: ../prerequisites/linked-lists.md
---

# Add Two Numbers

## Problem

Imagine you have two numbers, but instead of storing them in the usual way, each digit lives in a node of a linked list. The twist? The digits are stored in reverse order, meaning the ones place comes first, then tens, then hundreds, and so on. Your task is to add these two numbers together and return the sum as a new linked list, also in reverse order. For example, if you have 342 (stored as 2→4→3) and 465 (stored as 5→6→4), you should return 807 (stored as 7→0→8). The reverse order might seem strange at first, but it actually makes the addition easier since you naturally add from right to left anyway. Edge cases to consider: what if one number is longer than the other? What if adding two digits produces a carry that extends beyond both lists?

```
Example visualization:
l1: 2 → 4 → 3    represents 342
l2: 5 → 6 → 4    represents 465
                  ─────────────
Sum: 7 → 0 → 8    represents 807

Addition process (right to left = head to tail):
  342
+ 465
─────
  807
```

## Why This Matters

This problem is a cornerstone for understanding linked list manipulation combined with arithmetic simulation. In real-world systems, you can't always rely on built-in integer types when numbers exceed standard limits (think 100+ digit numbers in cryptography). Languages implement BigInteger libraries using exactly this kind of digit-by-digit processing. The dummy node technique you'll use here appears everywhere in linked list problems, making tricky edge cases trivial. Financial systems use similar approaches for decimal arithmetic where floating-point precision errors are unacceptable. Mastering carry propagation here prepares you for more complex arithmetic algorithms. This problem frequently appears in interviews because it tests multiple skills simultaneously: pointer management, edge case handling, and algorithmic thinking without advanced data structures.

## Examples

**Example 1:**
- Input: `l1 = [2,4,3], l2 = [5,6,4]`
- Output: `[7,0,8]`
- Explanation: 342 + 465 = 807

**Example 2:**
- Input: `l1 = [0], l2 = [0]`
- Output: `[0]`
- Explanation: 0 + 0 = 0

**Example 3:**
- Input: `l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]`
- Output: `[8,9,9,9,0,0,0,1]`
- Explanation: 9999999 + 9999 = 10009998

## Constraints

- The number of nodes in each linked list is in the range [1, 100].
- 0 <= Node.val <= 9
- It is guaranteed that the list represents a number that does not have leading zeros.

---

## Test Cases

Copy-paste friendly test cases for your IDE:

```json
[
  {
    "input": { "l1": [2, 4, 3], "l2": [5, 6, 4] },
    "expected": [7, 0, 8],
    "description": "342 + 465 = 807"
  },
  {
    "input": { "l1": [0], "l2": [0] },
    "expected": [0],
    "description": "Zero case"
  },
  {
    "input": { "l1": [9, 9, 9, 9, 9, 9, 9], "l2": [9, 9, 9, 9] },
    "expected": [8, 9, 9, 9, 0, 0, 0, 1],
    "description": "Different lengths with carry overflow"
  },
  {
    "input": { "l1": [1], "l2": [9, 9, 9] },
    "expected": [0, 0, 0, 1],
    "description": "1 + 999 = 1000 (carry propagation)"
  },
  {
    "input": { "l1": [5], "l2": [5] },
    "expected": [0, 1],
    "description": "Single digit with carry"
  },
  {
    "input": { "l1": [2, 4, 9], "l2": [5, 6, 4, 9] },
    "expected": [7, 0, 4, 0, 1],
    "description": "Different lengths"
  }
]
```

**CSV Format:**
```csv
l1,l2,expected,description
"[2,4,3]","[5,6,4]","[7,0,8]","342 + 465 = 807"
"[0]","[0]","[0]","Zero case"
"[9,9,9,9,9,9,9]","[9,9,9,9]","[8,9,9,9,0,0,0,1]","Different lengths with carry overflow"
"[1]","[9,9,9]","[0,0,0,1]","1 + 999 = 1000"
"[5]","[5]","[0,1]","Single digit with carry"
```

---

## Think About

1. Why is reverse order actually helpful for addition?
2. What happens when digits sum to 10 or more?
3. What if lists have different lengths?
4. What if there's a carry after processing all nodes?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Why reverse order helps</summary>

Think about how you add numbers by hand: you start from the rightmost digit (least significant).

Since the linked lists are already in reverse order, the **head is the least significant digit** - exactly where you'd start adding!

**Think about:**
- How would you handle it if digits were stored normally (most significant first)?
- What makes this reversed format convenient?

</details>

<details>
<summary>🎯 Hint 2: Handle the carry</summary>

When two digits sum to 10 or more, you keep the ones digit and carry the tens digit.

```
  9
+ 5
───
 14  →  Keep 4, carry 1
```

You need a `carry` variable that persists across iterations. For each position:
- `total = digit1 + digit2 + carry`
- `new_digit = total % 10`
- `carry = total // 10`

**Edge case:** What if there's a carry left after both lists are exhausted?

</details>

<details>
<summary>📝 Hint 3: Dummy node algorithm</summary>

```
create dummy_head node (simplifies returning result)
current = dummy_head
carry = 0

while l1 OR l2 OR carry:
    # Get values (0 if list exhausted)
    val1 = l1.val if l1 else 0
    val2 = l2.val if l2 else 0

    # Calculate sum and carry
    total = val1 + val2 + carry
    carry = total // 10
    digit = total % 10

    # Create new node
    current.next = ListNode(digit)
    current = current.next

    # Advance pointers if possible
    l1 = l1.next if l1 else None
    l2 = l2.next if l2 else None

return dummy_head.next
```

**Why dummy node?** Avoids special-casing the first node creation.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Convert to int, add, convert back | O(n + m) | O(max(n,m)) | Simple but may overflow |
| **Direct list processing** | **O(max(n,m))** | **O(max(n,m))** | Handles arbitrary length |
| In-place modification | O(max(n,m)) | O(1) | Destroys input lists |

**Why direct processing wins:**
- No integer overflow concerns (handles 100+ digit numbers)
- Single pass through both lists
- Clean, maintainable code

**Space breakdown:**
- New list: O(max(n, m) + 1) nodes (possible extra node for final carry)
- Variables: O(1)

---

## Common Mistakes

### 1. Forgetting the final carry
```python
# WRONG: Misses cases like 5 + 5 = 10
while l1 or l2:
    # ... process ...
# carry might still be 1!

# CORRECT: Include carry in loop condition
while l1 or l2 or carry:
    # ... process ...
```

### 2. Null pointer exceptions
```python
# WRONG: Crashes when lists have different lengths
total = l1.val + l2.val + carry
l1 = l1.next  # What if l1 is None?

# CORRECT: Check before accessing
val1 = l1.val if l1 else 0
val2 = l2.val if l2 else 0
if l1: l1 = l1.next
if l2: l2 = l2.next
```

### 3. Not using a dummy head
```python
# MESSY: Special case for first node
if head is None:
    head = ListNode(digit)
    current = head
else:
    current.next = ListNode(digit)
    current = current.next

# CLEAN: Dummy head pattern
dummy = ListNode(0)
current = dummy
# ... loop creates current.next ...
return dummy.next
```

### 4. Incorrect carry calculation
```python
# WRONG: Integer division issues
carry = total / 10  # This is float division!

# CORRECT: Use integer division
carry = total // 10
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Digits in normal order** | Most significant first | Reverse lists first, or use stack |
| **Return as integer** | Output is number | Same algo, but beware overflow |
| **Subtract numbers** | l1 - l2 | Handle borrow instead of carry |
| **Multiply numbers** | l1 * l2 | Use long multiplication algorithm |
| **Add to existing list** | Modify in-place | Track which list to extend |

**Normal order variation:**
```
# If digits are in normal order (most significant first):
# Option 1: Reverse both lists, add, reverse result
# Option 2: Use stacks to simulate reverse traversal

def addTwoNumbersNormalOrder(l1, l2):
    stack1, stack2 = [], []
    while l1:
        stack1.append(l1.val)
        l1 = l1.next
    while l2:
        stack2.append(l2.val)
        l2 = l2.next

    carry = 0
    result = None
    while stack1 or stack2 or carry:
        val1 = stack1.pop() if stack1 else 0
        val2 = stack2.pop() if stack2 else 0
        total = val1 + val2 + carry
        carry = total // 10

        # Prepend new node (building in reverse)
        node = ListNode(total % 10)
        node.next = result
        result = node

    return result
```

---

## Visual Walkthrough

```
l1: 2 → 4 → 3
l2: 5 → 6 → 4

Step 1: Process first digits
  l1=2, l2=5, carry=0
  total = 2 + 5 + 0 = 7
  digit = 7, carry = 0
  result: 7 →

Step 2: Process second digits
  l1=4, l2=6, carry=0
  total = 4 + 6 + 0 = 10
  digit = 0, carry = 1
  result: 7 → 0 →

Step 3: Process third digits
  l1=3, l2=4, carry=1
  total = 3 + 4 + 1 = 8
  digit = 8, carry = 0
  result: 7 → 0 → 8

Step 4: All exhausted, carry=0
  Exit loop

Final: 7 → 0 → 8  (represents 807)
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles equal length lists
- [ ] Handles different length lists
- [ ] Handles final carry (e.g., 5+5, 99+1)
- [ ] Handles single node lists
- [ ] Handles zeros correctly

**Code Quality:**
- [ ] Uses dummy head pattern
- [ ] Clean carry propagation
- [ ] No null pointer exceptions
- [ ] Readable variable names

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 10 minutes
- [ ] Can discuss time/space complexity
- [ ] Can handle follow-up variations

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve normal-order variation
- [ ] Day 14: Explain to someone else
- [ ] Day 30: Quick review

---

**Strategy**: See [Linked List Pattern](../../prerequisites/linked-lists.md)
