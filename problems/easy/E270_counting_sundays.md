---
id: E270
euler_id: 19
slug: counting-sundays
title: Counting Sundays
difficulty: easy
category: easy
topics: ["math", "dates"]
patterns: []
estimated_time_minutes: 15
frequency: low
related_problems: ["E008", "M621"]
prerequisites: ["math-basics", "modulo-arithmetic"]
---

# Counting Sundays

## Problem

Count how many times the first day of a month falls on a Sunday within a given date range.

For example, between January 1, 1901 and December 31, 2000 (the entire 20th century), how many months started on a Sunday?

You need to account for:
- Different month lengths (28/29/30/31 days)
- Leap years (divisible by 4, except century years unless divisible by 400)
- The actual day of the week for the starting date

You may be given that a specific date falls on a specific day of the week (e.g., January 1, 1900 was a Monday), and you need to calculate from there.

## Why This Matters

Date calculations are ubiquitous in software engineering: scheduling systems, calendar applications, financial calculations (interest accrual), and time-series analysis all require accurate date arithmetic. This problem teaches you to handle the irregularities in the Gregorian calendar programmatically.

The key algorithmic patterns here are:
1. **Modular arithmetic** for cycling through days of the week (7-day cycle)
2. **Conditional logic** for different month lengths and leap years
3. **Iteration vs. formula** trade-off: simulate day-by-day or use mathematical shortcuts

While you could use library functions (datetime in Python, Date in JavaScript), understanding the underlying mechanics teaches you about:
- Zeller's congruence (formula for day of week)
- Doomsday algorithm (mental calendar calculation)
- The business logic behind date calculations in production systems

This problem also introduces the concept of using a reference point (anchor date with known day) and calculating forward, a pattern used in distributed systems for time synchronization and in astronomy for Julian day calculations.

## Examples

**Example 1:**

- Input: `start = Jan 1, 1901 (Tuesday), end = Dec 31, 1901`
- Output: `2`
- Explanation: In 1901, there are 2 months that start on Sunday

**Example 2:**

- Input: `start = Jan 1, 1900 (Monday), end = Dec 31, 1900`
- Output: Count of Sundays on 1st of months in 1900
- Explanation: March 1 and June 1 might be Sundays (depends on calculation)

**Example 3:**

- Input: `start = Jan 1, 1901, end = Dec 31, 2000`
- Output: `171`
- Explanation: Total Sunday-starting months in the 20th century

## Constraints

- Start and end dates are given
- May be given an anchor date with known day of week
- Date range typically spans years or decades
- Use Gregorian calendar rules

## Think About

1. Do you need to track the actual date, or just the day of the week?
2. How do you determine if a year is a leap year?
3. Can you calculate the day of the week without iterating every single day?
4. What's the most readable vs. most efficient approach?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Leap year determination</summary>

**Leap year rules:**
- Divisible by 4: **usually** a leap year
- BUT if divisible by 100: **not** a leap year
- EXCEPT if divisible by 400: **is** a leap year

```python
def is_leap_year(year):
    if year % 400 == 0:
        return True
    if year % 100 == 0:
        return False
    if year % 4 == 0:
        return True
    return False
```

**Examples:**
- 2000: Leap (divisible by 400)
- 1900: Not leap (divisible by 100, not by 400)
- 2004: Leap (divisible by 4)
- 2001: Not leap

**Days in February:** 29 if leap year, 28 otherwise

</details>

<details>
<summary>🎯 Hint 2: Day-by-day simulation</summary>

Start from a known day (e.g., Jan 1, 1900 = Monday = 1).

**Track:**
- Current day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
- Current year, month, day

**Algorithm:**
```python
count = 0
day_of_week = 1  # Jan 1, 1900 is Monday

for year in range(start_year, end_year + 1):
    for month in range(1, 13):
        # Check if first day of this month is Sunday
        if day_of_week == 0 and year >= 1901:  # Only count from 1901
            count += 1

        # Advance day_of_week by number of days in this month
        days_in_month = get_days_in_month(year, month)
        day_of_week = (day_of_week + days_in_month) % 7

return count
```

**Key insight:** You don't need to iterate every day, just every month. Advance the day-of-week counter by the month length.

</details>

<details>
<summary>📝 Hint 3: Using formulas (Zeller's Congruence)</summary>

**Zeller's formula** calculates day of week for any date:

```
h = (day + ⌊13(month+1)/5⌋ + year + ⌊year/4⌋ - ⌊year/100⌋ + ⌊year/400⌋) mod 7
```

Where:
- h = day of week (0=Saturday, 1=Sunday, ..., 6=Friday)
- For Zeller: January and February are months 13 and 14 of previous year

**Alternative: Use datetime library:**

```python
from datetime import datetime

count = 0
for year in range(1901, 2001):
    for month in range(1, 13):
        if datetime(year, month, 1).weekday() == 6:  # Sunday = 6 in weekday()
            count += 1
```

**Note:** In Python's datetime, Monday=0, Sunday=6. Adjust accordingly.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Day simulation** | **O(days)** | **O(1)** | Slow for large ranges |
| **Month simulation** | **O(months)** | **O(1)** | Much faster; optimal for this problem |
| Formula per month | O(months) | O(1) | Fastest; requires formula knowledge |
| Datetime library | O(months) | O(1) | Simplest; relies on library |

Where:
- days = total days in range (~36,500 for 100 years)
- months = total months in range (~1,200 for 100 years)

**Why Month Simulation Wins:**

- Only O(months) iterations, not O(days)
- No external dependencies
- Easy to understand and debug

---

## Common Mistakes

### 1. Incorrect leap year logic

```python
# WRONG: Forgetting century rule
def is_leap(year):
    return year % 4 == 0  # 1900 incorrectly returns True!

# CORRECT: Full rules
def is_leap(year):
    return year % 400 == 0 or (year % 4 == 0 and year % 100 != 0)
```

### 2. Off-by-one in date ranges

```python
# WRONG: Missing last year
for year in range(1901, 2000):  # Misses year 2000!

# CORRECT:
for year in range(1901, 2001):  # Includes 2000
```

### 3. Wrong day numbering

```python
# Different conventions:
# ISO/datetime.weekday(): Monday=0, Sunday=6
# Zeller/custom: Sunday=0, Saturday=6

# Make sure you're consistent!
if day == 0:  # Is this Sunday or Monday? Check your convention!
```

### 4. Hardcoding days in month

```python
# WRONG: Not handling leap years
days_in_feb = 28  # Always 28? No!

# CORRECT:
days_in_feb = 29 if is_leap_year(year) else 28
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Different target day** | Count Mondays/Fridays | Change condition to target day |
| **Last day of month** | Count Sundays on month end | Adjust to last day instead of first |
| **Specific day of month** | E.g., 13th falls on Friday | Check day 13 of each month |
| **Business days** | Skip weekends | Add weekend-skipping logic |
| **Different calendar** | Julian calendar | Change leap year rules |

**Count Friday the 13ths:**

```python
count = 0
for year in range(start_year, end_year + 1):
    for month in range(1, 13):
        date = datetime(year, month, 13)
        if date.weekday() == 4:  # Friday
            count += 1
```

**Count last Sundays:**

```python
# For last day, check last day of each month
days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
for year in ...:
    days_in_month[1] = 29 if is_leap(year) else 28
    for month in range(1, 13):
        last_day = days_in_month[month - 1]
        date = datetime(year, month, last_day)
        if date.weekday() == 6:  # Sunday
            count += 1
```

---

## Practice Checklist

**Correctness:**

- [ ] Handles leap years correctly (2000, 1900, 2004)
- [ ] Counts correct target day (Sunday)
- [ ] Includes all months in range
- [ ] Handles start/end boundaries correctly

**Optimization:**

- [ ] Uses month iteration, not day iteration
- [ ] O(months) time complexity
- [ ] Minimal code duplication

**Interview Readiness:**

- [ ] Can explain leap year rules in 1 minute
- [ ] Can code solution in 8 minutes
- [ ] Can discuss library vs. manual calculation
- [ ] Identified edge cases (leap years, century boundaries)

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement Friday the 13th variant
- [ ] Day 14: Explain Zeller's formula to someone else
- [ ] Day 30: Quick review

---

**Strategy Reference:** See [Modular Arithmetic](../../prerequisites/number-theory.md) | [Date/Time Algorithms](../../strategies/fundamentals/math-basics.md)
