---
id: M355
old_id: A188
slug: accounts-merge
title: Accounts Merge
difficulty: medium
category: medium
topics: ["union-find", "graph", "dfs", "hash-table"]
patterns: ["union-find", "graph-traversal"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M547", "M684", "M721"]
prerequisites: ["union-find", "graph-theory", "dfs"]
---
# Accounts Merge

## Problem

You're given a list of accounts where each account contains a person's name followed by one or more email addresses. Your task is to merge accounts that belong to the same person. The key rule: if two accounts share even a single email address, they belong to the same person and must be merged.

Each entry in `accounts[i]` is structured as `[name, email1, email2, ...]`, where `accounts[i][0]` is the name and the remaining strings are email addresses. Important subtlety: people can have identical names without being the same person. Identity is determined solely by shared email addresses, not by matching names. For example, two different people named "John" would have separate merged accounts unless they share an email.

The merging process is transitive: if Account A shares an email with Account B, and Account B shares a different email with Account C, then all three accounts belong to the same person and should be merged into one account containing all unique emails from A, B, and C. This transitivity is crucial—you can't just look at pairwise overlaps; you need to find connected components.

Return the merged accounts where each account is formatted as `[name, email1, email2, ...]` with emails sorted in ascending order. The order of accounts in the output doesn't matter, but within each account, the emails must be alphabetically sorted.

This is fundamentally a graph connectivity problem: think of each email as a node, and each account creates edges between its emails. Alternatively, you can model it as a Union-Find (disjoint set) problem where you union emails that appear together and then group them by their root representative.

## Why This Matters

This problem appears in real-world systems that deduplicate user data, such as CRM platforms merging customer records, social networks consolidating duplicate profiles, or email providers identifying linked accounts. The Union-Find pattern you learn here is essential for network connectivity problems, detecting cycles in graphs, implementing Kruskal's algorithm for minimum spanning trees, and even in image processing (connected component labeling). Understanding how to model "group items that share properties" as a graph problem is a fundamental skill for data engineering and distributed systems.

## Examples

**Example 1:**
- Input: `accounts = [["John","johnsmith@mail.com","john_newyork@mail.com"],["John","johnsmith@mail.com","john00@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]`
- Output: `[["John","john00@mail.com","john_newyork@mail.com","johnsmith@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]`
- Explanation: The initial two John accounts belong to one person due to the shared email "johnsmith@mail.com".
Mary and the third John are distinct individuals with no overlapping emails.
Any ordering of these merged accounts is valid, for instance: [['Mary', 'mary@mail.com'], ['John', 'johnnybravo@mail.com'],
['John', 'john00@mail.com', 'john_newyork@mail.com', 'johnsmith@mail.com']].

**Example 2:**
- Input: `accounts = [["Gabe","Gabe0@m.co","Gabe3@m.co","Gabe1@m.co"],["Kevin","Kevin3@m.co","Kevin5@m.co","Kevin0@m.co"],["Ethan","Ethan5@m.co","Ethan4@m.co","Ethan0@m.co"],["Hanzo","Hanzo3@m.co","Hanzo1@m.co","Hanzo0@m.co"],["Fern","Fern5@m.co","Fern1@m.co","Fern0@m.co"]]`
- Output: `[["Ethan","Ethan0@m.co","Ethan4@m.co","Ethan5@m.co"],["Gabe","Gabe0@m.co","Gabe1@m.co","Gabe3@m.co"],["Hanzo","Hanzo0@m.co","Hanzo1@m.co","Hanzo3@m.co"],["Kevin","Kevin0@m.co","Kevin3@m.co","Kevin5@m.co"],["Fern","Fern0@m.co","Fern1@m.co","Fern5@m.co"]]`

## Constraints

- 1 <= accounts.length <= 1000
- 2 <= accounts[i].length <= 10
- 1 <= accounts[i][j].length <= 30
- accounts[i][0] consists of English letters.
- accounts[i][j] (for j > 0) is a valid email.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Recognizing the Graph/Union-Find Pattern</summary>

This is fundamentally a **connected components** problem. Think of it as a graph where:
- Each email is a node
- Two emails are connected if they appear in the same account
- We need to find all connected components (groups of emails belonging to the same person)

Two main approaches:
1. **Union-Find (Disjoint Set Union)**: Merge emails that appear together in an account
2. **DFS/BFS on Graph**: Build a graph and find connected components

Both work, but Union-Find is often more elegant for this type of merging problem.
</details>

<details>
<summary>Hint 2: Union-Find Approach</summary>

Algorithm using Union-Find:
1. Create a Union-Find data structure for emails
2. For each account, union all emails in that account (connect them)
   - For account ["John", "a@m.com", "b@m.com", "c@m.com"], union a with b, b with c
3. After processing all accounts, group emails by their root parent
4. For each group, find the associated name (use the first account that contained any email in the group)
5. Sort emails within each group and format the output

Key data structures:
- `email_to_name`: Map email -> account name
- `parent`: Union-Find parent array/dict
- `find()` and `union()` functions with path compression and union by rank

Time: O(N * α(N)) where α is inverse Ackermann (nearly constant)
Space: O(N) where N is total number of emails
</details>

<details>
<summary>Hint 3: DFS/Graph Approach</summary>

Algorithm using Graph traversal:
1. Build an undirected graph where emails are nodes
   - For each account, connect all emails: email1 <-> email2, email2 <-> email3, etc.
2. Create a map: email -> account name
3. Perform DFS/BFS to find all connected components:
   - For each unvisited email, start a DFS to collect all reachable emails
   - These form one merged account
4. For each component, get the name and sort the emails
5. Format and return the result

Implementation tip: Use an adjacency list (dict of email -> set of connected emails) for the graph.

Time: O(N log N) dominated by sorting
Space: O(N) for graph and visited set

Both approaches are valid; Union-Find is slightly more efficient and elegant for this problem.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (check all pairs) | O(n² * m) | O(n * m) | n accounts, m emails per account |
| Union-Find | O(n * m * α(n*m)) | O(n * m) | α is inverse Ackermann, nearly O(1) |
| DFS/BFS Graph | O(n * m + E log E) | O(n * m) | E = total emails, sorting dominates |
| Optimal | O(n * m * α(n*m)) | O(n * m) | Union-Find with path compression |

## Common Mistakes

**Mistake 1: Not handling the name correctly**
```python
# Wrong - assumes all accounts with same name belong to same person
def accountsMerge(accounts):
    from collections import defaultdict
    name_to_emails = defaultdict(set)

    for account in accounts:
        name = account[0]
        emails = account[1:]
        # Wrong: merges all accounts with same name
        name_to_emails[name].update(emails)

    result = []
    for name, emails in name_to_emails.items():
        result.append([name] + sorted(emails))
    return result
    # Fails: ["John", "a@m.com"] and ["John", "b@m.com"] are different people
```

**Mistake 2: Not connecting all emails in an account**
```python
# Wrong - only connects consecutive pairs
class UnionFind:
    # ... (assume correct UF implementation)

def accountsMerge(accounts):
    uf = UnionFind()
    email_to_name = {}

    for account in accounts:
        name = account[0]
        emails = account[1:]
        for i in range(len(emails) - 1):
            # Only unions consecutive pairs - misses transitive connections
            uf.union(emails[i], emails[i + 1])
            email_to_name[emails[i]] = name
        if emails:
            email_to_name[emails[-1]] = name
    # This works but is less clear than connecting all to first email
```

**Mistake 3: Not sorting emails in output**
```python
# Wrong - doesn't sort emails within each account
def accountsMerge(accounts):
    # ... (assume correct Union-Find logic)

    groups = defaultdict(list)
    for email in email_to_name:
        root = uf.find(email)
        groups[root].append(email)  # Not sorted!

    result = []
    for root, emails in groups.items():
        name = email_to_name[root]
        # Missing: emails.sort()
        result.append([name] + emails)  # Wrong: unsorted emails
    return result
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Number of Provinces | Medium | Simpler connected components, no merging needed |
| Redundant Connection | Medium | Find the edge that creates a cycle in Union-Find |
| Smallest String With Swaps | Medium | Union-Find with character positions, sort within components |
| Similar String Groups | Hard | More complex similarity definition |
| Evaluate Division | Medium | Weighted Union-Find or graph with edge weights |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Practiced again (1 day later)
- [ ] Practiced again (3 days later)
- [ ] Practiced again (1 week later)
- [ ] Can solve in under 30 minutes
- [ ] Can explain solution clearly
- [ ] Implemented both Union-Find and DFS approaches
- [ ] Handled multiple accounts with same name correctly
- [ ] Sorted emails within each merged account

**Strategy**: See [Union-Find Pattern](../strategies/patterns/union-find.md)
