# Development Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm 8+
- Python 3.7+ and pip
- Git

### Quick Start
```bash
# Clone and setup
git clone https://github.com/billmengg/XinemaEditor.git
cd XinemaEditor
npm run install:all

# Start development servers
npm run dev
```

## 🏗️ Project Architecture

### Monorepo Structure
```
XinemaEditor/
├── Xinema/
│   ├── backend/          # Express.js API server
│   └── frontend/         # React web application
├── docs/                # Documentation
├── .github/             # GitHub workflows
└── package.json         # Root workspace configuration
```

### Technology Stack
- **Backend:** Node.js, Express.js, CORS
- **Frontend:** React 18, Create React App
- **AI/ML:** Python, sentence-transformers
- **Testing:** Jest, React Testing Library
- **Code Quality:** ESLint, Prettier
- **CI/CD:** GitHub Actions

## 🛠️ Development Workflow

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm run test
```

### Development Commands
```bash
# Start both backend and frontend
npm run dev

# Start only backend
cd Xinema/backend && npm run dev

# Start only frontend
cd Xinema/frontend && npm start
```

## 🧪 Testing

### Backend Testing
```bash
cd Xinema/backend
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Frontend Testing
```bash
cd Xinema/frontend
npm test                 # Run tests
npm run test:coverage    # Coverage report
```

### Test Coverage
- Minimum coverage: 70%
- Coverage reports: `coverage/` directory
- CI/CD enforces coverage thresholds

## 📝 Code Standards

### JavaScript/React
- ESLint configuration in `.eslintrc.js`
- Prettier formatting in `.prettierrc`
- React functional components preferred
- PropTypes for component validation

### Python
- PEP 8 style guide
- Type hints where appropriate
- Docstrings for functions

### Git Workflow
- Feature branches from `develop`
- Conventional commit messages
- Pull request reviews required
- CI/CD must pass before merge

## 🔧 Configuration Files

### ESLint
- React and React Hooks rules
- Unused variables warnings
- Console warnings in production

### Prettier
- Single quotes
- 2-space indentation
- 80 character line width
- Trailing commas

### Jest
- jsdom environment for React
- Coverage collection
- Setup files for testing utilities

## 🚀 Deployment

### Development
- Local development with hot reload
- Environment variables in `.env` files
- Database: Local file storage

### Production (Future)
- Docker containerization
- Cloud deployment (AWS/Azure)
- Database: PostgreSQL/MongoDB
- CDN for static assets

## 📊 Monitoring

### Performance
- Bundle size analysis
- Performance metrics
- Memory usage monitoring

### Quality
- Code coverage tracking
- Linting error reports
- Security vulnerability scanning

## 🐛 Debugging

### Backend Debugging
```bash
# Enable debug logging
DEBUG=xinema:* npm run dev

# Node.js inspector
node --inspect server.js
```

### Frontend Debugging
- React Developer Tools
- Browser DevTools
- Redux DevTools (if using Redux)

## 📚 Additional Resources

- [React Documentation](https://reactjs.org/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [ESLint Rules](https://eslint.org/docs/rules/)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

## 📞 Support

- GitHub Issues for bug reports
- GitHub Discussions for questions
- Email: [your-email@example.com]
