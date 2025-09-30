# 🤝 Contributing to Xinema

Thank you for your interest in contributing to Xinema! This document provides guidelines and information for contributors.

## 📋 **Table of Contents**

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## 📜 **Code of Conduct**

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) Code of Conduct. By participating, you agree to uphold this code.

## 🚀 **Getting Started**

### Prerequisites
- Node.js 14+ and npm
- Python 3.7+ and pip
- Git

### Fork and Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/XinemaEditor.git
cd XinemaEditor
```

## 🛠️ **Development Setup**

### 1. Install Dependencies
```bash
# Backend dependencies
cd Xinema/backend
npm install

# Frontend dependencies
cd ../frontend
npm install

# Python dependencies
cd ../..
pip install sentence-transformers pandas python-docx
```

### 2. Development Workflow
```bash
# Start backend (Terminal 1)
cd Xinema/backend
npm run dev

# Start frontend (Terminal 2)
cd Xinema/frontend
npm start
```

## 📝 **Contributing Guidelines**

### **Types of Contributions**
- 🐛 **Bug Fixes:** Fix existing issues
- ✨ **New Features:** Add new functionality
- 📚 **Documentation:** Improve docs and examples
- 🎨 **UI/UX:** Enhance user interface
- ⚡ **Performance:** Optimize speed and efficiency
- 🧪 **Testing:** Add or improve tests

### **Code Standards**
- **JavaScript/React:** Follow ESLint configuration
- **Python:** Follow PEP 8 style guide
- **Commits:** Use conventional commit messages
- **Documentation:** Update README.md for significant changes

### **Commit Message Format**
```
type(scope): description

Examples:
feat(api): add new clip matching endpoint
fix(ui): resolve timeline display issue
docs(readme): update installation instructions
```

## 🔄 **Pull Request Process**

### **Before Submitting**
1. ✅ Fork the repository
2. ✅ Create a feature branch (`git checkout -b feature/amazing-feature`)
3. ✅ Make your changes
4. ✅ Test your changes thoroughly
5. ✅ Update documentation if needed
6. ✅ Commit with descriptive messages

### **Pull Request Template**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Manual testing completed
- [ ] Cross-browser compatibility checked

## Screenshots (if applicable)
Add screenshots to help explain your changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## 🐛 **Issue Reporting**

### **Before Creating an Issue**
1. Search existing issues
2. Check if it's already reported
3. Verify it's not a duplicate

### **Issue Template**
```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Windows 10]
- Node.js version: [e.g., 16.14.0]
- Browser: [e.g., Chrome 91]

**Additional Context**
Any other relevant information
```

## 🏗️ **Architecture Overview**

### **Backend (Node.js/Express)**
- **Controllers:** Handle business logic
- **Routes:** Define API endpoints
- **Data:** Store clip and script information
- **Services:** Core matching algorithms

### **Frontend (React)**
- **Components:** Reusable UI elements
- **Services:** API communication
- **Utils:** Helper functions
- **Hooks:** Custom React hooks

### **Python MVP**
- **Core Algorithm:** Sentence embedding matching
- **Utils:** Data processing helpers
- **Data:** Input/output handling

## 🎯 **Development Priorities**

### **High Priority**
- 🐛 Bug fixes and stability improvements
- 📈 Performance optimizations
- 🔒 Security enhancements
- 📱 Mobile responsiveness

### **Medium Priority**
- ✨ New feature development
- 🎨 UI/UX improvements
- 📚 Documentation updates
- 🧪 Test coverage expansion

### **Low Priority**
- 🔧 Developer experience improvements
- 🌐 Internationalization
- 🎨 Theme customization
- 📊 Analytics integration

## 📞 **Getting Help**

- 💬 **Discussions:** Use GitHub Discussions for questions
- 🐛 **Issues:** Report bugs and feature requests
- 📧 **Contact:** Reach out to maintainers directly

## 🙏 **Recognition**

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to Xinema! 🎬✨
