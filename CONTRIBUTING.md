# Contributing to BiliTube-Wormhole

Thank you for your interest in contributing to BiliTube-Wormhole! This document provides guidelines and instructions for contributing.

## Ways to Contribute

### 1. Submit User Mappings

Know a creator who has both Bilibili and YouTube channels? You can help by submitting their mapping!

**Via Web Form** (Recommended):
Visit our submission endpoint and fill out the form with:

- Bilibili UID
- YouTube Channel ID
- Optional notes

**Via GitHub Issue**:
Create an issue with the `user-mapping` label and include:

```
Bilibili UID: 123456
YouTube Channel ID: UCxxxxx
Notes: (optional)
```

### 2. Report Issues

Found a bug or incorrect mapping?

1. Check if the issue already exists
2. Create a new issue with:
   - Clear description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots if applicable

### 3. Contribute Code

#### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/BiliTube-Wormhole.git
cd BiliTube-Wormhole

# Install dependencies
bun install

# Start development
bun run dev
```

#### Code Style

- **TypeScript**: Use strict mode, add type annotations
- **Formatting**: Run `bun run format` before committing
- **Linting**: Run `bun run lint` to check for issues
- **Type Checking**: Run `bun run type-check`

#### Commit Messages

Follow conventional commits format:

```
feat: add avatar similarity comparison
fix: correct YouTube channel ID extraction
docs: update README with deployment instructions
chore: update dependencies
```

#### Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `bun test`
4. Run type check: `bun run type-check`
5. Commit your changes
6. Push to your fork: `git push origin feature/your-feature`
7. Create a Pull Request

**PR Guidelines:**

- Provide a clear description of changes
- Reference related issues
- Include screenshots for UI changes
- Ensure all checks pass

### 4. Improve Documentation

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples
- Translate to other languages
- Improve code comments

## Project Structure

```
src/
├── api/              # API clients (Bilibili, YouTube)
├── storage/          # Sharded storage manager
├── utils/            # Utility functions
└── workflows/        # GitHub Actions workflows

entrypoints/
├── background/       # Extension background script
└── content/          # Content scripts (Bilibili, YouTube)

worker/
└── src/              # Cloudflare Worker

.github/workflows/    # GitHub Actions definitions
```

## Testing

### Unit Tests

```bash
bun test
```

### Browser Extension Testing

```bash
# Build extension
bun run build

# Load unpacked extension in browser
# Chrome: chrome://extensions/ → Load unpacked
# Firefox: about:debugging → Load Temporary Add-on
```

### Workflow Testing

```bash
# Test scanner
BILIBILI_SESSDATA=your_sessdata bun run workflow:scan

# Test verifier
BILIBILI_SESSDATA=your_sessdata \
YOUTUBE_API_KEY=your_api_key \
USERS_JSON='[{"uid":"123456"}]' \
bun run workflow:verify
```

## Code Review Process

All submissions require review. We use GitHub pull requests for this purpose:

1. **Automated Checks**: CI runs type checking, linting, and tests
2. **Code Review**: Maintainers review code quality and design
3. **Testing**: Verify changes work as expected
4. **Merge**: Once approved, changes are merged

## Community Guidelines

- Be respectful and constructive
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md)
- Help others learn and grow
- Give credit where it's due

## Questions?

- 💬 [GitHub Discussions](https://github.com/palemoky/BiliTube-Wormhole/discussions)
- 🐛 [GitHub Issues](https://github.com/palemoky/BiliTube-Wormhole/issues)

Thank you for contributing! 🎉
