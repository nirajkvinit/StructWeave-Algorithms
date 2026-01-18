# Contributing to StructWeave

Thank you for your interest in contributing to StructWeave! This is an open-source educational algorithm question bank designed to help developers prepare for technical interviews through carefully curated, platform-agnostic problem sets.

We welcome contributions from developers of all skill levels. Whether you're fixing a typo, improving explanations, or adding new pattern guides, your contributions help make algorithm learning more accessible to everyone.

## Ways to Contribute

### Improve Problem Explanations

- Clarify problem descriptions for better understanding
- Add more detailed examples with edge cases
- Enhance "Why This Matters" sections with real-world context
- Improve "Think About" prompts to guide learning

### Add Alternative Solution Approaches

- Document different algorithmic approaches in pattern guides
- Add complexity analysis for various solutions
- Include trade-offs between different strategies

### Fix Typos and Broken Links

- Correct spelling and grammar errors
- Fix broken internal references
- Ensure strategy links point to correct files

### Enhance Pattern Guides

- Improve existing pattern explanations
- Add visual diagrams using Mermaid
- Include step-by-step walkthroughs
- Add complexity analysis templates

### Add Practice Drills

- Create focused practice sets for specific patterns
- Design progressive difficulty tracks
- Suggest problem sequences for mastery

### Report Issues

- Identify unclear problem statements
- Report incorrect constraints or examples
- Suggest improvements to repository structure

## Content Guidelines

All contributions must follow these strict guidelines to maintain DMCA compliance and educational quality:

### Critical Rules

1. **All content must be original or paraphrased** - Never copy problem descriptions verbatim from any source
2. **NO platform references** - Do not mention LeetCode, HackerRank, GeeksforGeeks, Codeforces, or any other platform
3. **NO platform URLs** - Use generic domains like `programming.com` or `algoprac` if examples are needed
4. **NO solution code in problem files** - Problems contain descriptions only; solutions belong in pattern guides
5. **Use Mermaid diagrams** - No external images; all visual content must use Mermaid syntax
6. **Work in `` directory only** - Never reference or read from the `archive/` directory

### Content Standards

- **Educational Focus**: Content should teach concepts, not just present problems
- **Platform-Agnostic**: Problems should be universally applicable
- **Clear Language**: Use simple, precise English
- **Consistent Formatting**: Follow existing templates exactly

## Problem File Format

Problems must follow this structure:

### Frontmatter

```yaml
---
id: E001                    # Format: {E|M|H}{NNN} (zero-padded)
slug: two-sum              # Lowercase with hyphens
title: Two Sum             # Display title
difficulty: easy           # easy, medium, or hard
category: easy             # Same as difficulty
topics: ["array", "hash-table"]  # From topics_taxonomy.json
patterns: ["complement-search"]  # Algorithm patterns used
estimated_time_minutes: 15       # Typical solving time
strategy_ref: ../strategies/patterns/two-pointers.md  # Optional
---
```

### File Structure

```markdown
# {Title}

## Problem
[Paraphrased problem description. Clearly state inputs, outputs, and requirements.]

## Why This Matters
[Educational context explaining real-world applications and relevance.]

## Examples

**Example 1:**
- Input: `nums = [2, 7, 11, 15], target = 9`
- Output: `[0, 1]`
- Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

**Example 2:**
[Additional examples including edge cases]

## Constraints
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- Only one valid answer exists

## Think About
1. What makes this problem challenging?
2. Can you identify subproblems?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Pattern Name](../strategies/patterns/xxx.md)
```

### File Naming Convention

- Foundation: `F001_multiples_of_3_or_5.md` (F001-F020)
- Easy: `E001_two_sum.md` (E001-E270)
- Medium: `M001_add_two_numbers.md` (M001-M575)
- Hard: `H001_median_of_two_sorted_arrays.md` (H001-H117)

Format: `{PREFIX}{NNN}_{slug}.md`

## Pattern Guide Format

Pattern guides in `strategies/` should include:

### Required Sections

1. **Overview**: Brief description of the pattern
2. **When to Use**: Indicators that this pattern applies
3. **Core Concept**: Fundamental idea with visual diagrams
4. **Implementation Steps**: Step-by-step approach
5. **Complexity Analysis**: Time and space complexity
6. **Common Variations**: Different forms of the pattern
7. **Practice Problems**: References to problems using this pattern
8. **Pitfalls to Avoid**: Common mistakes

### Example Structure

```markdown
# Two Pointers Pattern

## Overview
The two pointers pattern uses two references to traverse a data structure...

## When to Use
- Sorted arrays or linked lists
- Finding pairs with specific properties
- Partitioning data

## Core Concept
[Mermaid diagram showing pointer movement]

## Implementation Steps
1. Initialize pointers at strategic positions
2. Move pointers based on comparison logic
3. Continue until pointers meet or cross

## Complexity Analysis
- Time: O(n)
- Space: O(1)

## Practice Problems
- [Two Sum II](../../problems/easy/E167_two_sum_ii.md)
- [Container With Most Water](../../problems/medium/M011_container_with_most_water.md)
```

## Pull Request Process

### 1. Fork the Repository

Create your own fork of the `algo_consolidated` repository.

### 2. Create a Feature Branch

```bash
git checkout -b feature/improve-two-pointers-guide
# or
git checkout -b fix/typo-in-binary-search
```

Use descriptive branch names: `feature/`, `fix/`, `docs/`, `enhance/`

### 3. Make Your Changes

- Follow all content guidelines above
- Maintain consistent formatting with existing files
- Ensure frontmatter fields are complete and accurate
- Use proper markdown syntax

### 4. Test Locally

Before submitting:

- Check that all internal links work
- Verify markdown renders correctly
- Ensure no platform references exist
- Validate frontmatter YAML syntax
- Review for spelling and grammar

```bash
# Validate no platform references (should return 0)
grep -ri "leetcode\|hackerrank\|geeksforgeeks" problems/

# Check for broken strategy links
# Manually verify links in your changed files
```

### 5. Commit Your Changes

```bash
git add problems/easy/E001_two_sum.md
git commit -m "docs: Improve examples and edge cases in Two Sum problem"
```

Use conventional commit messages:

- `docs:` for documentation changes
- `fix:` for corrections
- `enhance:` for improvements
- `feat:` for new content

### 6. Submit Pull Request

- Push your branch to your fork
- Create a pull request to the main repository
- Provide a clear description of your changes
- Explain why the changes improve the repository
- Reference any related issues

### PR Description Template

```markdown
## What Changed
Brief summary of modifications

## Why This Matters
Explanation of the value added

## Testing Done
- [ ] Verified all links work
- [ ] Checked for platform references
- [ ] Reviewed markdown formatting
- [ ] Validated frontmatter syntax

## Related Issues
Fixes #123
```

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors.

### Our Standards

- Be respectful and constructive in feedback
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other contributors
- Accept constructive criticism gracefully

### Unacceptable Behavior

- Harassment, trolling, or derogatory comments
- Personal attacks or political arguments
- Publishing others' private information
- Any conduct that could reasonably be considered inappropriate

Project maintainers have the right to remove, edit, or reject contributions that do not align with this Code of Conduct.

## Questions and Support

### Where to Ask

- **GitHub Issues**: Bug reports, feature requests, content problems
- **GitHub Discussions**: General questions, ideas, learning help

### Before Asking

- Search existing issues and discussions
- Review CLAUDE.md for repository guidelines
- Check problem_index.json for problem catalog

## Additional Resources

- **CLAUDE.md**: Detailed repository guidelines
- **dmca_protection.md**: DMCA compliance information
- **quality_analysis.md**: Quality standards and migration plan
- **metadata/topics_taxonomy.json**: Available topics and tags

## Recognition

All contributors will be recognized in our repository. Significant contributions may be highlighted in release notes.

Thank you for helping make algorithm learning more accessible!
