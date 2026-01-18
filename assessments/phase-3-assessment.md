---
title: Phase 3 Assessment - Advanced Patterns
type: assessment
difficulty: advanced
estimated_time_minutes: 90
passing_score: "5/7 problems solved correctly (71%)"
patterns_tested: ["heap", "k-way-merge", "two-heaps", "bfs-dfs", "topological-sort"]
---

# Phase 3 Assessment - Advanced Patterns

## Purpose

This assessment evaluates your mastery of advanced algorithmic patterns involving heaps, graph traversal, and complex data structure manipulation. These patterns are essential for senior-level interviews and appear in 25-35% of challenging technical problems.

## Patterns Covered

- **Heaps (Priority Queues):** Top-K problems, scheduling, optimization
- **K-way Merge:** Merging multiple sorted sequences
- **Two Heaps:** Median finding, streaming data
- **BFS/DFS:** Graph and tree traversal, shortest paths
- **Topological Sort:** Dependency resolution, ordering problems

## Assessment Structure

- **7 Problems** ranging from medium to hard difficulty
- **Estimated Time:** 90 minutes total (12-15 minutes per problem)
- **Passing Score:** 5/7 problems solved correctly (71%)
- **Prerequisites:** Must pass Phase 2 Assessment

## Instructions

1. Solve problems in order (builds understanding progressively)
2. Write production-quality code
3. Analyze time and space complexity
4. Identify the pattern before coding
5. Handle edge cases explicitly

---

## Problem 1: Heap Basics - Top K Elements (Medium, 12 minutes)
**Problem ID:** E219 - Kth Largest Element in Stream

### Problem Statement

Design a class to find the kth largest element in a stream. Note that it is the kth largest element in the sorted order, not the kth distinct element.

Implement `KthLargest` class:
- `KthLargest(int k, int[] nums)` - Initializes the object with the integer k and the stream of integers nums
- `int add(int val)` - Appends the integer val to the stream and returns the element representing the kth largest element in the stream

### Examples
```
Input:
["KthLargest", "add", "add", "add", "add", "add"]
[[3, [4, 5, 8, 2]], [3], [5], [10], [9], [4]]

Output:
[null, 4, 5, 5, 8, 8]

Explanation:
KthLargest kthLargest = new KthLargest(3, [4, 5, 8, 2]);
kthLargest.add(3);   // return 4
kthLargest.add(5);   // return 5
kthLargest.add(10);  // return 5
kthLargest.add(9);   // return 8
kthLargest.add(4);   // return 8
```

### Constraints
- 1 ≤ k ≤ 10,000
- 0 ≤ nums.length ≤ 10,000
- -10,000 ≤ nums[i] ≤ 10,000
- -10,000 ≤ val ≤ 10,000
- At most 10,000 calls to `add`

### Requirements
- Use min-heap of size k
- Initialize: O(n log k), Add: O(log k)
- Space: O(k)
- Explain why min-heap instead of max-heap

**Reference:** [E219 - Kth Largest in Stream](../problems/easy/E219_kth_largest_element_in_a_stream.md)

---

## Problem 2: K-way Merge Pattern (Hard, 15 minutes)
**Problem ID:** H003 - Merge K Sorted Lists

### Problem Statement

You are given an array of `k` linked lists `lists`, each linked list is sorted in ascending order.

Merge all the linked lists into one sorted linked list and return it.

### Examples
```
Input: lists = [[1,4,5],[1,3,4],[2,6]]
Output: [1,1,2,3,4,4,5,6]
Explanation: The linked-lists are:
[
  1->4->5,
  1->3->4,
  2->6
]
merging them into one sorted list: 1->1->2->3->4->4->5->6

Input: lists = []
Output: []

Input: lists = [[]]
Output: []
```

### Constraints
- k == lists.length
- 0 ≤ k ≤ 10,000
- 0 ≤ lists[i].length ≤ 500
- -10,000 ≤ lists[i][j] ≤ 10,000
- lists[i] is sorted in ascending order
- The sum of lists[i].length ≤ 10,000

### Requirements
- Use min-heap to track k heads
- O(N log k) time where N = total nodes, k = number of lists
- O(k) space for heap
- Handle empty lists and edge cases

**Reference:** [H003 - Merge K Sorted Lists](../problems/hard/H003_merge_k_sorted_lists.md)

---

## Problem 3: Two Heaps - Streaming Median (Hard, 15 minutes)
**Problem ID:** H001 - Median of Two Sorted Arrays (Alternative: design median finder)

### Problem Statement

Design a data structure that supports the following operations:
- `void addNum(int num)` - Add an integer from the data stream
- `double findMedian()` - Return the median of all elements so far

The median is the middle value in an ordered list. If the size is even, return the average of the two middle values.

### Examples
```
Input:
["MedianFinder", "addNum", "addNum", "findMedian", "addNum", "findMedian"]
[[], [1], [2], [], [3], []]

Output:
[null, null, null, 1.5, null, 2.0]

Explanation:
MedianFinder medianFinder = new MedianFinder();
medianFinder.addNum(1);    // arr = [1]
medianFinder.addNum(2);    // arr = [1, 2]
medianFinder.findMedian(); // return 1.5 (average of 1 and 2)
medianFinder.addNum(3);    // arr = [1, 2, 3]
medianFinder.findMedian(); // return 2.0 (middle element)
```

### Constraints
- -10^5 ≤ num ≤ 10^5
- At most 50,000 calls to `addNum` and `findMedian`

### Requirements
- Use two heaps: max-heap for lower half, min-heap for upper half
- addNum: O(log n), findMedian: O(1)
- Space: O(n)
- Maintain heap size invariant (sizes differ by at most 1)

**Alternative Reference:** [H001 - Median of Two Sorted Arrays](../problems/hard/H001_median_of_two_sorted_arrays.md)

---

## Problem 4: BFS - Level Order Traversal (Easy, 10 minutes)
**Problem ID:** E205 - Average of Levels in Binary Tree

### Problem Statement

Given the root of a binary tree, return the average value of the nodes on each level in the form of an array.

### Examples
```
Input: root = [3,9,20,null,null,15,7]
        3
       / \
      9  20
         / \
        15  7
Output: [3.0, 14.5, 11.0]
Explanation:
- Level 0: 3
- Level 1: (9 + 20) / 2 = 14.5
- Level 2: (15 + 7) / 2 = 11.0

Input: root = [3,9,20,15,7]
Output: [3.0, 14.5, 11.0]
```

### Constraints
- The number of nodes in the tree is in range [1, 10,000]
- -2^31 ≤ Node.val ≤ 2^31 - 1

### Requirements
- Use BFS with queue
- Process level-by-level
- O(n) time, O(w) space where w is max width
- Avoid overflow when calculating average

**Reference:** [E205 - Average of Levels](../problems/easy/E205_average_of_levels_in_binary_tree.md)

---

## Problem 5: DFS - Path Problems (Easy, 12 minutes)
**Problem ID:** E099 - Binary Tree Paths

### Problem Statement

Given the root of a binary tree, return all root-to-leaf paths in any order.

A leaf is a node with no children.

### Examples
```
Input: root = [1,2,3,null,5]
      1
     / \
    2   3
     \
      5
Output: ["1->2->5", "1->3"]

Input: root = [1]
Output: ["1"]
```

### Constraints
- The number of nodes in the tree is in range [1, 100]
- -100 ≤ Node.val ≤ 100

### Requirements
- Use DFS (recursive or iterative)
- Build path strings correctly
- O(n) time, O(h) space where h is height
- Handle single node and deep trees

**Reference:** [E099 - Binary Tree Paths](../problems/easy/E099_binary_tree_paths.md)

---

## Problem 6: Graph BFS - Shortest Path (Medium, 13 minutes)
**Problem ID:** M568 - Rotting Oranges

### Problem Statement

You are given an m x n grid where each cell can have one of three values:
- 0 representing an empty cell
- 1 representing a fresh orange
- 2 representing a rotten orange

Every minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten.

Return the minimum number of minutes that must elapse until no cell has a fresh orange. If this is impossible, return -1.

### Examples
```
Input: grid = [[2,1,1],[1,1,0],[0,1,1]]
Output: 4

Input: grid = [[2,1,1],[0,1,1],[1,0,1]]
Output: -1
Explanation: The orange in the bottom left corner can never rot

Input: grid = [[0,2]]
Output: 0
Explanation: No fresh oranges
```

### Constraints
- m == grid.length
- n == grid[i].length
- 1 ≤ m, n ≤ 10
- grid[i][j] is 0, 1, or 2

### Requirements
- Multi-source BFS (start from all rotten oranges)
- O(m*n) time, O(m*n) space
- Track minutes/levels correctly
- Check if all fresh oranges rotted

**Reference:** [M568 - Rotting Oranges](../problems/medium/M568_rotting_oranges.md)

---

## Problem 7: Topological Sort (Medium, 13 minutes)
**Problem ID:** M011 - Jump Game II (Alternative: Course Schedule)

### Problem Statement - Course Schedule II

There are a total of `numCourses` courses labeled from 0 to numCourses - 1. You are given an array `prerequisites` where `prerequisites[i] = [a_i, b_i]` indicates that you must take course b_i before course a_i.

Return the ordering of courses you should take to finish all courses. If there are many valid answers, return any of them. If it's impossible to finish all courses, return an empty array.

### Examples
```
Input: numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]
Output: [0,2,1,3] or [0,1,2,3]
Explanation: There are 4 courses. To take course 3 you need to finish courses 1 and 2.
Both courses 1 and 2 should be taken after course 0.

Input: numCourses = 2, prerequisites = [[1,0]]
Output: [0,1]

Input: numCourses = 2, prerequisites = [[1,0],[0,1]]
Output: []
Explanation: Impossible due to cycle
```

### Constraints
- 1 ≤ numCourses ≤ 2000
- 0 ≤ prerequisites.length ≤ 5000
- prerequisites[i].length == 2
- 0 ≤ a_i, b_i < numCourses
- All pairs are distinct

### Requirements
- Implement Kahn's algorithm (BFS) or DFS-based topological sort
- Detect cycles (return empty if cycle exists)
- O(V + E) time, O(V + E) space
- Explain indegree/outdegree concept

**Alternative Reference:** [M011 - Jump Game II](../problems/medium/M011_jump_game_ii.md) or similar topological problem

---

## Scoring Rubric

Each problem is scored individually:

### Full Credit (1 point)
- ✓ Correct pattern and data structure
- ✓ Optimal algorithm implemented
- ✓ Handles all edge cases
- ✓ Correct time and space complexity
- ✓ Clean, readable code
- ✓ Clear explanation of approach

### Partial Credit (0.5 points)
- ✓ Right pattern, minor implementation issues
- ✗ Suboptimal complexity but working solution
- ✗ Misses 1-2 edge cases
- ✓ Core logic correct

### No Credit (0 points)
- ✗ Wrong pattern or data structure
- ✗ Fundamentally flawed approach
- ✗ Far from optimal complexity
- ✗ Major bugs or incomplete

---

## Passing Criteria

**Minimum Score:** 5/7 (71%)

### Performance Levels

**7/7 (100%) - Exceptional**
- Mastered advanced patterns
- Ready for Phase 4 (Expert level)
- Consider competitive programming or system design
- Prepared for senior+ interviews

**6/7 (86%) - Excellent**
- Strong advanced skills
- Minor review needed on one pattern
- Ready for Phase 4
- Well-prepared for most tech interviews

**5/7 (71%) - Pass**
- Solid foundation in advanced patterns
- Review weaker areas
- Can proceed to Phase 4 with caution
- Additional practice recommended

**4/7 (57%) - Below Passing**
- Need targeted practice
- Focus on 2-3 weak patterns
- 15-20 more problems per weak pattern
- Retake in 2 weeks

**0-3/7 (<43%) - Significant Gaps**
- Return to Phase 3 materials
- May need Phase 2 review
- 40-50 more practice problems
- Consider study group or mentorship
- Retake in 3-4 weeks

---

## Pattern-Specific Evaluation

### Heaps (Problems 1-2)
**Key Concepts:**
- Min-heap vs max-heap selection
- Heap size maintenance
- K-way merge using heap for efficiency

**If you struggled:**
- Review [Heap Data Structure](../strategies/data-structures/heaps.md)
- Practice: Top K, scheduling problems
- Understand: When heap is better than sorting

**Common Issues:**
- Wrong heap type (min vs max)
- Not maintaining heap size invariant
- Incorrect complexity analysis

### Two Heaps (Problem 3)
**Key Concepts:**
- Balancing two heaps
- Max-heap for lower half, min-heap for upper half
- Rebalancing after insertion

**If you struggled:**
- Review median finding pattern
- Practice: Sliding window median
- Understand: Why two heaps achieve O(log n) insertion

**Common Issues:**
- Not maintaining size invariant
- Incorrect median calculation for even/odd sizes
- Forgetting to rebalance

### BFS/DFS (Problems 4-6)
**Key Concepts:**
- BFS for shortest path/level-order
- DFS for path finding/exhaustive search
- Queue for BFS, recursion/stack for DFS
- Multi-source BFS

**If you struggled:**
- Review [Graph Traversal](../strategies/patterns/graph-traversal.md)
- Practice: Tree traversals, grid problems
- Understand: When BFS vs DFS is appropriate

**Common Issues:**
- Not tracking visited nodes
- Wrong termination condition
- Queue vs stack confusion
- Not handling disconnected components

### Topological Sort (Problem 7)
**Key Concepts:**
- Indegree/outdegree tracking
- Kahn's algorithm (BFS-based)
- Cycle detection
- DAG (Directed Acyclic Graph) requirement

**If you struggled:**
- Review [Topological Sort](../strategies/patterns/topological-sort.md)
- Practice: Dependency problems, course schedules
- Understand: Why cycles make topo sort impossible

**Common Issues:**
- Not detecting cycles
- Incorrect indegree calculation
- Wrong graph representation
- Not handling disconnected nodes

---

## Common Mistakes by Pattern

### Heaps
- ❌ Using wrong heap type (min when need max)
- ❌ Not limiting heap size for Top-K problems
- ❌ Comparing nodes instead of values
- ❌ O(n log n) when O(n log k) is sufficient

### K-way Merge
- ❌ Not handling empty lists
- ❌ Wrong heap comparator
- ❌ Not advancing iterator after taking min
- ❌ Memory inefficiency (loading all at once)

### Two Heaps
- ❌ Not rebalancing heaps
- ❌ Wrong median calculation
- ❌ Heap size difference > 1
- ❌ Peek on empty heap

### BFS
- ❌ Not marking nodes as visited
- ❌ Visiting same node multiple times
- ❌ Not tracking level/distance
- ❌ Wrong queue operations

### DFS
- ❌ Not handling base case
- ❌ Not backtracking properly
- ❌ Stack overflow on deep recursion
- ❌ Not marking/unmarking visited

### Topological Sort
- ❌ Not checking for cycles
- ❌ Wrong indegree initialization
- ❌ Not processing all nodes
- ❌ Using undirected graph

---

## Time Allocation Guide

| Problem | Pattern | Difficulty | Est. Time | Cumulative |
|---------|---------|------------|-----------|------------|
| 1 | Heap (Top-K) | Medium | 12 min | 12 min |
| 2 | K-way Merge | Hard | 15 min | 27 min |
| 3 | Two Heaps | Hard | 15 min | 42 min |
| 4 | BFS (Tree) | Easy | 10 min | 52 min |
| 5 | DFS (Tree) | Easy | 12 min | 64 min |
| 6 | BFS (Graph) | Medium | 13 min | 77 min |
| 7 | Topo Sort | Medium | 13 min | 90 min |

**Strategy:** Hard problems (2-3) may take longer. Budget time accordingly. If stuck >18 minutes, move on.

---

## Post-Assessment Action Plan

### Immediate Actions (Day 1)

**For each problem:**

1. **Verify your solution:**
   - Test with all provided examples
   - Think of edge cases
   - Verify time/space complexity

2. **For incorrect solutions:**
   - Identify where you went wrong
   - Was it pattern recognition?
   - Implementation detail?
   - Edge case handling?

3. **Study optimal solution:**
   - Understand the approach
   - Trace through examples
   - Implement without looking

### Short-term Practice (Week 1)

**Focused practice by weak pattern:**

**Heaps (if weak):**
- Kth largest/smallest element
- Top K frequent elements
- Meeting rooms III
- Task scheduler
- (Practice 8-10 problems)

**BFS/DFS (if weak):**
- Number of islands
- Clone graph
- Course schedule I
- Pacific Atlantic water flow
- Word ladder
- (Practice 10-12 problems)

**Topological Sort (if weak):**
- Course schedule I & II
- Alien dictionary
- Sequence reconstruction
- Minimum height trees
- (Practice 6-8 problems)

### Long-term Mastery (Weeks 2-4)

1. **Integration practice:**
   - Problems combining multiple patterns
   - Example: Heap + BFS, DFS + Topological Sort
   - Focus on pattern recognition

2. **Advanced variations:**
   - Bidirectional BFS
   - A* algorithm
   - Dijkstra's shortest path
   - Union-Find alternatives

3. **System design integration:**
   - How do these patterns apply to systems?
   - Heap for task scheduling in distributed systems
   - BFS for social network friend recommendations
   - Topo sort for build systems

---

## Next Steps Based on Score

### If You Passed (5-7/7)

**Excellent work!** You're ready for expert-level patterns.

**Preparation for Phase 4:**

1. **Consolidate Phase 3 knowledge:**
   - Review any missed problems thoroughly
   - Solve 5-10 mixed problems combining Phase 3 patterns
   - Ensure you can explain WHY each pattern works

2. **Study Phase 4 preview materials:**
   - [Dynamic Programming](../strategies/patterns/dynamic-programming.md)
   - [Backtracking](../strategies/patterns/backtracking.md)
   - [Greedy Algorithms](../strategies/patterns/greedy.md)
   - [Divide and Conquer](../strategies/patterns/divide-and-conquer.md)

3. **Advanced topics:**
   - Graph algorithms (Dijkstra, Floyd-Warshall, Bellman-Ford)
   - Advanced tree structures (Segment tree, Fenwick tree)
   - Trie and advanced string algorithms

4. **Schedule [Phase 4 Assessment](./phase-4-assessment.md)** in 2-3 weeks

**Stretch goals (for 7/7 scorers):**
- Compete in online contests (Codeforces, CodeChef)
- Solve hard problems from companies you target
- Contribute to algorithm visualization projects

### If You Didn't Pass (0-4/7)

**Keep pushing!** Advanced patterns take time to master.

**Structured Recovery Plan:**

**Week 1-2: Deep Dive on Weak Patterns**
- Choose your 2 weakest patterns
- Read pattern guide thoroughly
- Solve 12-15 problems per pattern
- Focus on understanding, not speed
- Join study group or find study partner

**Week 3: Integration & Review**
- Solve mixed problems
- Retry Phase 3 assessment problems
- Focus on pattern recognition
- Time yourself but don't stress

**Week 4: Reassessment**
- Take Phase 3 assessment again
- Should see significant improvement
- If still struggling, review Phase 2 patterns
- Consider getting help from mentor/tutor

**Resources:**
- [Graph Algorithms Guide](../strategies/patterns/graph-traversal.md)
- [Heap Problems Collection](../strategies/data-structures/heaps.md)
- [Topological Sort Examples](../strategies/patterns/topological-sort.md)
- Online courses: Coursera Algorithms, MIT 6.006

---

## Advanced Pattern Connections

Understanding how Phase 3 patterns connect helps with Phase 4:

### Heaps → Dynamic Programming
- Optimization problems often use heaps
- Priority queue for Dijkstra's algorithm
- Heap for interval scheduling DP

### BFS/DFS → Backtracking
- DFS is foundation of backtracking
- State space exploration
- Pruning techniques

### Graph Traversal → Advanced Graphs
- BFS → Shortest path (unweighted)
- DFS → Strongly connected components
- Topological sort → Longest path in DAG

### Pattern Combinations
- **Heap + Graph:** Dijkstra, A*, Prim's
- **BFS + Matrix:** Grid problems, flood fill
- **DFS + Memoization:** Dynamic programming on trees
- **Topo Sort + DP:** Longest path in DAG

---

## Success Metrics

Beyond just passing, evaluate your understanding:

### Pattern Recognition (Critical)
- ✓ Can identify pattern from problem description
- ✓ Know multiple problems per pattern
- ✓ Understand when pattern doesn't apply

### Implementation Speed (Important)
- ✓ Code optimal solution in 10-15 minutes
- ✓ Minimal debugging needed
- ✓ Handle edge cases proactively

### Complexity Analysis (Essential)
- ✓ Correctly analyze time complexity
- ✓ Correctly analyze space complexity
- ✓ Understand trade-offs

### Communication (Interview Ready)
- ✓ Explain approach clearly
- ✓ Discuss alternatives
- ✓ Justify pattern choice

---

## Interview Preparation Checklist

If you passed Phase 3, you're interview-ready for most positions. Ensure:

**Technical Readiness:**
- [ ] Can solve 80% of medium problems in 25 minutes
- [ ] Can solve 40% of hard problems in 35 minutes
- [ ] Know all Phase 1-3 patterns by heart
- [ ] Can implement common data structures from scratch

**Communication Skills:**
- [ ] Can explain approach before coding
- [ ] Think aloud while coding
- [ ] Discuss trade-offs naturally
- [ ] Ask clarifying questions

**Problem-Solving Process:**
- [ ] Start with examples
- [ ] Identify pattern within 3-5 minutes
- [ ] Discuss brute force first
- [ ] Optimize systematically
- [ ] Test with edge cases

**Company-Specific Prep:**
- [ ] Research company's common patterns
- [ ] Practice on real interview problems
- [ ] Mock interviews with peers
- [ ] Time yourself realistically

---

**Ready to tackle advanced patterns? Good luck!**

Phase 3 represents a significant step up in difficulty. These patterns are powerful tools that will serve you throughout your career, not just in interviews. Focus on deep understanding over memorization.

**Related Resources:**
- [Phase 2 Review](./phase-2-assessment.md)
- [Phase 4 - Expert Patterns](./phase-4-assessment.md)
- [All Pattern Guides](../strategies/patterns/README.md)
- [Graph Traversal Deep Dive](../strategies/patterns/graph-traversal.md)
- [Heap Patterns Guide](../strategies/data-structures/heaps.md)
- [Learning Roadmap](../tracks/roadmap.md)
