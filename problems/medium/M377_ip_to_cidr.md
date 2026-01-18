---
id: M377
old_id: A218
slug: ip-to-cidr
title: IP to CIDR
difficulty: medium
category: medium
topics: ["bit-manipulation", "math"]
patterns: ["binary-operations", "greedy"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: E221
    title: Validate IP Address
    difficulty: easy
  - id: M297
    title: Restore IP Addresses
    difficulty: medium
  - id: M253
    title: UTF-8 Validation
    difficulty: medium
prerequisites:
  - Bit Manipulation
  - Binary Number Systems
  - IP Address Understanding
  - Greedy Algorithms
strategy_ref: ../strategies/patterns/bit-manipulation.md
---
# IP to CIDR

## Problem

You need to represent a consecutive range of IP addresses using CIDR (Classless Inter-Domain Routing) notation as compactly as possible. Let's first clarify the concepts:

**IP Addresses**: A 32-bit number displayed in dotted-decimal format with four octets (8-bit segments).
- Example: The binary `11111111 00000000 00000000 00000111` becomes `"255.0.0.7"` in dotted notation
- Each octet ranges from 0 to 255 (8 bits = 256 values)

**CIDR Notation**: A compact way to express IP address ranges using a base IP and a prefix length.
- Format: `"IP/k"` where `k` is the number of fixed leading bits
- Example: `"255.0.0.8/29"` means the first 29 bits are fixed, leaving 32-29=3 bits variable, covering 2³=8 consecutive IPs
- Specifically: `/32` covers 1 IP, `/31` covers 2 IPs, `/30` covers 4 IPs, `/29` covers 8 IPs, and so on

**The Challenge**: Given a starting IP address `ip` and a count `n`, find the minimum number of CIDR blocks that cover exactly the range `[ip, ip+1, ip+2, ..., ip+n-1]`. You cannot include IPs outside this range, and you must cover every IP within it.

The tricky part is **alignment**. A CIDR block like `/29` (covering 8 IPs) can only start at IPs whose binary representation ends with at least 3 zeros. For example, `255.0.0.8` (binary ends with `...1000`) can use `/29`, but `255.0.0.7` (ends with `...0111`) can only use `/32` (single IP). This alignment constraint limits how large each block can be.

Your greedy strategy: at each step, choose the largest CIDR block that (1) starts at the current IP, (2) is properly aligned, and (3) doesn't exceed the remaining count.

## Why This Matters

CIDR is fundamental to internet routing and network engineering. Routers use CIDR blocks to aggregate routes and reduce routing table size, making the internet scalable. This problem teaches bitwise operations and alignment constraints, skills essential for low-level programming, network protocol implementation, and memory management. Understanding how to find the rightmost set bit (using `x & -x`) is a powerful bit manipulation technique applicable to fenwick trees, binary indexed trees, and various optimization algorithms. Companies working on networking infrastructure, cloud platforms (AWS/GCP use CIDR for VPC configuration), or systems programming frequently encounter these concepts in both interviews and real-world implementations.

## Examples

**Example 1:**
- Input: `ip = "255.0.0.7", n = 10`
- Output: `["255.0.0.7/32","255.0.0.8/29","255.0.0.16/32"]`
- Explanation: The IP addresses that need to be covered are:
- 255.0.0.7  -> 11111111 00000000 00000000 00000111
- 255.0.0.8  -> 11111111 00000000 00000000 00001000
- 255.0.0.9  -> 11111111 00000000 00000000 00001001
- 255.0.0.10 -> 11111111 00000000 00000000 00001010
- 255.0.0.11 -> 11111111 00000000 00000000 00001011
- 255.0.0.12 -> 11111111 00000000 00000000 00001100
- 255.0.0.13 -> 11111111 00000000 00000000 00001101
- 255.0.0.14 -> 11111111 00000000 00000000 00001110
- 255.0.0.15 -> 11111111 00000000 00000000 00001111
- 255.0.0.16 -> 11111111 00000000 00000000 00010000
The CIDR block "255.0.0.7/32" covers the first address.
The CIDR block "255.0.0.8/29" covers the middle 8 addresses (binary format of 11111111 00000000 00000000 00001xxx).
The CIDR block "255.0.0.16/32" covers the last address.
Note that while the CIDR block "255.0.0.0/28" does cover all the addresses, it also includes addresses outside of the range, so we cannot use it.

**Example 2:**
- Input: `ip = "117.145.102.62", n = 8`
- Output: `["117.145.102.62/31","117.145.102.64/30","117.145.102.68/31"]`

## Constraints

- 7 <= ip.length <= 15
- ip is a valid **IPv4** on the form "a.b.c.d" where a, b, c, and d are integers in the range [0, 255].
- 1 <= n <= 1000
- Every implied address ip + x (for x < n) will be a valid IPv4 address.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Convert IP to Integer and Understand CIDR</summary>

First, convert the IP address to a 32-bit integer for easier manipulation:
```python
def ip_to_int(ip):
    parts = ip.split('.')
    return (int(parts[0]) << 24) + (int(parts[1]) << 16) + \
           (int(parts[2]) << 8) + int(parts[3])
```

CIDR `/k` means the first `k` bits are fixed. A `/32` covers exactly 1 IP, `/31` covers 2 IPs, `/30` covers 4 IPs, etc. In general, `/k` covers `2^(32-k)` addresses.

The challenge is to greedily select the largest possible CIDR blocks that:
1. Start at the current IP
2. Don't exceed the remaining count `n`
3. Are properly aligned (the starting IP must align to the block size)

</details>

<details>
<summary>Hint 2: Greedy Selection Based on Alignment</summary>

For a given starting IP (as integer), determine the maximum block size you can use:

1. **Alignment constraint**: If the IP's binary representation ends with `k` zeros, you can use at most a block of size `2^k`. This is found using `ip & -ip` (rightmost set bit trick).

2. **Remaining count constraint**: The block size cannot exceed the remaining number of IPs to cover.

3. **Power of 2 constraint**: CIDR blocks must have power-of-2 sizes.

Greedy approach:
```
while n > 0:
    # Find maximum block size that fits
    max_size = largest_power_of_2_that_divides(current_ip)
    max_size = min(max_size, largest_power_of_2_less_than_or_equal(n))
    # Add CIDR block
    # Move to next IP
    current_ip += max_size
    n -= max_size
```

</details>

<details>
<summary>Hint 3: Implementation Details</summary>

Key functions needed:

1. **Find rightmost set bit** (determines alignment):
```python
def lowest_set_bit(x):
    return x & -x  # Gives 2^k where k is position of rightmost 1
```

2. **Largest power of 2 <= n**:
```python
def largest_power_of_2(n):
    # Find highest bit set in n
    n |= n >> 1
    n |= n >> 2
    n |= n >> 4
    n |= n >> 8
    n |= n >> 16
    return (n + 1) >> 1
```

3. **Convert integer back to IP string**:
```python
def int_to_ip(num):
    return f"{(num >> 24) & 255}.{(num >> 16) & 255}.{(num >> 8) & 255}.{num & 255}"
```

4. **Determine prefix length from block size**:
```python
def get_prefix_len(size):
    return 32 - size.bit_length() + 1
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (list all IPs) | O(n) | O(n) | Store every IP individually |
| Greedy CIDR Selection | O(log n) | O(log n) | At most log₂(n) blocks needed |
| Optimal Greedy | O(log n) | O(log n) | Minimizes number of CIDR blocks |

## Common Mistakes

### Mistake 1: Not Checking Alignment
```python
# Wrong: Trying to use large blocks without checking alignment
def ipToCIDR(ip, n):
    start = ip_to_int(ip)
    result = []
    while n > 0:
        # Wrong: Assumes we can always use largest power of 2 <= n
        block_size = largest_power_of_2(n)
        result.append(f"{int_to_ip(start)}/{32 - block_size.bit_length() + 1}")
        start += block_size
        n -= block_size
    # This creates CIDR blocks that don't align properly
```

**Fix:** Check alignment first:
```python
# Correct: Consider both alignment and remaining count
while n > 0:
    # Maximum size based on alignment
    max_aligned = start & -start  # Rightmost set bit
    # Maximum size based on remaining count
    max_count = largest_power_of_2(n)
    # Take minimum of both constraints
    block_size = min(max_aligned, max_count)
    # ... rest of code
```

### Mistake 2: Incorrect Prefix Length Calculation
```python
# Wrong: Confusing block size with prefix length
def ipToCIDR(ip, n):
    # ...
    block_size = 8  # Covers 8 IPs
    prefix = block_size  # Wrong! Should be 32 - log2(8) = 29
    result.append(f"{ip_str}/{prefix}")
```

**Fix:** Convert block size to prefix length:
```python
# Correct: Prefix length = 32 - log2(block_size)
import math
block_size = 8
prefix_len = 32 - int(math.log2(block_size))  # 32 - 3 = 29
result.append(f"{ip_str}/{prefix_len}")
```

### Mistake 3: Edge Case with Alignment = 0
```python
# Wrong: Handling IP that doesn't divide evenly
def ipToCIDR(ip, n):
    start = ip_to_int(ip)
    # If start is odd, start & -start gives 1
    # If start is 0, start & -start gives 0 (need special handling)
    max_aligned = start & -start if start != 0 else (1 << 32)
```

**Fix:** Handle zero case properly:
```python
# Correct: When IP is 0, it's aligned to maximum (2^32)
if start == 0:
    max_aligned = 1 << 32
else:
    max_aligned = start & -start
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| IPv6 to CIDR | Handle 128-bit IPv6 addresses | Hard |
| CIDR to IP Range | Convert CIDR blocks back to IP ranges | Medium |
| Optimize for Fewer Blocks | Minimize number of blocks (already optimal) | N/A |
| CIDR Block Intersection | Find overlap between two CIDR blocks | Medium |
| Subnet Calculation | Determine if IP belongs to subnet | Easy |

## Practice Checklist

- [ ] First attempt (within 30 minutes)
- [ ] Implement IP to integer conversion
- [ ] Understand alignment using bitwise operations
- [ ] Implement greedy CIDR selection
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Can explain rightmost set bit trick
- [ ] Attempted CIDR to IP Range variation

**Strategy**: See [Bit Manipulation Pattern](../strategies/patterns/bit-manipulation.md)
