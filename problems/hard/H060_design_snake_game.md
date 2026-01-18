---
id: H060
old_id: I152
slug: design-snake-game
title: Design Snake Game
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Design Snake Game

## Problem

Create a classic <a href="https://en.wikipedia.org/wiki/Snake_(video_game)" target="_blank">Snake game implementation for a grid-based screen with dimensions `height x width`. <a href="http://patorjk.com/games/snake/" target="_blank">Play the game online if you are not familiar with the game.

Initially, the snake starts at position `(0, 0)` in the upper-left corner with length `1`.

You receive a list `food` containing coordinates where `food[i] = (ri, ci)` specifies the row and column of each food item. Consuming food increments both the snake's length and the player's score by `1`.

Food items appear sequentially - the next food only appears after the current one is consumed.

Food is guaranteed to spawn in locations not currently occupied by the snake's body.

The game ends when either the snake moves outside the grid boundaries or when the snake's head collides with its own body **after** completing a move (meaning a snake cannot collide with itself).

Build the `SnakeGame` class with these methods:

	- `SnakeGame(int width, int height, int[][] food)` Sets up the game with the specified grid dimensions and food locations.
	- `int move(String direction)` Executes one movement in the given direction and returns the current score. Returns `-1` if the game has ended.

**Diagram:**

Snake Game Grid (width=3, height=2):
```
Initial State:        After move "R":       After move "D":
+---+---+---+         +---+---+---+         +---+---+---+
| S | . | F |         | . | S | F |         | . | . | F |
+---+---+---+         +---+---+---+         +---+---+---+
| . | . | . |         | . | . | . |         | . | S | . |
+---+---+---+         +---+---+---+         +---+---+---+

After eating food:    Game Over (hit wall):
+---+---+---+         +---+---+---+
| . | . | S |         | . | . | . |
+---+---+---+         +---+---+---+
| . | S | S |         | . | . | X |
+---+---+---+         +---+---+---+

S = Snake body part, F = Food, . = Empty, X = Collision
```


## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Constraints

- 1 <= width, height <= 10⁴
- 1 <= food.length <= 50
- food[i].length == 2
- 0 <= ri < height
- 0 <= ci < width
- direction.length == 1
- direction is 'U', 'D', 'L', or 'R'.
- At most 10⁴ calls will be made to move.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use a deque to represent the snake body (head at front, tail at end). For each move: (1) calculate new head position, (2) check collision with walls/body, (3) if food at new position, add to head and grow; otherwise, add to head and remove tail. Use a set for O(1) body collision detection.
</details>

<details>
<summary>🎯 Main Approach</summary>
Maintain snake as a deque of (row, col) positions and a set of positions for fast lookup. On each move: compute new head, check if it's out of bounds or in body set (excluding tail which will move), then either grow (if food) or move (remove tail, add head). Track current food index to know next food location.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The key optimization is using both a deque (for head/tail operations) and a set (for collision checking). When moving without eating, you can temporarily ignore the tail position in collision check since it will move away. When eating food, the tail stays, so the snake grows by 1.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (list only) | O(n) move | O(n) | Check entire snake for collision |
| Deque + Set | O(1) move | O(n) | n = snake length at any time |

## Common Mistakes

1. **Not handling tail correctly during collision check**
   ```python
   # Wrong: Checking collision including tail that will move
   new_head = (new_row, new_col)
   if new_head in self.body_set:
       return -1

   # Correct: Exclude tail when not eating food
   new_head = (new_row, new_col)
   # If not eating, tail will move, so check excluding tail
   if len(self.snake) > 1 and new_head in self.body_set:
       # Check if collision is not just with tail
       if new_head != self.snake[-1]:
           return -1
   ```

2. **Incorrect food consumption logic**
   ```python
   # Wrong: Not advancing food index
   if new_head == tuple(self.food[self.food_idx]):
       self.snake.appendleft(new_head)
       # Missing: self.food_idx += 1

   # Correct: Advance to next food
   if self.food_idx < len(self.food) and \
      new_head == tuple(self.food[self.food_idx]):
       self.snake.appendleft(new_head)
       self.body_set.add(new_head)
       self.food_idx += 1
   else:
       # Remove tail when moving without eating
   ```

3. **Not synchronizing deque and set**
   ```python
   # Wrong: Updating only deque
   self.snake.appendleft(new_head)
   self.snake.pop()

   # Correct: Keep set in sync
   tail = self.snake.pop()
   self.body_set.remove(tail)
   self.snake.appendleft(new_head)
   self.body_set.add(new_head)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Design Tic-Tac-Toe | Medium | Different game, similar design principles |
| Design Hit Counter | Medium | Time-based data structure design |
| LRU Cache | Medium | Similar use of deque + hash map |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Design Data Structures](../../strategies/patterns/data-structure-design.md)
