# Algorithm Patterns in Go

> The 17 patterns that solve 90% of coding interview problems

This guide implements the core algorithmic patterns from the StructWeave pattern guides in idiomatic Go.

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

---

## Two Pointers

Use when: Sorted arrays, finding pairs, palindromes, removing duplicates.

### Pattern Template

```go
// Opposite ends (converging)
left, right := 0, len(arr)-1
for left < right {
    // Process based on arr[left] and arr[right]
    if condition {
        left++
    } else {
        right--
    }
}

// Same direction (fast/slow)
slow, fast := 0, 0
for fast < len(arr) {
    if condition {
        arr[slow] = arr[fast]
        slow++
    }
    fast++
}
```

### Example: Two Sum II (Sorted Array)

```go
func twoSum(numbers []int, target int) []int {
    left, right := 0, len(numbers)-1

    for left < right {
        sum := numbers[left] + numbers[right]
        if sum == target {
            return []int{left + 1, right + 1}  // 1-indexed
        } else if sum < target {
            left++
        } else {
            right--
        }
    }
    return nil
}
```

### Example: Remove Duplicates from Sorted Array

```go
func removeDuplicates(nums []int) int {
    if len(nums) == 0 {
        return 0
    }

    slow := 1
    for fast := 1; fast < len(nums); fast++ {
        if nums[fast] != nums[fast-1] {
            nums[slow] = nums[fast]
            slow++
        }
    }
    return slow
}
```

### Example: Container With Most Water

```go
func maxArea(height []int) int {
    maxWater := 0
    left, right := 0, len(height)-1

    for left < right {
        width := right - left
        h := min(height[left], height[right])
        maxWater = max(maxWater, width*h)

        if height[left] < height[right] {
            left++
        } else {
            right--
        }
    }
    return maxWater
}
```

---

## Sliding Window

Use when: Contiguous subarrays/substrings, fixed or variable window size.

### Fixed Window Template

```go
func fixedWindow(arr []int, k int) int {
    windowSum := 0
    maxSum := 0

    // Initialize window
    for i := 0; i < k; i++ {
        windowSum += arr[i]
    }
    maxSum = windowSum

    // Slide window
    for i := k; i < len(arr); i++ {
        windowSum += arr[i] - arr[i-k]  // Add new, remove old
        maxSum = max(maxSum, windowSum)
    }
    return maxSum
}
```

### Variable Window Template

```go
func variableWindow(s string) int {
    seen := make(map[byte]int)
    left := 0
    maxLen := 0

    for right := 0; right < len(s); right++ {
        // Expand window
        seen[s[right]]++

        // Shrink window while invalid
        for /* window invalid */ {
            seen[s[left]]--
            if seen[s[left]] == 0 {
                delete(seen, s[left])
            }
            left++
        }

        // Update result
        maxLen = max(maxLen, right-left+1)
    }
    return maxLen
}
```

### Example: Longest Substring Without Repeating Characters

```go
func lengthOfLongestSubstring(s string) int {
    seen := make(map[byte]int)  // char -> last index
    left := 0
    maxLen := 0

    for right := 0; right < len(s); right++ {
        char := s[right]

        if lastIdx, exists := seen[char]; exists && lastIdx >= left {
            left = lastIdx + 1  // Jump past duplicate
        }

        seen[char] = right
        maxLen = max(maxLen, right-left+1)
    }
    return maxLen
}
```

### Example: Minimum Window Substring

```go
func minWindow(s string, t string) string {
    if len(s) < len(t) {
        return ""
    }

    // Count required characters
    need := make(map[byte]int)
    for i := 0; i < len(t); i++ {
        need[t[i]]++
    }

    have := make(map[byte]int)
    formed := 0
    required := len(need)

    left := 0
    minLen := len(s) + 1
    result := ""

    for right := 0; right < len(s); right++ {
        char := s[right]
        have[char]++

        if need[char] > 0 && have[char] == need[char] {
            formed++
        }

        // Shrink window
        for formed == required {
            if right-left+1 < minLen {
                minLen = right - left + 1
                result = s[left : right+1]
            }

            leftChar := s[left]
            have[leftChar]--
            if need[leftChar] > 0 && have[leftChar] < need[leftChar] {
                formed--
            }
            left++
        }
    }
    return result
}
```

---

## Binary Search

Use when: Sorted array, monotonic function, finding boundary.

### Template

```go
func binarySearch(nums []int, target int) int {
    left, right := 0, len(nums)-1

    for left <= right {
        mid := left + (right-left)/2  // Avoid overflow

        if nums[mid] == target {
            return mid
        } else if nums[mid] < target {
            left = mid + 1
        } else {
            right = mid - 1
        }
    }
    return -1  // Not found
}
```

### Finding Boundaries

```go
// Find first position >= target (lower bound)
func lowerBound(nums []int, target int) int {
    left, right := 0, len(nums)

    for left < right {
        mid := left + (right-left)/2
        if nums[mid] < target {
            left = mid + 1
        } else {
            right = mid
        }
    }
    return left
}

// Find first position > target (upper bound)
func upperBound(nums []int, target int) int {
    left, right := 0, len(nums)

    for left < right {
        mid := left + (right-left)/2
        if nums[mid] <= target {
            left = mid + 1
        } else {
            right = mid
        }
    }
    return left
}
```

### Using sort.Search

```go
import "sort"

// sort.Search finds smallest index where f(i) is true
// Array must be: f(i) == false for i < result, true for i >= result

// Find first >= target
idx := sort.Search(len(nums), func(i int) bool {
    return nums[i] >= target
})

// Find first > target
idx := sort.Search(len(nums), func(i int) bool {
    return nums[i] > target
})
```

### Example: Search in Rotated Sorted Array

```go
func search(nums []int, target int) int {
    left, right := 0, len(nums)-1

    for left <= right {
        mid := left + (right-left)/2

        if nums[mid] == target {
            return mid
        }

        // Left half is sorted
        if nums[left] <= nums[mid] {
            if target >= nums[left] && target < nums[mid] {
                right = mid - 1
            } else {
                left = mid + 1
            }
        } else {
            // Right half is sorted
            if target > nums[mid] && target <= nums[right] {
                left = mid + 1
            } else {
                right = mid - 1
            }
        }
    }
    return -1
}
```

---

## Prefix Sum

Use when: Range sum queries, subarray sums.

### Template

```go
// Build prefix sum
func buildPrefixSum(nums []int) []int {
    prefix := make([]int, len(nums)+1)
    for i, num := range nums {
        prefix[i+1] = prefix[i] + num
    }
    return prefix
}

// Query range sum [i, j] inclusive
func rangeSum(prefix []int, i, j int) int {
    return prefix[j+1] - prefix[i]
}
```

### Example: Subarray Sum Equals K

```go
func subarraySum(nums []int, k int) int {
    count := 0
    prefixSum := 0
    seen := map[int]int{0: 1}  // prefix sum -> count

    for _, num := range nums {
        prefixSum += num
        // If prefixSum - k exists, we found subarrays
        if cnt, exists := seen[prefixSum-k]; exists {
            count += cnt
        }
        seen[prefixSum]++
    }
    return count
}
```

---

## Monotonic Stack

Use when: Next greater/smaller element, histogram problems.

### Template

```go
// Next greater element
func nextGreater(nums []int) []int {
    n := len(nums)
    result := make([]int, n)
    for i := range result {
        result[i] = -1
    }

    stack := []int{}  // indices

    for i := 0; i < n; i++ {
        for len(stack) > 0 && nums[i] > nums[stack[len(stack)-1]] {
            idx := stack[len(stack)-1]
            stack = stack[:len(stack)-1]
            result[idx] = nums[i]
        }
        stack = append(stack, i)
    }
    return result
}
```

### Example: Daily Temperatures

```go
func dailyTemperatures(temperatures []int) []int {
    n := len(temperatures)
    result := make([]int, n)
    stack := []int{}  // indices

    for i := 0; i < n; i++ {
        for len(stack) > 0 && temperatures[i] > temperatures[stack[len(stack)-1]] {
            idx := stack[len(stack)-1]
            stack = stack[:len(stack)-1]
            result[idx] = i - idx
        }
        stack = append(stack, i)
    }
    return result
}
```

### Example: Largest Rectangle in Histogram

```go
func largestRectangleArea(heights []int) int {
    stack := []int{}
    maxArea := 0
    heights = append(heights, 0)  // Sentinel

    for i, h := range heights {
        for len(stack) > 0 && h < heights[stack[len(stack)-1]] {
            height := heights[stack[len(stack)-1]]
            stack = stack[:len(stack)-1]

            width := i
            if len(stack) > 0 {
                width = i - stack[len(stack)-1] - 1
            }
            maxArea = max(maxArea, height*width)
        }
        stack = append(stack, i)
    }
    return maxArea
}
```

---

## Hash Map Patterns

### Two Sum Pattern

```go
func twoSum(nums []int, target int) []int {
    seen := make(map[int]int)  // value -> index

    for i, num := range nums {
        complement := target - num
        if j, exists := seen[complement]; exists {
            return []int{j, i}
        }
        seen[num] = i
    }
    return nil
}
```

### Frequency Counter

```go
func topKFrequent(nums []int, k int) []int {
    // Count frequencies
    freq := make(map[int]int)
    for _, num := range nums {
        freq[num]++
    }

    // Bucket sort by frequency
    buckets := make([][]int, len(nums)+1)
    for num, count := range freq {
        buckets[count] = append(buckets[count], num)
    }

    // Collect top k
    result := []int{}
    for i := len(buckets) - 1; i >= 0 && len(result) < k; i-- {
        result = append(result, buckets[i]...)
    }
    return result[:k]
}
```

### Anagram Grouping

```go
func groupAnagrams(strs []string) [][]string {
    groups := make(map[string][]string)

    for _, s := range strs {
        // Sort string to create key
        chars := []byte(s)
        sort.Slice(chars, func(i, j int) bool {
            return chars[i] < chars[j]
        })
        key := string(chars)
        groups[key] = append(groups[key], s)
    }

    result := make([][]string, 0, len(groups))
    for _, group := range groups {
        result = append(result, group)
    }
    return result
}
```

---

## Two Heaps

Use when: Finding median, balanced partitions.

```go
import "container/heap"

// Max heap
type MaxHeap []int
func (h MaxHeap) Len() int           { return len(h) }
func (h MaxHeap) Less(i, j int) bool { return h[i] > h[j] }
func (h MaxHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *MaxHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *MaxHeap) Pop() any {
    old := *h
    x := old[len(old)-1]
    *h = old[:len(old)-1]
    return x
}

// Min heap
type MinHeap []int
func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *MinHeap) Push(x any)        { *h = append(*h, x.(int)) }
func (h *MinHeap) Pop() any {
    old := *h
    x := old[len(old)-1]
    *h = old[:len(old)-1]
    return x
}

// MedianFinder maintains running median
type MedianFinder struct {
    small *MaxHeap  // smaller half
    large *MinHeap  // larger half
}

func Constructor() MedianFinder {
    small := &MaxHeap{}
    large := &MinHeap{}
    heap.Init(small)
    heap.Init(large)
    return MedianFinder{small, large}
}

func (mf *MedianFinder) AddNum(num int) {
    heap.Push(mf.small, num)
    heap.Push(mf.large, heap.Pop(mf.small))

    if mf.large.Len() > mf.small.Len() {
        heap.Push(mf.small, heap.Pop(mf.large))
    }
}

func (mf *MedianFinder) FindMedian() float64 {
    if mf.small.Len() > mf.large.Len() {
        return float64((*mf.small)[0])
    }
    return float64((*mf.small)[0]+(*mf.large)[0]) / 2.0
}
```

---

## Merge Intervals

```go
import "sort"

func merge(intervals [][]int) [][]int {
    if len(intervals) == 0 {
        return nil
    }

    // Sort by start time
    sort.Slice(intervals, func(i, j int) bool {
        return intervals[i][0] < intervals[j][0]
    })

    result := [][]int{intervals[0]}

    for i := 1; i < len(intervals); i++ {
        last := result[len(result)-1]
        curr := intervals[i]

        if curr[0] <= last[1] {  // Overlapping
            last[1] = max(last[1], curr[1])
        } else {
            result = append(result, curr)
        }
    }
    return result
}
```

---

## Cyclic Sort

Use when: Numbers in range [1, n], find missing/duplicate.

```go
// Find missing number in [0, n]
func missingNumber(nums []int) int {
    n := len(nums)
    i := 0

    for i < n {
        j := nums[i]
        if j < n && j != i {
            nums[i], nums[j] = nums[j], nums[i]
        } else {
            i++
        }
    }

    for i := 0; i < n; i++ {
        if nums[i] != i {
            return i
        }
    }
    return n
}

// Find duplicate
func findDuplicate(nums []int) int {
    for i := 0; i < len(nums); {
        j := nums[i] - 1
        if nums[i] != nums[j] {
            nums[i], nums[j] = nums[j], nums[i]
        } else {
            i++
        }
    }

    for i := 0; i < len(nums); i++ {
        if nums[i] != i+1 {
            return nums[i]
        }
    }
    return -1
}
```

---

## BFS/DFS

### BFS Template

```go
func bfs(start Node) {
    queue := []Node{start}
    visited := make(map[Node]bool)
    visited[start] = true

    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]

        // Process node
        for _, neighbor := range node.Neighbors {
            if !visited[neighbor] {
                visited[neighbor] = true
                queue = append(queue, neighbor)
            }
        }
    }
}
```

### DFS Template

```go
func dfs(node Node, visited map[Node]bool) {
    if visited[node] {
        return
    }
    visited[node] = true

    // Process node
    for _, neighbor := range node.Neighbors {
        dfs(neighbor, visited)
    }
}
```

### Example: Number of Islands

```go
func numIslands(grid [][]byte) int {
    if len(grid) == 0 {
        return 0
    }

    rows, cols := len(grid), len(grid[0])
    count := 0

    var dfs func(r, c int)
    dfs = func(r, c int) {
        if r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] == '0' {
            return
        }
        grid[r][c] = '0'  // Mark visited
        dfs(r+1, c)
        dfs(r-1, c)
        dfs(r, c+1)
        dfs(r, c-1)
    }

    for r := 0; r < rows; r++ {
        for c := 0; c < cols; c++ {
            if grid[r][c] == '1' {
                count++
                dfs(r, c)
            }
        }
    }
    return count
}
```

---

## Backtracking

### Template

```go
func backtrack(result *[][]int, path []int, choices []int) {
    if /* goal reached */ {
        // Make a copy before appending!
        pathCopy := make([]int, len(path))
        copy(pathCopy, path)
        *result = append(*result, pathCopy)
        return
    }

    for i, choice := range choices {
        // Make choice
        path = append(path, choice)

        // Recurse
        backtrack(result, path, choices[i+1:])  // For combinations
        // backtrack(result, path, choices)     // For permutations with reuse

        // Undo choice
        path = path[:len(path)-1]
    }
}
```

### Example: Subsets

```go
func subsets(nums []int) [][]int {
    result := [][]int{}

    var backtrack func(start int, path []int)
    backtrack = func(start int, path []int) {
        // Add current subset
        pathCopy := make([]int, len(path))
        copy(pathCopy, path)
        result = append(result, pathCopy)

        for i := start; i < len(nums); i++ {
            path = append(path, nums[i])
            backtrack(i+1, path)
            path = path[:len(path)-1]
        }
    }

    backtrack(0, []int{})
    return result
}
```

### Example: Permutations

```go
func permute(nums []int) [][]int {
    result := [][]int{}
    used := make([]bool, len(nums))

    var backtrack func(path []int)
    backtrack = func(path []int) {
        if len(path) == len(nums) {
            pathCopy := make([]int, len(path))
            copy(pathCopy, path)
            result = append(result, pathCopy)
            return
        }

        for i := 0; i < len(nums); i++ {
            if used[i] {
                continue
            }
            used[i] = true
            path = append(path, nums[i])
            backtrack(path)
            path = path[:len(path)-1]
            used[i] = false
        }
    }

    backtrack([]int{})
    return result
}
```

---

## Dynamic Programming

### 1D DP Template

```go
func solve(n int) int {
    // Base cases
    if n <= 1 {
        return n
    }

    dp := make([]int, n+1)
    dp[0] = baseCase0
    dp[1] = baseCase1

    for i := 2; i <= n; i++ {
        dp[i] = /* recurrence relation */
    }
    return dp[n]
}
```

### 2D DP Template

```go
func solve(m, n int) int {
    dp := make([][]int, m+1)
    for i := range dp {
        dp[i] = make([]int, n+1)
    }

    // Base cases
    for i := 0; i <= m; i++ {
        dp[i][0] = baseCaseRow
    }
    for j := 0; j <= n; j++ {
        dp[0][j] = baseCaseCol
    }

    // Fill DP table
    for i := 1; i <= m; i++ {
        for j := 1; j <= n; j++ {
            dp[i][j] = /* recurrence */
        }
    }
    return dp[m][n]
}
```

### Example: Climbing Stairs

```go
func climbStairs(n int) int {
    if n <= 2 {
        return n
    }

    prev2, prev1 := 1, 2
    for i := 3; i <= n; i++ {
        prev2, prev1 = prev1, prev2+prev1
    }
    return prev1
}
```

### Example: Longest Common Subsequence

```go
func longestCommonSubsequence(text1, text2 string) int {
    m, n := len(text1), len(text2)
    dp := make([][]int, m+1)
    for i := range dp {
        dp[i] = make([]int, n+1)
    }

    for i := 1; i <= m; i++ {
        for j := 1; j <= n; j++ {
            if text1[i-1] == text2[j-1] {
                dp[i][j] = dp[i-1][j-1] + 1
            } else {
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
            }
        }
    }
    return dp[m][n]
}
```

---

## Greedy

### Example: Jump Game

```go
func canJump(nums []int) bool {
    maxReach := 0

    for i := 0; i < len(nums); i++ {
        if i > maxReach {
            return false
        }
        maxReach = max(maxReach, i+nums[i])
    }
    return true
}
```

### Example: Task Scheduler

```go
func leastInterval(tasks []byte, n int) int {
    // Count frequencies
    freq := make([]int, 26)
    maxFreq := 0
    for _, t := range tasks {
        freq[t-'A']++
        maxFreq = max(maxFreq, freq[t-'A'])
    }

    // Count tasks with max frequency
    maxCount := 0
    for _, f := range freq {
        if f == maxFreq {
            maxCount++
        }
    }

    // Formula: (maxFreq - 1) * (n + 1) + maxCount
    result := (maxFreq-1)*(n+1) + maxCount
    return max(result, len(tasks))
}
```

---

## Topological Sort

```go
func topologicalSort(numCourses int, prerequisites [][]int) []int {
    // Build graph and in-degree
    graph := make([][]int, numCourses)
    inDegree := make([]int, numCourses)

    for _, p := range prerequisites {
        course, prereq := p[0], p[1]
        graph[prereq] = append(graph[prereq], course)
        inDegree[course]++
    }

    // BFS with nodes of in-degree 0
    queue := []int{}
    for i := 0; i < numCourses; i++ {
        if inDegree[i] == 0 {
            queue = append(queue, i)
        }
    }

    result := []int{}
    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]
        result = append(result, node)

        for _, neighbor := range graph[node] {
            inDegree[neighbor]--
            if inDegree[neighbor] == 0 {
                queue = append(queue, neighbor)
            }
        }
    }

    if len(result) != numCourses {
        return nil  // Cycle detected
    }
    return result
}
```

---

## Quick Reference

| Pattern | Key Signal | Time |
|---------|------------|------|
| Two Pointers | Sorted array, pair finding | O(n) |
| Sliding Window | Contiguous subarray | O(n) |
| Binary Search | Sorted, monotonic | O(log n) |
| Hash Map | O(1) lookup needed | O(n) |
| Monotonic Stack | Next greater/smaller | O(n) |
| BFS | Shortest path, level order | O(V+E) |
| DFS | Explore all paths | O(V+E) |
| Backtracking | All combinations | O(2^n) |
| DP | Optimal substructure | Varies |
| Greedy | Local optimal = global | O(n log n) |

---

## Generic Utility Functions for Interviews

These generic helpers reduce boilerplate in interview code:

```go
import (
    "cmp"
    "slices"
)

// Min/Max for any ordered type
func Min[T cmp.Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

// Abs for signed numbers
func Abs[T ~int | ~int64 | ~float64](x T) T {
    if x < 0 {
        return -x
    }
    return x
}

// Contains using generics
func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target {
            return true
        }
    }
    return false
}
// Or use: slices.Contains(slice, target)

// IndexOf
func IndexOf[T comparable](slice []T, target T) int {
    for i, v := range slice {
        if v == target {
            return i
        }
    }
    return -1
}
// Or use: slices.Index(slice, target)

// Reverse slice in place
func Reverse[T any](s []T) {
    for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
        s[i], s[j] = s[j], s[i]
    }
}
// Or use: slices.Reverse(s)

// Count occurrences
func Count[T comparable](slice []T, target T) int {
    count := 0
    for _, v := range slice {
        if v == target {
            count++
        }
    }
    return count
}

// Unique elements (preserves order)
func Unique[T comparable](slice []T) []T {
    seen := make(map[T]struct{})
    result := make([]T, 0, len(slice))
    for _, v := range slice {
        if _, exists := seen[v]; !exists {
            seen[v] = struct{}{}
            result = append(result, v)
        }
    }
    return result
}
```

### Using Standard Library Generics

```go
import (
    "cmp"
    "slices"
    "maps"
)

// Prefer standard library when available
nums := []int{3, 1, 4, 1, 5}

slices.Sort(nums)                        // Sort in place
slices.Contains(nums, 4)                 // Check membership
idx := slices.Index(nums, 4)             // Find index
slices.Reverse(nums)                     // Reverse in place
minVal := slices.Min(nums)               // Find minimum
maxVal := slices.Max(nums)               // Find maximum
idx, found := slices.BinarySearch(nums, 4)  // Binary search

// Multi-field comparison
slices.SortFunc(items, func(a, b Item) int {
    if c := cmp.Compare(a.Priority, b.Priority); c != 0 {
        return c
    }
    return cmp.Compare(a.Name, b.Name)
})

// Map operations
m := map[string]int{"a": 1, "b": 2}
copy := maps.Clone(m)
maps.Equal(m, copy)
```

### Generic Data Structures for Interviews

```go
// Generic Stack (works for any type)
type Stack[T any] []T

func (s *Stack[T]) Push(v T)      { *s = append(*s, v) }
func (s *Stack[T]) Pop() T        { v := (*s)[len(*s)-1]; *s = (*s)[:len(*s)-1]; return v }
func (s *Stack[T]) Peek() T       { return (*s)[len(*s)-1] }
func (s *Stack[T]) IsEmpty() bool { return len(*s) == 0 }

// Generic Set
type Set[T comparable] map[T]struct{}

func NewSet[T comparable]() Set[T]       { return make(Set[T]) }
func (s Set[T]) Add(v T)                 { s[v] = struct{}{} }
func (s Set[T]) Has(v T) bool            { _, ok := s[v]; return ok }
func (s Set[T]) Remove(v T)              { delete(s, v) }

// Usage in interview
func hasDuplicates[T comparable](items []T) bool {
    seen := NewSet[T]()
    for _, item := range items {
        if seen.Has(item) {
            return true
        }
        seen.Add(item)
    }
    return false
}
```

---

**Next:** [05-idioms-best-practices.md](05-idioms-best-practices.md) — Write idiomatic Go code
