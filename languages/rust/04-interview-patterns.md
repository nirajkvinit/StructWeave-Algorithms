# Algorithm Patterns in Rust

> The 17 patterns that solve 90% of coding interview problems

This guide implements the core algorithmic patterns in idiomatic Rust, highlighting ownership considerations and iterator usage.

---

## Table of Contents

1. [Two Pointers](#two-pointers)
2. [Sliding Window](#sliding-window)
3. [Binary Search](#binary-search)
4. [Prefix Sum](#prefix-sum)
5. [Monotonic Stack](#monotonic-stack)
6. [Hash Map Patterns](#hash-map-patterns)
7. [Two Heaps](#two-heaps)
8. [Merge Intervals](#merge-intervals)
9. [Cyclic Sort](#cyclic-sort)
10. [BFS/DFS](#bfsdfs)
11. [Backtracking](#backtracking)
12. [Dynamic Programming](#dynamic-programming)
13. [Greedy](#greedy)
14. [Topological Sort](#topological-sort)
15. [Union-Find](#union-find)
16. [Trie](#trie)
17. [Bit Manipulation](#bit-manipulation)

---

## Two Pointers

Use when: Sorted arrays, finding pairs, palindromes, removing duplicates in-place.

### Pattern Template

```rust
// Opposite ends (converging)
fn two_pointer_converge(arr: &[i32]) {
    let (mut left, mut right) = (0, arr.len().saturating_sub(1));
    while left < right {
        // Process arr[left] and arr[right]
        if condition {
            left += 1;
        } else {
            right -= 1;
        }
    }
}

// Same direction (fast/slow)
fn two_pointer_same_direction(arr: &mut [i32]) -> usize {
    let mut slow = 0;
    for fast in 0..arr.len() {
        if condition(&arr[fast]) {
            arr[slow] = arr[fast];
            slow += 1;
        }
    }
    slow  // New length
}
```

### Example: Two Sum II (Sorted Array)

```rust
fn two_sum(numbers: &[i32], target: i32) -> Option<(usize, usize)> {
    let (mut left, mut right) = (0, numbers.len() - 1);

    while left < right {
        let sum = numbers[left] + numbers[right];
        match sum.cmp(&target) {
            std::cmp::Ordering::Equal => return Some((left, right)),
            std::cmp::Ordering::Less => left += 1,
            std::cmp::Ordering::Greater => right -= 1,
        }
    }
    None
}
```

### Example: Remove Duplicates from Sorted Array

```rust
fn remove_duplicates(nums: &mut Vec<i32>) -> usize {
    if nums.is_empty() {
        return 0;
    }

    let mut slow = 1;
    for fast in 1..nums.len() {
        if nums[fast] != nums[fast - 1] {
            nums[slow] = nums[fast];
            slow += 1;
        }
    }
    slow
}
```

### Example: Container With Most Water

```rust
fn max_area(height: &[i32]) -> i32 {
    let (mut left, mut right) = (0, height.len() - 1);
    let mut max_water = 0;

    while left < right {
        let width = (right - left) as i32;
        let h = height[left].min(height[right]);
        max_water = max_water.max(width * h);

        if height[left] < height[right] {
            left += 1;
        } else {
            right -= 1;
        }
    }
    max_water
}
```

### Example: Valid Palindrome

```rust
fn is_palindrome(s: &str) -> bool {
    let chars: Vec<char> = s.chars()
        .filter(|c| c.is_alphanumeric())
        .map(|c| c.to_ascii_lowercase())
        .collect();

    let (mut left, mut right) = (0, chars.len().saturating_sub(1));
    while left < right {
        if chars[left] != chars[right] {
            return false;
        }
        left += 1;
        right -= 1;
    }
    true
}
```

---

## Sliding Window

Use when: Contiguous subarrays/substrings, fixed or variable window size.

### Fixed Window Template

```rust
fn fixed_window(arr: &[i32], k: usize) -> i32 {
    if arr.len() < k {
        return 0;
    }

    // Initialize window
    let mut window_sum: i32 = arr[..k].iter().sum();
    let mut max_sum = window_sum;

    // Slide window
    for i in k..arr.len() {
        window_sum += arr[i] - arr[i - k];  // Add new, remove old
        max_sum = max_sum.max(window_sum);
    }
    max_sum
}
```

### Variable Window Template

```rust
use std::collections::HashMap;

fn variable_window(s: &str) -> usize {
    let chars: Vec<char> = s.chars().collect();
    let mut seen: HashMap<char, usize> = HashMap::new();
    let mut left = 0;
    let mut max_len = 0;

    for right in 0..chars.len() {
        // Expand window
        *seen.entry(chars[right]).or_insert(0) += 1;

        // Shrink window while invalid
        while /* window is invalid */ false {
            let left_char = chars[left];
            *seen.get_mut(&left_char).unwrap() -= 1;
            if seen[&left_char] == 0 {
                seen.remove(&left_char);
            }
            left += 1;
        }

        // Update result
        max_len = max_len.max(right - left + 1);
    }
    max_len
}
```

### Example: Longest Substring Without Repeating Characters

```rust
use std::collections::HashMap;

fn length_of_longest_substring(s: &str) -> usize {
    let chars: Vec<char> = s.chars().collect();
    let mut last_seen: HashMap<char, usize> = HashMap::new();
    let mut left = 0;
    let mut max_len = 0;

    for (right, &c) in chars.iter().enumerate() {
        if let Some(&last_idx) = last_seen.get(&c) {
            if last_idx >= left {
                left = last_idx + 1;
            }
        }
        last_seen.insert(c, right);
        max_len = max_len.max(right - left + 1);
    }
    max_len
}
```

### Example: Minimum Window Substring

```rust
use std::collections::HashMap;

fn min_window(s: &str, t: &str) -> String {
    if s.len() < t.len() {
        return String::new();
    }

    let s_chars: Vec<char> = s.chars().collect();

    // Count required characters
    let mut need: HashMap<char, i32> = HashMap::new();
    for c in t.chars() {
        *need.entry(c).or_insert(0) += 1;
    }

    let mut have: HashMap<char, i32> = HashMap::new();
    let mut formed = 0;
    let required = need.len();

    let mut left = 0;
    let mut min_len = usize::MAX;
    let mut result = (0, 0);

    for right in 0..s_chars.len() {
        let c = s_chars[right];
        *have.entry(c).or_insert(0) += 1;

        if need.contains_key(&c) && have[&c] == need[&c] {
            formed += 1;
        }

        while formed == required {
            if right - left + 1 < min_len {
                min_len = right - left + 1;
                result = (left, right + 1);
            }

            let left_char = s_chars[left];
            *have.get_mut(&left_char).unwrap() -= 1;
            if need.contains_key(&left_char) && have[&left_char] < need[&left_char] {
                formed -= 1;
            }
            left += 1;
        }
    }

    if min_len == usize::MAX {
        String::new()
    } else {
        s_chars[result.0..result.1].iter().collect()
    }
}
```

---

## Binary Search

Use when: Sorted array, monotonic function, finding boundary.

### Template

```rust
fn binary_search(nums: &[i32], target: i32) -> Option<usize> {
    let (mut left, mut right) = (0, nums.len());

    while left < right {
        let mid = left + (right - left) / 2;

        match nums[mid].cmp(&target) {
            std::cmp::Ordering::Equal => return Some(mid),
            std::cmp::Ordering::Less => left = mid + 1,
            std::cmp::Ordering::Greater => right = mid,
        }
    }
    None
}
```

### Finding Boundaries

```rust
// Find first position >= target (lower bound)
fn lower_bound(nums: &[i32], target: i32) -> usize {
    let (mut left, mut right) = (0, nums.len());

    while left < right {
        let mid = left + (right - left) / 2;
        if nums[mid] < target {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    left
}

// Find first position > target (upper bound)
fn upper_bound(nums: &[i32], target: i32) -> usize {
    let (mut left, mut right) = (0, nums.len());

    while left < right {
        let mid = left + (right - left) / 2;
        if nums[mid] <= target {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    left
}
```

### Using Standard Library

```rust
let nums = vec![1, 2, 3, 4, 5];

// binary_search returns Result<found_index, insert_position>
match nums.binary_search(&3) {
    Ok(idx) => println!("Found at {}", idx),
    Err(idx) => println!("Would insert at {}", idx),
}

// partition_point for custom predicates
let idx = nums.partition_point(|&x| x < 3);  // First index where condition is false
```

### Example: Search in Rotated Sorted Array

```rust
fn search_rotated(nums: &[i32], target: i32) -> Option<usize> {
    let (mut left, mut right) = (0, nums.len());

    while left < right {
        let mid = left + (right - left) / 2;

        if nums[mid] == target {
            return Some(mid);
        }

        // Left half is sorted
        if nums[left] <= nums[mid] {
            if target >= nums[left] && target < nums[mid] {
                right = mid;
            } else {
                left = mid + 1;
            }
        } else {
            // Right half is sorted
            if target > nums[mid] && target <= nums[right - 1] {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
    }
    None
}
```

---

## Prefix Sum

Use when: Range sum queries, subarray sums.

### Template

```rust
fn build_prefix_sum(nums: &[i32]) -> Vec<i32> {
    let mut prefix = vec![0; nums.len() + 1];
    for (i, &num) in nums.iter().enumerate() {
        prefix[i + 1] = prefix[i] + num;
    }
    prefix
}

// Query range sum [i, j] inclusive
fn range_sum(prefix: &[i32], i: usize, j: usize) -> i32 {
    prefix[j + 1] - prefix[i]
}
```

### Example: Subarray Sum Equals K

```rust
use std::collections::HashMap;

fn subarray_sum(nums: &[i32], k: i32) -> i32 {
    let mut count = 0;
    let mut prefix_sum = 0;
    let mut seen: HashMap<i32, i32> = HashMap::new();
    seen.insert(0, 1);

    for &num in nums {
        prefix_sum += num;
        if let Some(&c) = seen.get(&(prefix_sum - k)) {
            count += c;
        }
        *seen.entry(prefix_sum).or_insert(0) += 1;
    }
    count
}
```

### Example: Product of Array Except Self

```rust
fn product_except_self(nums: &[i32]) -> Vec<i32> {
    let n = nums.len();
    let mut result = vec![1; n];

    // Left products
    let mut left = 1;
    for i in 0..n {
        result[i] = left;
        left *= nums[i];
    }

    // Right products
    let mut right = 1;
    for i in (0..n).rev() {
        result[i] *= right;
        right *= nums[i];
    }

    result
}
```

---

## Monotonic Stack

Use when: Next greater/smaller element, histogram problems.

### Template

```rust
fn next_greater(nums: &[i32]) -> Vec<i32> {
    let n = nums.len();
    let mut result = vec![-1; n];
    let mut stack: Vec<usize> = Vec::new();

    for i in 0..n {
        while !stack.is_empty() && nums[i] > nums[*stack.last().unwrap()] {
            let idx = stack.pop().unwrap();
            result[idx] = nums[i];
        }
        stack.push(i);
    }
    result
}
```

### Example: Daily Temperatures

```rust
fn daily_temperatures(temperatures: &[i32]) -> Vec<i32> {
    let n = temperatures.len();
    let mut result = vec![0; n];
    let mut stack: Vec<usize> = Vec::new();

    for i in 0..n {
        while !stack.is_empty() && temperatures[i] > temperatures[*stack.last().unwrap()] {
            let idx = stack.pop().unwrap();
            result[idx] = (i - idx) as i32;
        }
        stack.push(i);
    }
    result
}
```

### Example: Largest Rectangle in Histogram

```rust
fn largest_rectangle_area(heights: &[i32]) -> i32 {
    let mut heights = heights.to_vec();
    heights.push(0);  // Sentinel

    let mut stack: Vec<usize> = Vec::new();
    let mut max_area = 0;

    for i in 0..heights.len() {
        while !stack.is_empty() && heights[i] < heights[*stack.last().unwrap()] {
            let height = heights[stack.pop().unwrap()];
            let width = if stack.is_empty() {
                i
            } else {
                i - stack.last().unwrap() - 1
            };
            max_area = max_area.max(height * width as i32);
        }
        stack.push(i);
    }
    max_area
}
```

---

## Hash Map Patterns

### Two Sum Pattern

```rust
use std::collections::HashMap;

fn two_sum(nums: &[i32], target: i32) -> Option<(usize, usize)> {
    let mut seen: HashMap<i32, usize> = HashMap::new();

    for (i, &num) in nums.iter().enumerate() {
        let complement = target - num;
        if let Some(&j) = seen.get(&complement) {
            return Some((j, i));
        }
        seen.insert(num, i);
    }
    None
}
```

### Frequency Counter

```rust
use std::collections::HashMap;

fn top_k_frequent(nums: &[i32], k: usize) -> Vec<i32> {
    // Count frequencies
    let mut freq: HashMap<i32, usize> = HashMap::new();
    for &num in nums {
        *freq.entry(num).or_insert(0) += 1;
    }

    // Bucket sort by frequency
    let mut buckets: Vec<Vec<i32>> = vec![vec![]; nums.len() + 1];
    for (num, count) in freq {
        buckets[count].push(num);
    }

    // Collect top k
    let mut result = Vec::new();
    for bucket in buckets.into_iter().rev() {
        for num in bucket {
            result.push(num);
            if result.len() == k {
                return result;
            }
        }
    }
    result
}
```

### Anagram Grouping

```rust
use std::collections::HashMap;

fn group_anagrams(strs: Vec<String>) -> Vec<Vec<String>> {
    let mut groups: HashMap<String, Vec<String>> = HashMap::new();

    for s in strs {
        let mut chars: Vec<char> = s.chars().collect();
        chars.sort();
        let key: String = chars.into_iter().collect();
        groups.entry(key).or_default().push(s);
    }

    groups.into_values().collect()
}
```

---

## Two Heaps

Use when: Finding median, balanced partitions.

```rust
use std::collections::BinaryHeap;
use std::cmp::Reverse;

struct MedianFinder {
    small: BinaryHeap<i32>,          // Max heap for smaller half
    large: BinaryHeap<Reverse<i32>>, // Min heap for larger half
}

impl MedianFinder {
    fn new() -> Self {
        MedianFinder {
            small: BinaryHeap::new(),
            large: BinaryHeap::new(),
        }
    }

    fn add_num(&mut self, num: i32) {
        self.small.push(num);

        // Move max of small to large
        if let Some(max_small) = self.small.pop() {
            self.large.push(Reverse(max_small));
        }

        // Balance: small can have at most 1 more than large
        if self.large.len() > self.small.len() {
            if let Some(Reverse(min_large)) = self.large.pop() {
                self.small.push(min_large);
            }
        }
    }

    fn find_median(&self) -> f64 {
        if self.small.len() > self.large.len() {
            *self.small.peek().unwrap() as f64
        } else {
            let max_small = *self.small.peek().unwrap() as f64;
            let min_large = self.large.peek().unwrap().0 as f64;
            (max_small + min_large) / 2.0
        }
    }
}
```

---

## Merge Intervals

```rust
fn merge(intervals: &mut Vec<Vec<i32>>) -> Vec<Vec<i32>> {
    if intervals.is_empty() {
        return vec![];
    }

    intervals.sort_by_key(|i| i[0]);

    let mut result: Vec<Vec<i32>> = vec![intervals[0].clone()];

    for interval in intervals.iter().skip(1) {
        let last = result.last_mut().unwrap();
        if interval[0] <= last[1] {
            last[1] = last[1].max(interval[1]);
        } else {
            result.push(interval.clone());
        }
    }
    result
}
```

### Insert Interval

```rust
fn insert(intervals: Vec<Vec<i32>>, new_interval: Vec<i32>) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    let mut new = new_interval;
    let mut i = 0;

    // Add intervals that come before
    while i < intervals.len() && intervals[i][1] < new[0] {
        result.push(intervals[i].clone());
        i += 1;
    }

    // Merge overlapping intervals
    while i < intervals.len() && intervals[i][0] <= new[1] {
        new[0] = new[0].min(intervals[i][0]);
        new[1] = new[1].max(intervals[i][1]);
        i += 1;
    }
    result.push(new);

    // Add remaining intervals
    while i < intervals.len() {
        result.push(intervals[i].clone());
        i += 1;
    }

    result
}
```

---

## Cyclic Sort

Use when: Numbers in range [1, n], find missing/duplicate.

```rust
fn find_missing_number(nums: &mut [i32]) -> i32 {
    let n = nums.len();

    // Place each number at its correct index
    let mut i = 0;
    while i < n {
        let j = nums[i] as usize;
        if j < n && nums[i] != nums[j] as i32 {
            nums.swap(i, j);
        } else {
            i += 1;
        }
    }

    // Find the missing number
    for i in 0..n {
        if nums[i] != i as i32 {
            return i as i32;
        }
    }
    n as i32
}
```

### Find Duplicate

```rust
fn find_duplicate(nums: &[i32]) -> i32 {
    // Floyd's cycle detection
    let mut slow = nums[0] as usize;
    let mut fast = nums[0] as usize;

    loop {
        slow = nums[slow] as usize;
        fast = nums[nums[fast] as usize] as usize;
        if slow == fast {
            break;
        }
    }

    slow = nums[0] as usize;
    while slow != fast {
        slow = nums[slow] as usize;
        fast = nums[fast] as usize;
    }

    slow as i32
}
```

---

## BFS/DFS

### BFS Template

```rust
use std::collections::{VecDeque, HashSet};

fn bfs(graph: &Vec<Vec<usize>>, start: usize) -> Vec<usize> {
    let mut visited: HashSet<usize> = HashSet::new();
    let mut queue: VecDeque<usize> = VecDeque::new();
    let mut result = Vec::new();

    queue.push_back(start);
    visited.insert(start);

    while let Some(node) = queue.pop_front() {
        result.push(node);

        for &neighbor in &graph[node] {
            if !visited.contains(&neighbor) {
                visited.insert(neighbor);
                queue.push_back(neighbor);
            }
        }
    }
    result
}
```

### DFS Template

```rust
use std::collections::HashSet;

fn dfs(graph: &Vec<Vec<usize>>, start: usize) -> Vec<usize> {
    let mut visited: HashSet<usize> = HashSet::new();
    let mut result = Vec::new();

    fn dfs_helper(
        node: usize,
        graph: &Vec<Vec<usize>>,
        visited: &mut HashSet<usize>,
        result: &mut Vec<usize>,
    ) {
        if visited.contains(&node) {
            return;
        }
        visited.insert(node);
        result.push(node);

        for &neighbor in &graph[node] {
            dfs_helper(neighbor, graph, visited, result);
        }
    }

    dfs_helper(start, graph, &mut visited, &mut result);
    result
}
```

### Example: Number of Islands

```rust
fn num_islands(grid: &mut Vec<Vec<char>>) -> i32 {
    if grid.is_empty() {
        return 0;
    }

    let (rows, cols) = (grid.len(), grid[0].len());
    let mut count = 0;

    fn dfs(grid: &mut Vec<Vec<char>>, r: usize, c: usize, rows: usize, cols: usize) {
        if r >= rows || c >= cols || grid[r][c] == '0' {
            return;
        }
        grid[r][c] = '0';  // Mark visited

        if r > 0 { dfs(grid, r - 1, c, rows, cols); }
        if r + 1 < rows { dfs(grid, r + 1, c, rows, cols); }
        if c > 0 { dfs(grid, r, c - 1, rows, cols); }
        if c + 1 < cols { dfs(grid, r, c + 1, rows, cols); }
    }

    for r in 0..rows {
        for c in 0..cols {
            if grid[r][c] == '1' {
                count += 1;
                dfs(grid, r, c, rows, cols);
            }
        }
    }
    count
}
```

### Level Order BFS

```rust
use std::collections::VecDeque;

fn level_order(graph: &Vec<Vec<usize>>, start: usize) -> Vec<Vec<usize>> {
    let mut visited = vec![false; graph.len()];
    let mut queue = VecDeque::new();
    let mut levels = Vec::new();

    queue.push_back(start);
    visited[start] = true;

    while !queue.is_empty() {
        let level_size = queue.len();
        let mut current_level = Vec::new();

        for _ in 0..level_size {
            let node = queue.pop_front().unwrap();
            current_level.push(node);

            for &neighbor in &graph[node] {
                if !visited[neighbor] {
                    visited[neighbor] = true;
                    queue.push_back(neighbor);
                }
            }
        }
        levels.push(current_level);
    }
    levels
}
```

---

## Backtracking

### Template

```rust
fn backtrack<T: Clone>(
    result: &mut Vec<Vec<T>>,
    path: &mut Vec<T>,
    choices: &[T],
    start: usize,
) {
    // Add current state to result (for subsets)
    result.push(path.clone());

    for i in start..choices.len() {
        // Make choice
        path.push(choices[i].clone());

        // Recurse
        backtrack(result, path, choices, i + 1);

        // Undo choice
        path.pop();
    }
}
```

### Example: Subsets

```rust
fn subsets(nums: &[i32]) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    let mut path = Vec::new();

    fn backtrack(
        result: &mut Vec<Vec<i32>>,
        path: &mut Vec<i32>,
        nums: &[i32],
        start: usize,
    ) {
        result.push(path.clone());

        for i in start..nums.len() {
            path.push(nums[i]);
            backtrack(result, path, nums, i + 1);
            path.pop();
        }
    }

    backtrack(&mut result, &mut path, nums, 0);
    result
}
```

### Example: Permutations

```rust
fn permute(nums: &[i32]) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    let mut path = Vec::new();
    let mut used = vec![false; nums.len()];

    fn backtrack(
        result: &mut Vec<Vec<i32>>,
        path: &mut Vec<i32>,
        nums: &[i32],
        used: &mut [bool],
    ) {
        if path.len() == nums.len() {
            result.push(path.clone());
            return;
        }

        for i in 0..nums.len() {
            if used[i] {
                continue;
            }
            used[i] = true;
            path.push(nums[i]);
            backtrack(result, path, nums, used);
            path.pop();
            used[i] = false;
        }
    }

    backtrack(&mut result, &mut path, nums, &mut used);
    result
}
```

### Example: Combination Sum

```rust
fn combination_sum(candidates: &[i32], target: i32) -> Vec<Vec<i32>> {
    let mut result = Vec::new();
    let mut path = Vec::new();

    fn backtrack(
        result: &mut Vec<Vec<i32>>,
        path: &mut Vec<i32>,
        candidates: &[i32],
        target: i32,
        start: usize,
    ) {
        if target == 0 {
            result.push(path.clone());
            return;
        }
        if target < 0 {
            return;
        }

        for i in start..candidates.len() {
            path.push(candidates[i]);
            backtrack(result, path, candidates, target - candidates[i], i);
            path.pop();
        }
    }

    backtrack(&mut result, &mut path, candidates, target, 0);
    result
}
```

---

## Dynamic Programming

### 1D DP Template

```rust
fn solve_1d(n: usize) -> i32 {
    if n <= 1 {
        return n as i32;
    }

    let mut dp = vec![0; n + 1];
    dp[0] = /* base case */;
    dp[1] = /* base case */;

    for i in 2..=n {
        dp[i] = /* recurrence relation */;
    }
    dp[n]
}
```

### 2D DP Template

```rust
fn solve_2d(m: usize, n: usize) -> i32 {
    let mut dp = vec![vec![0; n + 1]; m + 1];

    // Base cases
    for i in 0..=m {
        dp[i][0] = /* base case */;
    }
    for j in 0..=n {
        dp[0][j] = /* base case */;
    }

    // Fill DP table
    for i in 1..=m {
        for j in 1..=n {
            dp[i][j] = /* recurrence */;
        }
    }
    dp[m][n]
}
```

### Example: Climbing Stairs

```rust
fn climb_stairs(n: i32) -> i32 {
    if n <= 2 {
        return n;
    }

    let (mut prev2, mut prev1) = (1, 2);
    for _ in 3..=n {
        let curr = prev1 + prev2;
        prev2 = prev1;
        prev1 = curr;
    }
    prev1
}
```

### Example: Longest Common Subsequence

```rust
fn longest_common_subsequence(text1: &str, text2: &str) -> i32 {
    let (m, n) = (text1.len(), text2.len());
    let t1: Vec<char> = text1.chars().collect();
    let t2: Vec<char> = text2.chars().collect();

    let mut dp = vec![vec![0; n + 1]; m + 1];

    for i in 1..=m {
        for j in 1..=n {
            if t1[i - 1] == t2[j - 1] {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = dp[i - 1][j].max(dp[i][j - 1]);
            }
        }
    }
    dp[m][n]
}
```

### Example: 0/1 Knapsack

```rust
fn knapsack(weights: &[i32], values: &[i32], capacity: i32) -> i32 {
    let n = weights.len();
    let cap = capacity as usize;
    let mut dp = vec![vec![0; cap + 1]; n + 1];

    for i in 1..=n {
        for w in 0..=cap {
            if weights[i - 1] as usize <= w {
                dp[i][w] = dp[i - 1][w].max(
                    dp[i - 1][w - weights[i - 1] as usize] + values[i - 1]
                );
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }
    dp[n][cap]
}
```

### Example: Coin Change

```rust
fn coin_change(coins: &[i32], amount: i32) -> i32 {
    let amount = amount as usize;
    let mut dp = vec![i32::MAX; amount + 1];
    dp[0] = 0;

    for i in 1..=amount {
        for &coin in coins {
            let coin = coin as usize;
            if coin <= i && dp[i - coin] != i32::MAX {
                dp[i] = dp[i].min(dp[i - coin] + 1);
            }
        }
    }

    if dp[amount] == i32::MAX { -1 } else { dp[amount] }
}
```

---

## Greedy

### Example: Jump Game

```rust
fn can_jump(nums: &[i32]) -> bool {
    let mut max_reach = 0;

    for (i, &jump) in nums.iter().enumerate() {
        if i > max_reach {
            return false;
        }
        max_reach = max_reach.max(i + jump as usize);
    }
    true
}
```

### Example: Activity Selection

```rust
fn max_activities(intervals: &mut [(i32, i32)]) -> Vec<(i32, i32)> {
    intervals.sort_by_key(|&(_, end)| end);

    let mut result = Vec::new();
    let mut last_end = i32::MIN;

    for &(start, end) in intervals.iter() {
        if start >= last_end {
            result.push((start, end));
            last_end = end;
        }
    }
    result
}
```

---

## Topological Sort

```rust
use std::collections::VecDeque;

fn topological_sort(num_courses: usize, prerequisites: &[(usize, usize)]) -> Option<Vec<usize>> {
    let mut graph = vec![vec![]; num_courses];
    let mut in_degree = vec![0; num_courses];

    for &(course, prereq) in prerequisites {
        graph[prereq].push(course);
        in_degree[course] += 1;
    }

    let mut queue: VecDeque<usize> = in_degree.iter()
        .enumerate()
        .filter(|(_, &d)| d == 0)
        .map(|(i, _)| i)
        .collect();

    let mut result = Vec::new();

    while let Some(node) = queue.pop_front() {
        result.push(node);

        for &neighbor in &graph[node] {
            in_degree[neighbor] -= 1;
            if in_degree[neighbor] == 0 {
                queue.push_back(neighbor);
            }
        }
    }

    if result.len() == num_courses {
        Some(result)
    } else {
        None  // Cycle detected
    }
}
```

---

## Union-Find

```rust
struct UnionFind {
    parent: Vec<usize>,
    rank: Vec<usize>,
}

impl UnionFind {
    fn new(n: usize) -> Self {
        UnionFind {
            parent: (0..n).collect(),
            rank: vec![0; n],
        }
    }

    fn find(&mut self, x: usize) -> usize {
        if self.parent[x] != x {
            self.parent[x] = self.find(self.parent[x]);  // Path compression
        }
        self.parent[x]
    }

    fn union(&mut self, x: usize, y: usize) -> bool {
        let (root_x, root_y) = (self.find(x), self.find(y));

        if root_x == root_y {
            return false;  // Already connected
        }

        // Union by rank
        match self.rank[root_x].cmp(&self.rank[root_y]) {
            std::cmp::Ordering::Less => self.parent[root_x] = root_y,
            std::cmp::Ordering::Greater => self.parent[root_y] = root_x,
            std::cmp::Ordering::Equal => {
                self.parent[root_y] = root_x;
                self.rank[root_x] += 1;
            }
        }
        true
    }

    fn connected(&mut self, x: usize, y: usize) -> bool {
        self.find(x) == self.find(y)
    }
}
```

---

## Trie

```rust
use std::collections::HashMap;

#[derive(Default)]
struct TrieNode {
    children: HashMap<char, TrieNode>,
    is_end: bool,
}

#[derive(Default)]
struct Trie {
    root: TrieNode,
}

impl Trie {
    fn new() -> Self {
        Trie::default()
    }

    fn insert(&mut self, word: &str) {
        let mut node = &mut self.root;
        for c in word.chars() {
            node = node.children.entry(c).or_default();
        }
        node.is_end = true;
    }

    fn search(&self, word: &str) -> bool {
        self.find_node(word).map_or(false, |n| n.is_end)
    }

    fn starts_with(&self, prefix: &str) -> bool {
        self.find_node(prefix).is_some()
    }

    fn find_node(&self, prefix: &str) -> Option<&TrieNode> {
        let mut node = &self.root;
        for c in prefix.chars() {
            node = node.children.get(&c)?;
        }
        Some(node)
    }
}
```

---

## Bit Manipulation

### Common Operations

```rust
// Check if bit is set
fn is_bit_set(n: i32, i: u32) -> bool {
    (n >> i) & 1 == 1
}

// Set bit
fn set_bit(n: i32, i: u32) -> i32 {
    n | (1 << i)
}

// Clear bit
fn clear_bit(n: i32, i: u32) -> i32 {
    n & !(1 << i)
}

// Toggle bit
fn toggle_bit(n: i32, i: u32) -> i32 {
    n ^ (1 << i)
}

// Count set bits (popcount)
fn count_ones(n: i32) -> u32 {
    n.count_ones()
}

// Check if power of 2
fn is_power_of_two(n: i32) -> bool {
    n > 0 && (n & (n - 1)) == 0
}

// Get lowest set bit
fn lowest_set_bit(n: i32) -> i32 {
    n & (-n)
}

// Clear lowest set bit
fn clear_lowest_set_bit(n: i32) -> i32 {
    n & (n - 1)
}
```

### Example: Single Number (XOR)

```rust
fn single_number(nums: &[i32]) -> i32 {
    nums.iter().fold(0, |acc, &x| acc ^ x)
}
```

### Example: Counting Bits

```rust
fn count_bits(n: i32) -> Vec<i32> {
    (0..=n).map(|x| x.count_ones() as i32).collect()
}
```

---

## Quick Reference

| Pattern | Key Signal | Time |
|---------|------------|------|
| Two Pointers | Sorted array, pair finding | O(n) |
| Sliding Window | Contiguous subarray | O(n) |
| Binary Search | Sorted, monotonic | O(log n) |
| Prefix Sum | Range sum queries | O(n) build, O(1) query |
| Monotonic Stack | Next greater/smaller | O(n) |
| Hash Map | O(1) lookup needed | O(n) |
| Two Heaps | Find median | O(log n) per operation |
| BFS | Shortest path (unweighted) | O(V+E) |
| DFS | Explore all paths | O(V+E) |
| Backtracking | All combinations/permutations | O(2^n) or O(n!) |
| DP | Optimal substructure | Varies |
| Greedy | Local optimal = global | O(n log n) |
| Topological Sort | DAG ordering | O(V+E) |
| Union-Find | Connected components | O(α(n)) ≈ O(1) |
| Trie | Prefix matching | O(m) per operation |
| Bit Manipulation | Binary operations | O(1) or O(log n) |

---

**Next:** [05-idioms-best-practices.md](05-idioms-best-practices.md) — Write idiomatic Rust code
