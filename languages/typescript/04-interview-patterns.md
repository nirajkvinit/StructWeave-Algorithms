# TypeScript Interview Patterns

> 17 algorithm patterns that solve 90% of coding interview problems

Each pattern includes a template, real examples, and complexity analysis—all in idiomatic TypeScript.

---

## Table of Contents

1. [Two Pointers](#1-two-pointers)
2. [Sliding Window](#2-sliding-window)
3. [Binary Search](#3-binary-search)
4. [Prefix Sum](#4-prefix-sum)
5. [Monotonic Stack](#5-monotonic-stack)
6. [Hash Map Patterns](#6-hash-map-patterns)
7. [Two Heaps](#7-two-heaps)
8. [Merge Intervals](#8-merge-intervals)
9. [Cyclic Sort](#9-cyclic-sort)
10. [BFS/DFS](#10-bfsdfs)
11. [Backtracking](#11-backtracking)
12. [Dynamic Programming](#12-dynamic-programming)
13. [Greedy](#13-greedy)
14. [Topological Sort](#14-topological-sort)
15. [Union-Find](#15-union-find)
16. [Trie](#16-trie)
17. [Bit Manipulation](#17-bit-manipulation)

---

## 1. Two Pointers

### Use When
- Array is sorted (or can be sorted)
- Finding pairs with a specific sum
- Removing duplicates in-place
- Reversing or comparing from both ends

### Pattern: Converging Pointers

```typescript
function twoSumSorted(nums: number[], target: number): [number, number] | null {
    let left = 0;
    let right = nums.length - 1;

    while (left < right) {
        const sum = nums[left] + nums[right];
        if (sum === target) {
            return [left, right];
        } else if (sum < target) {
            left++;
        } else {
            right--;
        }
    }

    return null;
}
```

### Pattern: Same Direction (Fast/Slow)

```typescript
function removeDuplicates(nums: number[]): number {
    if (nums.length === 0) return 0;

    let slow = 0;
    for (let fast = 1; fast < nums.length; fast++) {
        if (nums[fast] !== nums[slow]) {
            slow++;
            nums[slow] = nums[fast];
        }
    }

    return slow + 1;
}
```

### Example: Container With Most Water

```typescript
function maxArea(heights: number[]): number {
    let left = 0;
    let right = heights.length - 1;
    let maxWater = 0;

    while (left < right) {
        const width = right - left;
        const height = Math.min(heights[left], heights[right]);
        maxWater = Math.max(maxWater, width * height);

        // Move the shorter line (greedy choice)
        if (heights[left] < heights[right]) {
            left++;
        } else {
            right--;
        }
    }

    return maxWater;
}
```

**Time:** O(n) | **Space:** O(1)

### Example: Valid Palindrome

```typescript
function isPalindrome(s: string): boolean {
    let left = 0;
    let right = s.length - 1;

    while (left < right) {
        // Skip non-alphanumeric
        while (left < right && !isAlphanumeric(s[left])) left++;
        while (left < right && !isAlphanumeric(s[right])) right--;

        if (s[left].toLowerCase() !== s[right].toLowerCase()) {
            return false;
        }

        left++;
        right--;
    }

    return true;
}

function isAlphanumeric(char: string): boolean {
    return /[a-zA-Z0-9]/.test(char);
}
```

**Time:** O(n) | **Space:** O(1)

### Example: Three Sum

```typescript
function threeSum(nums: number[]): number[][] {
    nums.sort((a, b) => a - b);
    const result: number[][] = [];

    for (let i = 0; i < nums.length - 2; i++) {
        // Skip duplicates
        if (i > 0 && nums[i] === nums[i - 1]) continue;

        let left = i + 1;
        let right = nums.length - 1;

        while (left < right) {
            const sum = nums[i] + nums[left] + nums[right];

            if (sum === 0) {
                result.push([nums[i], nums[left], nums[right]]);

                // Skip duplicates
                while (left < right && nums[left] === nums[left + 1]) left++;
                while (left < right && nums[right] === nums[right - 1]) right--;

                left++;
                right--;
            } else if (sum < 0) {
                left++;
            } else {
                right--;
            }
        }
    }

    return result;
}
```

**Time:** O(n²) | **Space:** O(1) excluding output

---

## 2. Sliding Window

### Use When
- Contiguous subarray/substring problems
- Finding longest/shortest with a condition
- Fixed-size window statistics

### Pattern: Fixed Window

```typescript
function maxSumSubarray(nums: number[], k: number): number {
    if (nums.length < k) return 0;

    // Initial window sum
    let windowSum = 0;
    for (let i = 0; i < k; i++) {
        windowSum += nums[i];
    }
    let maxSum = windowSum;

    // Slide window
    for (let i = k; i < nums.length; i++) {
        windowSum += nums[i] - nums[i - k];
        maxSum = Math.max(maxSum, windowSum);
    }

    return maxSum;
}
```

**Time:** O(n) | **Space:** O(1)

### Pattern: Variable Window (Shrinking)

```typescript
function minSubarrayLen(target: number, nums: number[]): number {
    let left = 0;
    let sum = 0;
    let minLen = Infinity;

    for (let right = 0; right < nums.length; right++) {
        sum += nums[right];

        while (sum >= target) {
            minLen = Math.min(minLen, right - left + 1);
            sum -= nums[left];
            left++;
        }
    }

    return minLen === Infinity ? 0 : minLen;
}
```

**Time:** O(n) | **Space:** O(1)

### Example: Longest Substring Without Repeating

```typescript
function lengthOfLongestSubstring(s: string): number {
    const seen = new Map<string, number>();  // char -> last index
    let maxLen = 0;
    let left = 0;

    for (let right = 0; right < s.length; right++) {
        const char = s[right];

        if (seen.has(char) && seen.get(char)! >= left) {
            left = seen.get(char)! + 1;
        }

        seen.set(char, right);
        maxLen = Math.max(maxLen, right - left + 1);
    }

    return maxLen;
}
```

**Time:** O(n) | **Space:** O(min(m, n)) where m is charset size

### Example: Minimum Window Substring

```typescript
function minWindow(s: string, t: string): string {
    const need = new Map<string, number>();
    for (const c of t) {
        need.set(c, (need.get(c) ?? 0) + 1);
    }

    const window = new Map<string, number>();
    let have = 0;
    const want = need.size;

    let result: [number, number] = [-1, -1];
    let minLen = Infinity;
    let left = 0;

    for (let right = 0; right < s.length; right++) {
        const c = s[right];
        window.set(c, (window.get(c) ?? 0) + 1);

        if (need.has(c) && window.get(c) === need.get(c)) {
            have++;
        }

        while (have === want) {
            if (right - left + 1 < minLen) {
                minLen = right - left + 1;
                result = [left, right];
            }

            const leftChar = s[left];
            window.set(leftChar, window.get(leftChar)! - 1);

            if (need.has(leftChar) && window.get(leftChar)! < need.get(leftChar)!) {
                have--;
            }

            left++;
        }
    }

    return result[0] === -1 ? "" : s.slice(result[0], result[1] + 1);
}
```

**Time:** O(n + m) | **Space:** O(m)

---

## 3. Binary Search

### Use When
- Sorted array
- Finding boundary (first/last occurrence)
- Searching in rotated array
- Finding minimum/maximum that satisfies condition

### Pattern: Basic Binary Search

```typescript
function binarySearch(nums: number[], target: number): number {
    let left = 0;
    let right = nums.length - 1;

    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);

        if (nums[mid] === target) {
            return mid;
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return -1;
}
```

### Pattern: Find Left Boundary (First Occurrence)

```typescript
function searchLeft(nums: number[], target: number): number {
    let left = 0;
    let right = nums.length;

    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);

        if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    return left < nums.length && nums[left] === target ? left : -1;
}
```

### Pattern: Find Right Boundary (Last Occurrence)

```typescript
function searchRight(nums: number[], target: number): number {
    let left = 0;
    let right = nums.length;

    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);

        if (nums[mid] <= target) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    return left > 0 && nums[left - 1] === target ? left - 1 : -1;
}
```

### Example: Search in Rotated Sorted Array

```typescript
function searchRotated(nums: number[], target: number): number {
    let left = 0;
    let right = nums.length - 1;

    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);

        if (nums[mid] === target) {
            return mid;
        }

        // Left half is sorted
        if (nums[left] <= nums[mid]) {
            if (nums[left] <= target && target < nums[mid]) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        // Right half is sorted
        else {
            if (nums[mid] < target && target <= nums[right]) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
    }

    return -1;
}
```

**Time:** O(log n) | **Space:** O(1)

### Example: Find Peak Element

```typescript
function findPeakElement(nums: number[]): number {
    let left = 0;
    let right = nums.length - 1;

    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);

        if (nums[mid] > nums[mid + 1]) {
            right = mid;  // Peak is at mid or left
        } else {
            left = mid + 1;  // Peak is to the right
        }
    }

    return left;
}
```

**Time:** O(log n) | **Space:** O(1)

---

## 4. Prefix Sum

### Use When
- Range sum queries
- Subarray sum equals k
- Finding subarrays with specific sum properties

### Pattern: Basic Prefix Sum

```typescript
function buildPrefixSum(nums: number[]): number[] {
    const prefix: number[] = [0];
    for (const num of nums) {
        prefix.push(prefix[prefix.length - 1] + num);
    }
    return prefix;
}

// Sum of range [left, right] inclusive
function rangeSum(prefix: number[], left: number, right: number): number {
    return prefix[right + 1] - prefix[left];
}
```

### Example: Subarray Sum Equals K

```typescript
function subarraySum(nums: number[], k: number): number {
    const prefixCount = new Map<number, number>();
    prefixCount.set(0, 1);  // Empty prefix

    let sum = 0;
    let count = 0;

    for (const num of nums) {
        sum += num;

        // If (sum - k) exists, we found subarrays summing to k
        if (prefixCount.has(sum - k)) {
            count += prefixCount.get(sum - k)!;
        }

        prefixCount.set(sum, (prefixCount.get(sum) ?? 0) + 1);
    }

    return count;
}
```

**Time:** O(n) | **Space:** O(n)

### Example: Product of Array Except Self

```typescript
function productExceptSelf(nums: number[]): number[] {
    const n = nums.length;
    const result = new Array(n).fill(1);

    // Left products
    let leftProduct = 1;
    for (let i = 0; i < n; i++) {
        result[i] = leftProduct;
        leftProduct *= nums[i];
    }

    // Right products
    let rightProduct = 1;
    for (let i = n - 1; i >= 0; i--) {
        result[i] *= rightProduct;
        rightProduct *= nums[i];
    }

    return result;
}
```

**Time:** O(n) | **Space:** O(1) excluding output

---

## 5. Monotonic Stack

### Use When
- Next greater/smaller element
- Previous greater/smaller element
- Histogram problems
- Expression evaluation

### Pattern: Next Greater Element

```typescript
function nextGreaterElement(nums: number[]): number[] {
    const result = new Array(nums.length).fill(-1);
    const stack: number[] = [];  // Stack of indices

    for (let i = 0; i < nums.length; i++) {
        while (stack.length > 0 && nums[i] > nums[stack[stack.length - 1]]) {
            const idx = stack.pop()!;
            result[idx] = nums[i];
        }
        stack.push(i);
    }

    return result;
}
```

### Example: Daily Temperatures

```typescript
function dailyTemperatures(temperatures: number[]): number[] {
    const n = temperatures.length;
    const result = new Array(n).fill(0);
    const stack: number[] = [];  // Stack of indices

    for (let i = 0; i < n; i++) {
        while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {
            const prevIdx = stack.pop()!;
            result[prevIdx] = i - prevIdx;
        }
        stack.push(i);
    }

    return result;
}
```

**Time:** O(n) | **Space:** O(n)

### Example: Largest Rectangle in Histogram

```typescript
function largestRectangleArea(heights: number[]): number {
    const stack: number[] = [];  // Stack of indices
    let maxArea = 0;

    // Add sentinel to handle remaining elements
    const h = [...heights, 0];

    for (let i = 0; i < h.length; i++) {
        while (stack.length > 0 && h[i] < h[stack[stack.length - 1]]) {
            const height = h[stack.pop()!];
            const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }

    return maxArea;
}
```

**Time:** O(n) | **Space:** O(n)

---

## 6. Hash Map Patterns

### Use When
- O(1) lookups needed
- Frequency counting
- Finding complements
- Grouping by key

### Pattern: Two Sum (Complement Search)

```typescript
function twoSum(nums: number[], target: number): [number, number] | null {
    const seen = new Map<number, number>();

    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement)!, i];
        }
        seen.set(nums[i], i);
    }

    return null;
}
```

### Pattern: Frequency Counter

```typescript
function topKFrequent(nums: number[], k: number): number[] {
    // Count frequencies
    const freq = new Map<number, number>();
    for (const num of nums) {
        freq.set(num, (freq.get(num) ?? 0) + 1);
    }

    // Sort by frequency
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);

    return sorted.slice(0, k).map(([num]) => num);
}
```

### Pattern: Group Anagrams

```typescript
function groupAnagrams(strs: string[]): string[][] {
    const groups = new Map<string, string[]>();

    for (const str of strs) {
        // Sort characters as key
        const key = [...str].sort().join("");

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(str);
    }

    return [...groups.values()];
}
```

**Time:** O(n * k log k) | **Space:** O(n * k)

### Example: Longest Consecutive Sequence

```typescript
function longestConsecutive(nums: number[]): number {
    const numSet = new Set(nums);
    let maxLen = 0;

    for (const num of numSet) {
        // Only start counting from sequence start
        if (!numSet.has(num - 1)) {
            let currentNum = num;
            let currentLen = 1;

            while (numSet.has(currentNum + 1)) {
                currentNum++;
                currentLen++;
            }

            maxLen = Math.max(maxLen, currentLen);
        }
    }

    return maxLen;
}
```

**Time:** O(n) | **Space:** O(n)

---

## 7. Two Heaps

### Use When
- Finding median in stream
- Scheduling problems
- Balancing two halves

### Example: Find Median from Data Stream

```typescript
class MedianFinder {
    private maxHeap: MinHeap<number>;  // Lower half (use negative values)
    private minHeap: MinHeap<number>;  // Upper half

    constructor() {
        this.maxHeap = new MinHeap((a, b) => b - a);  // Max heap via comparator
        this.minHeap = new MinHeap((a, b) => a - b);  // Min heap
    }

    addNum(num: number): void {
        // Add to max heap (lower half)
        this.maxHeap.push(num);

        // Balance: move largest from lower to upper
        this.minHeap.push(this.maxHeap.pop()!);

        // Ensure lower half has >= elements than upper
        if (this.minHeap.size() > this.maxHeap.size()) {
            this.maxHeap.push(this.minHeap.pop()!);
        }
    }

    findMedian(): number {
        if (this.maxHeap.size() > this.minHeap.size()) {
            return this.maxHeap.peek()!;
        }
        return (this.maxHeap.peek()! + this.minHeap.peek()!) / 2;
    }
}
```

---

## 8. Merge Intervals

### Use When
- Overlapping intervals
- Scheduling conflicts
- Range union/intersection

### Pattern: Merge Overlapping

```typescript
function merge(intervals: number[][]): number[][] {
    if (intervals.length === 0) return [];

    // Sort by start time
    intervals.sort((a, b) => a[0] - b[0]);

    const result: number[][] = [intervals[0]];

    for (let i = 1; i < intervals.length; i++) {
        const current = intervals[i];
        const last = result[result.length - 1];

        if (current[0] <= last[1]) {
            // Overlapping - merge
            last[1] = Math.max(last[1], current[1]);
        } else {
            // Non-overlapping
            result.push(current);
        }
    }

    return result;
}
```

**Time:** O(n log n) | **Space:** O(n)

### Example: Insert Interval

```typescript
function insert(intervals: number[][], newInterval: number[]): number[][] {
    const result: number[][] = [];
    let i = 0;

    // Add all intervals before newInterval
    while (i < intervals.length && intervals[i][1] < newInterval[0]) {
        result.push(intervals[i]);
        i++;
    }

    // Merge overlapping intervals with newInterval
    while (i < intervals.length && intervals[i][0] <= newInterval[1]) {
        newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
        newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
        i++;
    }
    result.push(newInterval);

    // Add remaining intervals
    while (i < intervals.length) {
        result.push(intervals[i]);
        i++;
    }

    return result;
}
```

**Time:** O(n) | **Space:** O(n)

---

## 9. Cyclic Sort

### Use When
- Array contains numbers from 1 to n
- Finding missing/duplicate numbers
- In-place sorting with known range

### Pattern: Cyclic Sort

```typescript
function cyclicSort(nums: number[]): void {
    let i = 0;
    while (i < nums.length) {
        const correctIdx = nums[i] - 1;  // Where this number should be

        if (nums[i] !== nums[correctIdx]) {
            // Swap to correct position
            [nums[i], nums[correctIdx]] = [nums[correctIdx], nums[i]];
        } else {
            i++;
        }
    }
}
```

### Example: Find Missing Number

```typescript
function missingNumber(nums: number[]): number {
    // For 0 to n, use Gauss formula
    const n = nums.length;
    const expectedSum = (n * (n + 1)) / 2;
    const actualSum = nums.reduce((a, b) => a + b, 0);
    return expectedSum - actualSum;
}

// Alternative: Cyclic sort approach for 1 to n
function findMissing(nums: number[]): number {
    let i = 0;
    while (i < nums.length) {
        const j = nums[i] - 1;
        if (nums[i] > 0 && nums[i] <= nums.length && nums[i] !== nums[j]) {
            [nums[i], nums[j]] = [nums[j], nums[i]];
        } else {
            i++;
        }
    }

    for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== i + 1) {
            return i + 1;
        }
    }
    return nums.length + 1;
}
```

**Time:** O(n) | **Space:** O(1)

---

## 10. BFS/DFS

### Use When
- Graph traversal
- Tree traversal
- Shortest path (unweighted) - BFS
- Path finding, cycle detection - DFS

### Pattern: BFS (Queue-based)

```typescript
function bfs(graph: Map<number, number[]>, start: number): number[] {
    const visited = new Set<number>();
    const result: number[] = [];
    const queue: number[] = [start];

    while (queue.length > 0) {
        const node = queue.shift()!;

        if (visited.has(node)) continue;
        visited.add(node);
        result.push(node);

        for (const neighbor of graph.get(node) ?? []) {
            if (!visited.has(neighbor)) {
                queue.push(neighbor);
            }
        }
    }

    return result;
}
```

### Pattern: DFS (Recursive)

```typescript
function dfs(
    graph: Map<number, number[]>,
    node: number,
    visited: Set<number>,
    result: number[]
): void {
    if (visited.has(node)) return;

    visited.add(node);
    result.push(node);

    for (const neighbor of graph.get(node) ?? []) {
        dfs(graph, neighbor, visited, result);
    }
}
```

### Pattern: DFS (Iterative)

```typescript
function dfsIterative(graph: Map<number, number[]>, start: number): number[] {
    const visited = new Set<number>();
    const result: number[] = [];
    const stack: number[] = [start];

    while (stack.length > 0) {
        const node = stack.pop()!;

        if (visited.has(node)) continue;
        visited.add(node);
        result.push(node);

        for (const neighbor of graph.get(node) ?? []) {
            if (!visited.has(neighbor)) {
                stack.push(neighbor);
            }
        }
    }

    return result;
}
```

### Example: Number of Islands

```typescript
function numIslands(grid: string[][]): number {
    if (grid.length === 0) return 0;

    const rows = grid.length;
    const cols = grid[0].length;
    let count = 0;

    function dfs(r: number, c: number): void {
        if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === "0") {
            return;
        }

        grid[r][c] = "0";  // Mark visited

        dfs(r + 1, c);
        dfs(r - 1, c);
        dfs(r, c + 1);
        dfs(r, c - 1);
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === "1") {
                count++;
                dfs(r, c);
            }
        }
    }

    return count;
}
```

**Time:** O(m * n) | **Space:** O(m * n) for recursion stack

### Example: Binary Tree Level Order Traversal

```typescript
interface TreeNode {
    val: number;
    left: TreeNode | null;
    right: TreeNode | null;
}

function levelOrder(root: TreeNode | null): number[][] {
    if (!root) return [];

    const result: number[][] = [];
    const queue: TreeNode[] = [root];

    while (queue.length > 0) {
        const level: number[] = [];
        const size = queue.length;

        for (let i = 0; i < size; i++) {
            const node = queue.shift()!;
            level.push(node.val);

            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }

        result.push(level);
    }

    return result;
}
```

**Time:** O(n) | **Space:** O(n)

---

## 11. Backtracking

### Use When
- Generating all permutations/combinations
- Solving puzzles (Sudoku, N-Queens)
- Finding all paths
- Constraint satisfaction problems

### Pattern: Basic Backtracking

```typescript
function backtrack(
    candidates: number[],
    path: number[],
    result: number[][],
    start: number
): void {
    // Base case: add valid solution
    result.push([...path]);

    for (let i = start; i < candidates.length; i++) {
        path.push(candidates[i]);       // Choose
        backtrack(candidates, path, result, i + 1);  // Explore
        path.pop();                      // Unchoose
    }
}
```

### Example: Permutations

```typescript
function permute(nums: number[]): number[][] {
    const result: number[][] = [];

    function backtrack(path: number[], used: boolean[]): void {
        if (path.length === nums.length) {
            result.push([...path]);
            return;
        }

        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;

            path.push(nums[i]);
            used[i] = true;

            backtrack(path, used);

            path.pop();
            used[i] = false;
        }
    }

    backtrack([], new Array(nums.length).fill(false));
    return result;
}
```

**Time:** O(n! * n) | **Space:** O(n)

### Example: Subsets

```typescript
function subsets(nums: number[]): number[][] {
    const result: number[][] = [];

    function backtrack(start: number, path: number[]): void {
        result.push([...path]);

        for (let i = start; i < nums.length; i++) {
            path.push(nums[i]);
            backtrack(i + 1, path);
            path.pop();
        }
    }

    backtrack(0, []);
    return result;
}
```

**Time:** O(2^n * n) | **Space:** O(n)

### Example: Combination Sum

```typescript
function combinationSum(candidates: number[], target: number): number[][] {
    const result: number[][] = [];

    function backtrack(start: number, path: number[], remaining: number): void {
        if (remaining === 0) {
            result.push([...path]);
            return;
        }
        if (remaining < 0) return;

        for (let i = start; i < candidates.length; i++) {
            path.push(candidates[i]);
            backtrack(i, path, remaining - candidates[i]);  // i, not i+1 (reuse)
            path.pop();
        }
    }

    backtrack(0, [], target);
    return result;
}
```

**Time:** O(n^(target/min)) | **Space:** O(target/min)

---

## 12. Dynamic Programming

### Use When
- Optimal substructure (optimal solution built from optimal subproblems)
- Overlapping subproblems
- Counting problems
- Min/max optimization

### Pattern: Top-Down (Memoization)

```typescript
function climbStairs(n: number): number {
    const memo = new Map<number, number>();

    function dp(i: number): number {
        if (i <= 1) return 1;
        if (memo.has(i)) return memo.get(i)!;

        const result = dp(i - 1) + dp(i - 2);
        memo.set(i, result);
        return result;
    }

    return dp(n);
}
```

### Pattern: Bottom-Up (Tabulation)

```typescript
function climbStairsBottomUp(n: number): number {
    if (n <= 1) return 1;

    const dp = new Array(n + 1).fill(0);
    dp[0] = 1;
    dp[1] = 1;

    for (let i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }

    return dp[n];
}

// Space optimized
function climbStairsOptimized(n: number): number {
    if (n <= 1) return 1;

    let prev2 = 1;
    let prev1 = 1;

    for (let i = 2; i <= n; i++) {
        const current = prev1 + prev2;
        prev2 = prev1;
        prev1 = current;
    }

    return prev1;
}
```

### Example: Coin Change

```typescript
function coinChange(coins: number[], amount: number): number {
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;

    for (let i = 1; i <= amount; i++) {
        for (const coin of coins) {
            if (coin <= i && dp[i - coin] !== Infinity) {
                dp[i] = Math.min(dp[i], dp[i - coin] + 1);
            }
        }
    }

    return dp[amount] === Infinity ? -1 : dp[amount];
}
```

**Time:** O(amount * coins) | **Space:** O(amount)

### Example: Longest Increasing Subsequence

```typescript
function lengthOfLIS(nums: number[]): number {
    const n = nums.length;
    const dp = new Array(n).fill(1);

    for (let i = 1; i < n; i++) {
        for (let j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                dp[i] = Math.max(dp[i], dp[j] + 1);
            }
        }
    }

    return Math.max(...dp);
}

// O(n log n) solution using binary search
function lengthOfLISOptimal(nums: number[]): number {
    const tails: number[] = [];

    for (const num of nums) {
        let left = 0;
        let right = tails.length;

        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (tails[mid] < num) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        if (left === tails.length) {
            tails.push(num);
        } else {
            tails[left] = num;
        }
    }

    return tails.length;
}
```

### Example: 0/1 Knapsack

```typescript
function knapsack(weights: number[], values: number[], capacity: number): number {
    const n = weights.length;
    const dp = Array.from({ length: n + 1 }, () =>
        new Array(capacity + 1).fill(0)
    );

    for (let i = 1; i <= n; i++) {
        for (let w = 0; w <= capacity; w++) {
            if (weights[i - 1] <= w) {
                dp[i][w] = Math.max(
                    dp[i - 1][w],
                    dp[i - 1][w - weights[i - 1]] + values[i - 1]
                );
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    return dp[n][capacity];
}
```

**Time:** O(n * capacity) | **Space:** O(n * capacity)

---

## 13. Greedy

### Use When
- Local optimal choice leads to global optimal
- Activity selection
- Huffman coding
- Minimum spanning tree

### Example: Jump Game

```typescript
function canJump(nums: number[]): boolean {
    let maxReach = 0;

    for (let i = 0; i < nums.length; i++) {
        if (i > maxReach) return false;
        maxReach = Math.max(maxReach, i + nums[i]);
    }

    return true;
}
```

**Time:** O(n) | **Space:** O(1)

### Example: Gas Station

```typescript
function canCompleteCircuit(gas: number[], cost: number[]): number {
    let totalSurplus = 0;
    let currentSurplus = 0;
    let startIdx = 0;

    for (let i = 0; i < gas.length; i++) {
        const surplus = gas[i] - cost[i];
        totalSurplus += surplus;
        currentSurplus += surplus;

        if (currentSurplus < 0) {
            startIdx = i + 1;
            currentSurplus = 0;
        }
    }

    return totalSurplus >= 0 ? startIdx : -1;
}
```

**Time:** O(n) | **Space:** O(1)

---

## 14. Topological Sort

### Use When
- Dependency resolution
- Task scheduling
- Course prerequisites
- Build systems

### Pattern: Kahn's Algorithm (BFS)

```typescript
function topologicalSort(numCourses: number, prerequisites: number[][]): number[] {
    const inDegree = new Array(numCourses).fill(0);
    const graph = new Map<number, number[]>();

    // Build graph
    for (const [course, prereq] of prerequisites) {
        if (!graph.has(prereq)) graph.set(prereq, []);
        graph.get(prereq)!.push(course);
        inDegree[course]++;
    }

    // Start with nodes that have no prerequisites
    const queue: number[] = [];
    for (let i = 0; i < numCourses; i++) {
        if (inDegree[i] === 0) queue.push(i);
    }

    const result: number[] = [];
    while (queue.length > 0) {
        const node = queue.shift()!;
        result.push(node);

        for (const neighbor of graph.get(node) ?? []) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) {
                queue.push(neighbor);
            }
        }
    }

    return result.length === numCourses ? result : [];  // Empty if cycle exists
}
```

**Time:** O(V + E) | **Space:** O(V + E)

---

## 15. Union-Find

### Use When
- Connected components
- Cycle detection in undirected graph
- Kruskal's MST
- Network connectivity

### Pattern: Union-Find with Path Compression

```typescript
class UnionFind {
    private parent: number[];
    private rank: number[];

    constructor(n: number) {
        this.parent = Array.from({ length: n }, (_, i) => i);
        this.rank = new Array(n).fill(0);
    }

    find(x: number): number {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);  // Path compression
        }
        return this.parent[x];
    }

    union(x: number, y: number): boolean {
        const rootX = this.find(x);
        const rootY = this.find(y);

        if (rootX === rootY) return false;  // Already connected

        // Union by rank
        if (this.rank[rootX] < this.rank[rootY]) {
            this.parent[rootX] = rootY;
        } else if (this.rank[rootX] > this.rank[rootY]) {
            this.parent[rootY] = rootX;
        } else {
            this.parent[rootY] = rootX;
            this.rank[rootX]++;
        }

        return true;
    }

    connected(x: number, y: number): boolean {
        return this.find(x) === this.find(y);
    }
}
```

### Example: Number of Connected Components

```typescript
function countComponents(n: number, edges: number[][]): number {
    const uf = new UnionFind(n);
    let components = n;

    for (const [a, b] of edges) {
        if (uf.union(a, b)) {
            components--;
        }
    }

    return components;
}
```

**Time:** O(n * α(n)) ≈ O(n) | **Space:** O(n)

---

## 16. Trie

### Use When
- Word prefix search
- Autocomplete
- Spell checker
- Word games

### Pattern: Basic Trie

```typescript
class TrieNode {
    children: Map<string, TrieNode> = new Map();
    isEnd = false;
}

class Trie {
    private root = new TrieNode();

    insert(word: string): void {
        let node = this.root;
        for (const char of word) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char)!;
        }
        node.isEnd = true;
    }

    search(word: string): boolean {
        const node = this.searchPrefix(word);
        return node !== null && node.isEnd;
    }

    startsWith(prefix: string): boolean {
        return this.searchPrefix(prefix) !== null;
    }

    private searchPrefix(prefix: string): TrieNode | null {
        let node = this.root;
        for (const char of prefix) {
            if (!node.children.has(char)) {
                return null;
            }
            node = node.children.get(char)!;
        }
        return node;
    }
}
```

**Time:** O(m) for each operation where m is word length | **Space:** O(total characters)

---

## 17. Bit Manipulation

### Use When
- Working with binary representations
- Checking if power of 2
- Finding single number
- Subset generation

### Common Operations

```typescript
// Check if bit is set
function getBit(n: number, i: number): boolean {
    return (n & (1 << i)) !== 0;
}

// Set bit
function setBit(n: number, i: number): number {
    return n | (1 << i);
}

// Clear bit
function clearBit(n: number, i: number): number {
    return n & ~(1 << i);
}

// Toggle bit
function toggleBit(n: number, i: number): number {
    return n ^ (1 << i);
}

// Count set bits
function countBits(n: number): number {
    let count = 0;
    while (n > 0) {
        count += n & 1;
        n >>>= 1;  // Unsigned right shift
    }
    return count;
}

// Check if power of 2
function isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
}
```

### Example: Single Number (XOR)

```typescript
function singleNumber(nums: number[]): number {
    let result = 0;
    for (const num of nums) {
        result ^= num;  // a ^ a = 0, a ^ 0 = a
    }
    return result;
}
```

**Time:** O(n) | **Space:** O(1)

### Example: Subsets Using Bits

```typescript
function subsetsWithBits(nums: number[]): number[][] {
    const n = nums.length;
    const result: number[][] = [];

    for (let mask = 0; mask < (1 << n); mask++) {
        const subset: number[] = [];
        for (let i = 0; i < n; i++) {
            if (mask & (1 << i)) {
                subset.push(nums[i]);
            }
        }
        result.push(subset);
    }

    return result;
}
```

**Time:** O(2^n * n) | **Space:** O(n)

---

## Pattern Selection Guide

| Problem Type | Pattern |
|--------------|---------|
| Sorted array, find pair | Two Pointers |
| Contiguous subarray | Sliding Window |
| Sorted array, find element | Binary Search |
| Range sum queries | Prefix Sum |
| Next greater/smaller | Monotonic Stack |
| O(1) lookups | Hash Map |
| Median/streaming | Two Heaps |
| Overlapping ranges | Merge Intervals |
| Numbers 1 to n | Cyclic Sort |
| Tree/graph traversal | BFS/DFS |
| All possibilities | Backtracking |
| Optimization | Dynamic Programming |
| Local → global optimal | Greedy |
| Dependencies | Topological Sort |
| Connected components | Union-Find |
| Word prefixes | Trie |
| Binary representation | Bit Manipulation |
