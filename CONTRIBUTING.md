# Contributing to FlowDesk

Thank you for your interest in contributing! Here's how you can help.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/saas-dashboard
   cd saas-dashboard
   ```

3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Set up development environment**:
   ```bash
   python -m venv saas_env
   .\saas_env\Scripts\activate  # On Windows
   # source saas_env/bin/activate  # On macOS/Linux
   pip install -r requirements.txt
   cp .env.example .env
   ```

5. **Make your changes** and test thoroughly

6. **Commit your changes**:
   ```bash
   git commit -m "Add: brief description of changes"
   ```

7. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Open a Pull Request** on GitHub with:
   - Clear title describing the feature/fix
   - Description of changes made
   - Any related issue numbers

## Code Style

- Follow PEP 8 for Python code
- Use meaningful variable and function names
- Add docstrings to functions
- Keep functions focused and small

## Testing

Before submitting a PR:
- Test your changes locally
- Verify the app runs without errors
- Check all related endpoints work correctly
- Test with different user roles if relevant

## Areas for Contribution

### Bugs & Fixes
- Report bugs in GitHub Issues
- Include steps to reproduce
- Provide error messages/logs

### Features
- Suggest new features in Discussions or Issues
- Discuss scope before implementing
- Keep PRs focused on a single feature

### Documentation
- Improve README
- Add code examples
- Fix typos or unclear sections

### Testing
- Add unit tests
- Improve test coverage
- Add integration tests

## Pull Request Process

1. Update README if adding new features
2. Update `.env.example` if adding new environment variables
3. Ensure code follows project style
4. Link any related issues in PR description
5. Respond to review feedback promptly

## Code Review

All PRs require at least one approval before merging. Be prepared to:
- Explain your implementation choices
- Address feedback constructively
- Make requested changes

## Questions?

- Open a GitHub Discussion
- Email the maintainers
- Check existing Issues/PRs

---

Happy coding! 🚀
