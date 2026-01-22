---
title: 5-Minute Warmup Problems
category: problem-sets
difficulty: easy
estimated_time_per_problem: 5
problem_count: 20
total_time_minutes: 100
---

# 5-Minute Warmup Problems

## Purpose

Quick daily warmup problems to build coding fluency and pattern recognition. Each problem should take approximately 5 minutes to solve once you've practiced it.

## How to Use This Set

### Daily Warmup Routine
1. **Pick 3-5 problems** from the list
2. **Set timer for 5 minutes** per problem
3. **Code without hints** first
4. **Review solution** if you get stuck
5. **Note patterns** you recognized

### Goals
- **Speed**: Solve familiar patterns quickly
- **Accuracy**: Write correct code on first attempt
- **Confidence**: Build momentum before harder problems
- **Pattern recognition**: Instantly identify problem type

---

## Problem List

### 1. Two Sum
- **ID**: E001
- **Pattern**: Hash table, complement search
- **Time**: 5 minutes
- **Approach**: Use hash map to store seen numbers, check for complement

**Quick Solution Pattern:**
```python
seen = {}
for i, num in enumerate(nums):
    complement = target - num
    if complement in seen:
        return [seen[complement], i]
    seen[num] = i
```

---

### 2. Valid Parentheses
- **ID**: E014
- **Pattern**: Stack matching
- **Time**: 5 minutes
- **Approach**: Push opening brackets, pop and match closing brackets

**Key Insight:** Stack is perfect for matching pairs

---

### 3. Merge Two Sorted Lists
- **ID**: E015
- **Pattern**: Two pointers, linked list
- **Time**: 5 minutes
- **Approach**: Compare heads, advance smaller pointer

**Edge Cases:** One list empty, lists of different lengths

---

### 4. Remove Duplicates from Sorted Array
- **ID**: E016
- **Pattern**: Two pointers, in-place modification
- **Time**: 5 minutes
- **Approach**: Slow pointer for unique position, fast pointer to scan

**In-place trick:** Overwrite with unique elements

---

### 5. Search Insert Position
- **ID**: E021
- **Pattern**: Binary search
- **Time**: 5 minutes
- **Approach**: Standard binary search, return left pointer if not found

**Binary Search Template:** Remember `left <= right` loop

---

### 6. Plus One
- **ID**: E030
- **Pattern**: Array manipulation, carry handling
- **Time**: 5 minutes
- **Approach**: Start from end, handle carry, edge case: all 9s

**Edge Case:** [9,9,9] becomes [1,0,0,0]

---

### 7. Add Binary
- **ID**: E031
- **Pattern**: String manipulation, carry addition
- **Time**: 5 minutes
- **Approach**: Two pointers from end, track carry

**Similar to:** Add Two Numbers (but strings, not lists)

---

### 8. Sqrt(x)
- **ID**: E032
- **Pattern**: Binary search on answer
- **Time**: 5 minutes
- **Approach**: Binary search for largest k where k*k <= x

**Key Insight:** Binary search not just for arrays

---

### 9. Climbing Stairs
- **ID**: E033
- **Pattern**: 1D DP, Fibonacci
- **Time**: 5 minutes
- **Approach**: `dp[i] = dp[i-1] + dp[i-2]`, can optimize to O(1) space

**Quick Pattern:** Recognize Fibonacci immediately

---

### 10. Merge Sorted Array
- **ID**: E038
- **Pattern**: Two pointers, merge from end
- **Time**: 5 minutes
- **Approach**: Fill from end to avoid overwriting

**Trick:** Work backwards to avoid extra space

---

### 11. Same Tree
- **ID**: E043
- **Pattern**: Tree recursion
- **Time**: 5 minutes
- **Approach**: Base cases for null, then check val and recurse

**Tree Recursion Template:** Check null, check value, recurse left/right

---

### 12. Symmetric Tree
- **ID**: E044
- **Pattern**: Tree recursion, mirror check
- **Time**: 5 minutes
- **Approach**: Helper function comparing left subtree and right subtree

**Similar to:** Same Tree, but mirror comparison

---

### 13. Maximum Depth of Binary Tree
- **ID**: E045
- **Pattern**: Tree recursion, simple
- **Time**: 3-5 minutes
- **Approach**: `1 + max(depth(left), depth(right))`

**Simplest tree recursion:** Great warmup

---

### 14. Balanced Binary Tree
- **ID**: E046
- **Pattern**: Tree recursion with state
- **Time**: 5 minutes
- **Approach**: Track height and balance in one pass

**Optimization:** Check balance while computing height

---

### 15. Pascal's Triangle
- **ID**: E049
- **Pattern**: 2D array generation
- **Time**: 5 minutes
- **Approach**: Each element is sum of two above it

**Pattern:** `row[j] = prev[j-1] + prev[j]`

---

### 16. Single Number
- **ID**: Find in problems/easy/ (search "single number")
- **Pattern**: Bit manipulation, XOR
- **Time**: 3 minutes
- **Approach**: XOR all numbers (duplicates cancel)

**XOR Property:** `a ^ a = 0`, `a ^ 0 = a`

---

### 17. Linked List Cycle
- **ID**: Find in problems/easy/ (search "linked list cycle")
- **Pattern**: Two pointers, fast/slow
- **Time**: 5 minutes
- **Approach**: Fast moves 2x, slow moves 1x, they meet if cycle

**Floyd's Algorithm:** Classic slow/fast pointer

---

### 18. Reverse Linked List
- **ID**: Find in problems/easy/ (search "reverse linked list")
- **Pattern**: Linked list manipulation
- **Time**: 5 minutes
- **Approach**: Three pointers: prev, current, next

**Must-know pattern:** Reverse pointers while traversing

---

### 19. Palindrome Number
- **ID**: E005
- **Pattern**: Math, digit manipulation
- **Time**: 5 minutes
- **Approach**: Reverse half the number, compare

**Optimization:** Don't convert to string

---

### 20. Roman to Integer
- **ID**: E008
- **Pattern**: String parsing, mapping
- **Time**: 5 minutes
- **Approach**: Map chars to values, handle subtraction cases

**Key Cases:** IV, IX, XL, XC, CD, CM (smaller before larger means subtract)

---

## Warmup Routine Suggestions

### Morning Warmup (15-20 minutes)
Pick 3-4 problems from different patterns:
- 1 array problem (Two Sum, Remove Duplicates)
- 1 linked list problem (Merge Lists, Reverse List)
- 1 tree problem (Same Tree, Max Depth)
- 1 pattern-specific (Binary Search, Stack, XOR)

### Before Interview (10 minutes)
Pick 2 problems you know well:
- 1 easy array/hash problem (confidence boost)
- 1 easy tree/linked list problem (warm up recursion)

### Pattern-Focused Warmup
**Arrays & Hash Tables:** 1, 4, 6, 7, 10
**Linked Lists:** 3, 18
**Trees:** 11, 12, 13, 14
**Binary Search:** 5, 8
**Bit Manipulation:** 16
**DP:** 9, 15
**Two Pointers:** 4, 17

---

## Speed Improvement Tips

### First Attempt (>5 min)
- **Read carefully:** Understand constraints
- **Think before coding:** Plan approach
- **Test with examples:** Walk through logic

### Second Attempt (≈5 min)
- **Recognize pattern:** Instant pattern match
- **Use template:** Apply known solution structure
- **Code fluently:** Muscle memory for common patterns

### Mastery (<5 min)
- **Immediate recognition:** Know solution on sight
- **Type quickly:** No hesitation on syntax
- **Skip examples:** Code directly, test after

---

## Common Patterns Quick Reference

### Hash Table (O(n) time, O(n) space)
```python
seen = {}
for item in items:
    if target - item in seen:
        return True
    seen[item] = True
```

### Two Pointers (O(n) time, O(1) space)
```python
left, right = 0, len(arr) - 1
while left < right:
    if condition:
        left += 1
    else:
        right -= 1
```

### Binary Search (O(log n) time, O(1) space)
```python
left, right = 0, len(arr) - 1
while left <= right:
    mid = (left + right) // 2
    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        left = mid + 1
    else:
        right = mid - 1
return left  # Insert position
```

### Stack Matching (O(n) time, O(n) space)
```python
stack = []
for char in s:
    if is_opening(char):
        stack.append(char)
    else:
        if not stack or not matches(stack[-1], char):
            return False
        stack.pop()
return len(stack) == 0
```

### Tree Recursion (O(n) time, O(h) space)
```python
def helper(node):
    if not node:
        return base_case
    left_result = helper(node.left)
    right_result = helper(node.right)
    return combine(node.val, left_result, right_result)
```

### Fast/Slow Pointers (O(n) time, O(1) space)
```python
slow = fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
    if slow == fast:
        return True  # Cycle detected
return False
```

---

## Progress Tracking

### Week 1: Learning
- [ ] Solve each problem once
- [ ] Understand all patterns
- [ ] Note which took longest

### Week 2: Speed Building
- [ ] Resolve each problem
- [ ] Aim for <7 minutes each
- [ ] Focus on slow ones

### Week 3: Mastery
- [ ] Random selection
- [ ] Target 5 minutes each
- [ ] Mix patterns

### Week 4: Maintenance
- [ ] 3-5 random problems daily
- [ ] All under 5 minutes
- [ ] Teach patterns to others

---

## Completion Checklist

### Speed Benchmarks
- [ ] All 20 problems completed at least once
- [ ] 15+ problems under 7 minutes
- [ ] 10+ problems under 5 minutes
- [ ] 5+ problems under 3 minutes

### Pattern Recognition
- [ ] Can identify pattern from problem statement
- [ ] Know which template to apply
- [ ] Remember edge cases for each pattern

### Code Quality
- [ ] Writing correct code on first attempt (80%+ of time)
- [ ] Handling edge cases without reminder
- [ ] Clean, readable code

---

## Next Steps

After mastering these warmups:
1. **Mixed Practice**: Try mixed-difficulty sets (easy-mix-001.md)
2. **Pattern Drills**: Deep dive into specific patterns (dp-drill.md, backtracking-drill.md)
3. **Timed Challenges**: Simulate interview conditions
4. **Medium Problems**: Graduate to 15-20 minute problems

**Related Practice Sets:**
- Easy Mix 001 (mixed-practice/easy-mix-001.md)
- Medium Mix 001 (mixed-practice/medium-mix-001.md)
- Pattern-Specific Drills (pattern-drills/)

**Strategy References:**
- [Arrays and Strings](../../prerequisites/arrays-and-strings.md)
- [Hash Tables](../../prerequisites/hash-tables.md)
- [Binary Search](../../strategies/patterns/binary-search.md)
- [Two Pointers](../../strategies/patterns/two-pointers.md)
