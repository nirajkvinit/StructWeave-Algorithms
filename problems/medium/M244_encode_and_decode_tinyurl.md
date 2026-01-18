---
id: M244
old_id: A032
slug: encode-and-decode-tinyurl
title: Encode and Decode TinyURL
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems:
  - id: E001
    title: Two Sum
    difficulty: easy
  - id: M001
    title: Add Two Numbers
    difficulty: medium
prerequisites:
  - Hash maps
  - String encoding
  - Random generation
---
# Encode and Decode TinyURL

## Problem

Design a URL shortening service that converts long web addresses into compact, shareable links. Your system needs two core operations: encoding a full-length URL into a shortened version, and decoding a shortened URL back to its original form.

Implement a class with these methods: a constructor to initialize your system, an encode method that takes a long URL string and returns a shortened version, and a decode method that accepts a shortened URL and returns the original. The encoding mechanism is your choice - you could use sequential IDs, random strings, hashing, or any approach that maintains a reliable bidirectional mapping.

The challenge is designing a strategy that balances several concerns: ensuring each long URL maps to a unique short code, handling collisions if they occur, maintaining reasonable performance for both encode and decode operations, and optionally considering features like preventing duplicate short URLs for the same long URL. For example, if "http://example.com/very/long/path" is encoded to "http://tinyurl.com/abc123", then decoding "http://tinyurl.com/abc123" must reliably return the original URL.

## Why This Matters

URL shortening is more than just a coding exercise - it's a real distributed systems problem used by billions of users daily through services like Bitly and TinyURL. This problem introduces key concepts in system design: choosing encoding schemes (counter-based vs. random vs. hash-based), handling collisions in distributed environments, understanding space-time tradeoffs in storage, and designing bidirectional mappings with hash tables. The pattern of generating unique identifiers and maintaining consistent state appears throughout backend development, from session management and API token generation to database indexing and caching strategies. It's frequently asked in interviews because it tests both algorithmic thinking and practical system design considerations.

## Examples

**Example 1:**
- Input: `url = "http://example.com/page"`
- Output: `"http://example.com/page"`
- Explanation: Solution obj = new Solution();
string tiny = obj.encode(url); // returns the encoded tiny url.
string ans = obj.decode(tiny); // returns the original url after decoding it.

## Constraints

- 1 <= url.length <= 10⁴
- url is guranteed to be a valid URL.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Simple counter-based encoding</summary>

The simplest approach is to use an incrementing counter:
- Store long URLs in a dictionary: `{0: "http://...", 1: "http://...", ...}`
- Encode: assign next counter value, return "http://tinyurl.com/0", "http://tinyurl.com/1", etc.
- Decode: extract the number, lookup in dictionary

This guarantees uniqueness and is deterministic, but produces sequential codes (easy to guess).

</details>

<details>
<summary>Hint 2: Random alphanumeric codes</summary>

Generate random short codes using alphanumeric characters:
- Character set: a-z, A-Z, 0-9 (62 characters)
- Code length: 6 characters gives 62^6 = ~56 billion combinations
- Check for collisions (rare but possible)
- Store bidirectional mapping: `long_to_short` and `short_to_long` dictionaries

This produces non-sequential URLs that are harder to guess.

</details>

<details>
<summary>Hint 3: Hash-based encoding</summary>

Use a hash function to generate codes:
- Compute hash of the long URL (e.g., using MD5 or custom hash)
- Take first 6 characters of hash as the short code
- Handle collisions with counter suffix: "abc123", "abc124", etc.

Trade-off: Same URL always produces same short code (idempotent), but requires collision handling.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Counter-based | O(1) encode/decode | O(n) | n = number of URLs stored; simple and fast |
| Random generation | O(1) average, O(k) worst | O(n) | k = collision retries; very rare collisions |
| Hash-based | O(m) encode, O(1) decode | O(n) | m = URL length for hashing; deterministic |
| Base62 conversion | O(log counter) | O(n) | Convert counter to base-62 string |

## Common Mistakes

1. Not handling the same URL encoded multiple times

```python
# Wrong: Creating new short URL each time
def encode(self, longUrl):
    code = generate_random_code()
    self.code_to_url[code] = longUrl
    return "http://tinyurl.com/" + code
    # Same URL gets different codes each time!

# Correct: Check if URL already encoded
def encode(self, longUrl):
    if longUrl in self.url_to_code:
        return "http://tinyurl.com/" + self.url_to_code[longUrl]
    code = generate_random_code()
    self.code_to_url[code] = longUrl
    self.url_to_code[longUrl] = code
    return "http://tinyurl.com/" + code
```

2. Not validating decode input

```python
# Wrong: Assuming input is always valid
def decode(self, shortUrl):
    code = shortUrl.split('/')[-1]
    return self.code_to_url[code]  # KeyError if invalid!

# Correct: Handle missing codes gracefully
def decode(self, shortUrl):
    code = shortUrl.split('/')[-1]
    return self.code_to_url.get(code, None)  # Return None for invalid
```

3. Infinite loop in collision handling

```python
# Wrong: May loop forever if all codes taken
def encode(self, longUrl):
    while True:
        code = generate_random_code()
        if code not in self.code_to_url:
            break
    # What if all possible codes are used?

# Correct: Add retry limit or use counter fallback
def encode(self, longUrl):
    for _ in range(10):  # Max 10 retries
        code = generate_random_code()
        if code not in self.code_to_url:
            break
    else:
        code = str(self.counter)  # Fallback to counter
        self.counter += 1
```

## Variations

| Variation | Difference | Strategy |
|-----------|-----------|----------|
| Custom short domain | Allow user to specify custom domain | Store domain with each mapping |
| Expiration time | Short URLs expire after time period | Track timestamp, clean up expired entries |
| Analytics tracking | Count clicks on each short URL | Increment counter in decode method |
| Collision-free | Guarantee no collisions | Use counter or UUID; no random generation |
| Case-insensitive | Treat "ABC" same as "abc" | Normalize to lowercase before lookup |

## Practice Checklist

- [ ] Implement counter-based solution (15 min)
- [ ] Implement random code generator (20 min)
- [ ] Add collision handling (10 min)
- [ ] Review after 1 day - implement hash-based version
- [ ] Review after 1 week - add analytics feature
- [ ] Review after 1 month - implement with expiration

**Strategy**: Hash map with random or counter-based encoding for bidirectional URL mapping
