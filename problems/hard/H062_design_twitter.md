---
id: H062
old_id: I154
slug: design-twitter
title: Design Twitter
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Design Twitter

## Problem

Build a basic social media system similar to Twitter with functionality for posting messages, managing follower relationships, and displaying personalized news feeds containing the `10` most recent posts.

Create the `Twitter` class with these operations:

	- `Twitter()` Constructs a new Twitter system instance.
	- `void postTweet(int userId, int tweetId)` Records a new post with identifier `tweetId` created by user `userId`. Every `tweetId` will be unique across all calls.
	- `List<Integer> getNewsFeed(int userId)` Returns the `10` most recent tweet IDs visible to the specified user. The feed includes posts from the user themselves and anyone they follow. Results must be **sorted from newest to oldest**.
	- `void follow(int followerId, int followeeId)` Establishes a following relationship where user `followerId` begins following user `followeeId`.
	- `void unfollow(int followerId, int followeeId)` Removes the following relationship where user `followerId` stops following user `followeeId`.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Constraints

- 1 <= userId, followerId, followeeId <= 500
- 0 <= tweetId <= 10⁴
- All the tweets have **unique** IDs.
- At most 3 * 10⁴ calls will be made to postTweet, getNewsFeed, follow, and unfollow.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The news feed requires merging k sorted lists (tweets from user and all followees) to get the 10 most recent. Use a min-heap or max-heap to efficiently merge multiple sorted streams. Store tweets with timestamps to maintain chronological order, and use hash sets for O(1) follow/unfollow operations.
</details>

<details>
<summary>🎯 Main Approach</summary>
Maintain a hash map of userId to their tweet list (newest first), and another hash map for followee relationships. For getNewsFeed, collect tweets from the user and all followees, then use a heap to extract the 10 most recent. Use a global timestamp counter that increments with each tweet to establish ordering.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of collecting all tweets and sorting (which could be huge), use a k-way merge with a heap. Initialize the heap with the most recent tweet from each person, then repeatedly extract the maximum and add the next tweet from that person. Stop after extracting 10 tweets. This keeps heap size small (number of followees) rather than processing all tweets.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (collect all & sort) | O(n log n) per feed | O(n) | Where n is total tweets from all followees |
| Optimal (k-way merge with heap) | O(k log m) per feed | O(m + f) | k=10 tweets needed, m=followees, f=follows stored |
| postTweet | O(1) | O(t) | t = total tweets across all users |
| follow/unfollow | O(1) | O(f) | f = total follow relationships |

## Common Mistakes

1. **Not using a timestamp for tweet ordering**
   ```python
   # Wrong: relying on insertion order without explicit timestamp
   tweets[userId].append(tweetId)
   # Can't properly merge from multiple users

   # Correct: store tweets with timestamp
   self.time += 1
   tweets[userId].append((self.time, tweetId))
   ```

2. **Inefficient news feed generation**
   ```python
   # Wrong: collecting ALL tweets then sorting
   all_tweets = []
   for user in [userId] + list(follows[userId]):
       all_tweets.extend(tweets[user])
   all_tweets.sort(reverse=True)
   return [t[1] for t in all_tweets[:10]]

   # Correct: use heap for k-way merge
   heap = []
   for user in [userId] + list(follows[userId]):
       if tweets[user]:
           heappush(heap, (-tweets[user][0][0], tweets[user][0][1], user, 0))
   # Extract top 10 efficiently
   ```

3. **Not handling self-following edge case**
   ```python
   # Wrong: allowing user to follow themselves
   def follow(self, followerId, followeeId):
       self.follows[followerId].add(followeeId)

   # Correct: prevent self-following
   def follow(self, followerId, followeeId):
       if followerId != followeeId:
           self.follows[followerId].add(followeeId)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Merge k Sorted Lists | Hard | Core technique used in news feed |
| Design Instagram | Hard | Adds photo storage, likes, comments |
| LRU Cache | Medium | Similar design pattern with O(1) operations |
| Design Search Autocomplete System | Hard | Merging streams with prefix matching |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [System Design](../../strategies/patterns/system-design.md)
