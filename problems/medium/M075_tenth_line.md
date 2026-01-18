---
id: M075
old_id: F182
slug: tenth-line
title: Tenth Line
difficulty: medium
category: medium
topics: ["shell", "text-processing"]
patterns: ["stream-processing"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M069", "M073", "E001"]
prerequisites: ["shell-scripting", "text-processing", "line-reading"]
strategy_ref: ../strategies/fundamentals/problem-solving.md
---
# Tenth Line

## Problem

Write a shell script or command that reads a text file and outputs exactly the tenth line. This is a text processing task that requires understanding command-line tools and stream processing. The file is guaranteed to have at least 10 lines, so you don't need to handle the case of insufficient lines (though in production code, you would). You can solve this using various Unix utilities like sed (stream editor), awk (pattern scanning language), head/tail combinations, or even a bash loop with a counter. Think about the difference between buffering the entire file in memory versus processing it as a stream. Consider how your approach would scale if the file were gigabytes in size - would you still read everything, or just read until you reach line 10?

## Why This Matters

Shell scripting and text processing are essential skills for data engineering, log analysis, and automation tasks. DevOps engineers regularly extract specific lines from configuration files, application logs, and system outputs using these exact techniques. ETL pipelines use stream processing commands to extract headers or specific records from massive CSV files without loading them entirely into memory. Monitoring systems parse log files to extract error messages or metrics at specific line positions. The sed and awk tools you learn here are foundational for text transformation in Unix environments, used daily by system administrators and data engineers. Understanding stream processing versus buffering teaches you important performance concepts applicable to handling large datasets, processing real-time data feeds, and building memory-efficient data pipelines. These command-line skills complement your programming knowledge and make you more versatile in production environments.

## Constraints

- The file contains at least 10 lines
- Each line contains text

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Shell Commands</summary>

This is a shell scripting problem. You need to use command-line tools to extract the 10th line. Common tools include `sed`, `awk`, `head`, `tail`, and `NR` (line number in awk). What command reads specific line numbers?

</details>

<details>
<summary>🎯 Hint 2: Multiple Solutions</summary>

Several approaches work:
1. `sed`: Stream editor that can print specific lines
2. `awk`: Pattern scanning with built-in line number variable
3. `head + tail`: Combine to extract specific line
4. `read` loop: Iterate to 10th line

Which is most concise?

</details>

<details>
<summary>📝 Hint 3: Implementation Examples</summary>

Solution 1 (sed):
```bash
sed -n '10p' file.txt
```

Solution 2 (awk):
```bash
awk 'NR==10' file.txt
```

Solution 3 (head + tail):
```bash
head -n 10 file.txt | tail -n 1
```

Solution 4 (read loop):
```bash
cnt=0
while read line; do
  cnt=$((cnt+1))
  if [ $cnt -eq 10 ]; then
    echo $line
    break
  fi
done < file.txt
```

Most concise: `sed -n '10p' file.txt`

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Read All Lines | O(n) | O(n) | Store all lines in memory |
| **sed/awk (Stream)** | **O(n)** | **O(1)** | Process line by line |
| head + tail | O(10) = O(1) | O(10) = O(1) | Only reads first 10 lines |

Note: n is total number of lines in file.

## Common Mistakes

### 1. Not Handling File with < 10 Lines

```bash
# WRONG: No error handling
sed -n '10p' file.txt

# CORRECT: Check line count or use conditional
if [ $(wc -l < file.txt) -ge 10 ]; then
  sed -n '10p' file.txt
fi
```

### 2. Incorrect sed Syntax

```bash
# WRONG: Missing -n flag (prints all lines + 10th)
sed '10p' file.txt

# CORRECT: Use -n to suppress default output
sed -n '10p' file.txt
```

### 3. Off-by-One in Counting

```bash
# WRONG: NR starts at 1, not 0
awk 'NR==9' file.txt  # This prints 9th line

# CORRECT: NR==10 for 10th line
awk 'NR==10' file.txt
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Print N-th Line | Variable line number | Use variable in sed/awk |
| Print Last Line | Print final line | `tail -n 1` or `awk 'END{print}'` |
| Print Range | Lines 10-20 | `sed -n '10,20p'` or `awk 'NR>=10 && NR<=20'` |
| Print Matching Line | Line with specific pattern | `grep pattern file.txt | sed -n '10p'` |

## Practice Checklist

- [ ] Handles empty/edge cases (file with < 10 lines)
- [ ] Can explain approach in 2 min (sed/awk line extraction)
- [ ] Can code solution in 5 min
- [ ] Can discuss multiple shell approaches
- [ ] Understands stream processing vs buffering

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Problem Solving Fundamentals](../../strategies/fundamentals/problem-solving.md)
