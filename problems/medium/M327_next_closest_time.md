---
id: M327
old_id: A148
slug: next-closest-time
title: Next Closest Time
difficulty: medium
category: medium
topics: ["string", "enumeration"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["M031", "E415", "M556"]
prerequisites: ["string-manipulation", "enumeration", "time-arithmetic"]
---
# Next Closest Time

## Problem

Given a time in 24-hour "HH:MM" format, find the next closest time using only the digits that appear in the input time. You can reuse each digit as many times as needed.

For example, given "19:34", the available digits are {1, 9, 3, 4}. The next valid time you can form is "19:39" (just 5 minutes later), even though you could technically form "19:41" or "19:43". The key is finding the chronologically next time, not just any valid time.

The challenge becomes interesting when you can't simply increment: if the input is "23:59" and your available digits are {2, 3, 5, 9}, what's the next time? You can't make "23:60" or "24:00". Instead, you wrap around to the next day, and the earliest time you can form is "22:22" (all 2s).

Important constraints to keep in mind:

- **24-hour format**: Hours range from 00-23, minutes from 00-59
- **Reusable digits**: The digit 3 in "13:35" can be used multiple times in the result
- **Well-formed input**: You'll always receive valid times with proper zero-padding (like "01:34", never "1:34")
- **Next time, not nearest**: "19:39" comes after "19:34", but "19:33" does not (even though numerically closer)

One approach is to simulate time incrementing minute by minute, checking if each new time can be formed from your digit set. With at most 1440 minutes in a day, this is feasible. A more elegant approach is to treat it as a digit permutation problem: generate all valid times from your digit set, sort them, and find the one immediately after your input time.

## Why This Matters

This problem teaches constrained enumeration: exploring possibilities within specific rules. The technique appears in scheduling systems (finding next available slot), digital clock displays, and time-based job schedulers.

The wraparound logic (handling midnight boundary) is common in circular data structures, modular arithmetic, and any system dealing with cyclic time. Understanding when to use simulation versus enumeration is a valuable problem-solving skill.

The problem also reinforces careful handling of edge cases and boundary conditions, essential skills for robust software development.

## Examples

**Example 1:**
- Input: `time = "19:34"`
- Output: `"19:39"`
- Explanation: Using digits **1**, **9**, **3**, **4**, the soonest future time is **19:39**, just 5 minutes ahead. Note that **19:33** is not closer because it would require going back nearly 24 hours.

**Example 2:**
- Input: `time = "23:59"`
- Output: `"22:22"`
- Explanation: From the available digits **2**, **3**, **5**, **9**, the nearest time is **22:22**. Since this is numerically earlier, it represents the following day's time.

## Constraints

- time.length == 5
- time is a valid time in the form "HH:MM".
- 0 <= HH < 24
- 0 <= MM < 60

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Simulate Time Increments</summary>

The brute force approach is to increment the time minute by minute and check if the new time can be formed using only the available digits:

```python
def nextClosestTime(time):
    digits = set(time.replace(':', ''))

    def is_valid(t):
        return all(c in digits for c in t if c != ':')

    # Convert to minutes
    h, m = map(int, time.split(':'))
    current_min = h * 60 + m

    # Try next 1440 minutes (24 hours)
    for i in range(1, 1441):
        next_min = (current_min + i) % 1440
        h, m = next_min // 60, next_min % 60
        next_time = f"{h:02d}:{m:02d}"
        if is_valid(next_time):
            return next_time
```

Time: O(1) since we check at most 1440 times.

</details>

<details>
<summary>Hint 2: Enumerate Valid Times</summary>

Generate all possible times using the available digits, then find the one immediately after the current time:

```python
def nextClosestTime(time):
    digits = [time[0], time[1], time[3], time[4]]

    # Generate all possible times
    valid_times = set()
    for h1 in digits:
        for h2 in digits:
            for m1 in digits:
                for m2 in digits:
                    hours = int(h1 + h2)
                    minutes = int(m1 + m2)
                    if hours < 24 and minutes < 60:
                        valid_times.add(f"{hours:02d}:{minutes:02d}")

    # Sort and find next
    sorted_times = sorted(valid_times)
    idx = sorted_times.index(time)
    return sorted_times[(idx + 1) % len(sorted_times)]
```

Time: O(1) since we generate at most 4⁴ = 256 combinations.

</details>

<details>
<summary>Hint 3: Greedy Construction from Right to Left</summary>

Try to increment the time starting from the rightmost digit:

1. **Minute ones place**: Try to find the smallest digit > current that's valid
2. **Minute tens place**: If step 1 fails, reset minute ones to smallest digit and increment tens
3. **Hour ones place**: If step 2 fails, reset minutes and try hour ones
4. **Hour tens place**: If step 3 fails, reset everything and increment hour tens
5. **Wrap around**: If all fail, return the smallest valid time (next day)

```python
def nextClosestTime(time):
    digits = sorted(set(time.replace(':', '')))
    time_list = list(time)

    # Try positions from right to left: [H][H]:[M][M]
    for i in [4, 3, 1, 0]:  # Skip colon at index 2
        for d in digits:
            time_list[i] = d
            candidate = ''.join(time_list)

            # Check if valid and greater than original
            h, m = map(int, candidate.split(':'))
            if h < 24 and m < 60 and candidate > time:
                return candidate

        # Reset to smallest if we need to carry
        time_list[i] = digits[0]

    return ''.join(time_list)  # Next day (all smallest digits)
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Simulate Minutes | O(1440) = O(1) | O(1) | Check each minute in 24 hours |
| Enumerate All Times | O(256) = O(1) | O(1) | 4⁴ combinations, sort and search |
| Greedy Construction | O(16) = O(1) | O(1) | 4 positions × 4 digits max |

## Common Mistakes

**Mistake 1: Not Handling Wraparound**
```python
# Wrong: Only looking forward in same day
def nextClosestTime(time):
    # ... find next valid time
    # What if no valid time exists in same day?

# Correct: Wrap to next day if needed
# Return smallest valid time when wrapping
```

**Mistake 2: Incorrect Digit Extraction**
```python
# Wrong: Including the colon character
digits = set(time)  # Contains ':'

# Correct: Only extract digit characters
digits = set(time.replace(':', ''))
# Or: digits = {time[0], time[1], time[3], time[4]}
```

**Mistake 3: Not Validating Hours and Minutes**
```python
# Wrong: Assuming all 4-digit combinations are valid
next_time = h1 + h2 + ':' + m1 + m2
return next_time

# Correct: Check hour < 24 and minute < 60
hours = int(h1 + h2)
minutes = int(m1 + m2)
if hours < 24 and minutes < 60:
    # valid time
```

**Mistake 4: String Comparison Without Padding**
```python
# Wrong: Comparing "1:05" > "19:34" gives wrong result
if candidate > time:
    return candidate

# Correct: Ensure zero-padding (already handled if using f"{h:02d}:{m:02d}")
# Or convert to minutes for numeric comparison
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Previous closest time | Easy | Decrement instead of increment |
| Next time with different digits | Medium | Change digit set constraint |
| 12-hour format with AM/PM | Medium | Additional format handling |
| Return all possible times | Easy | Generate and return all valid combinations |
| Next closest with k digit changes | Hard | Limit digit substitutions |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Analyzed time/space complexity
- [ ] Solved without hints
- [ ] Tested edge cases (same digits, wraparound, midnight)
- [ ] Reviewed alternative approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 1 week
- [ ] Could explain solution to others
