# AssetQL Steering Files

This folder contains the steering files for the AssetQL project. These files provide context, conventions, and guidelines for working with Kiro on this project.

## Files Included

### Core Documentation
- **product.md** - Product vision, target users, key differentiators, and success metrics
- **structure.md** - Project structure, Lambda functions, infrastructure modules, and development workflows
- **tech.md** - Technical stack, AI/ML models, code conventions, and AWS configuration

### Implementation Guides
- **BACKEND_API_IMPLEMENTATION.md** - Session & style list endpoints implementation
- **DEPLOYMENT_GUIDE.md** - Complete deployment guide from infrastructure to production
- **INFRASTRUCTURE_IMPROVEMENTS_SUMMARY.md** - Recent infrastructure hardening (CORS, UUID, presigned uploads, APAC profiles)
- **PROJECT_AUDIT_REPORT.md** - Comprehensive audit with Lambda Layers architecture

### Deployment Resources
- **AWS_AMPLIFY_DEPLOYMENT.md** - AWS Amplify deployment guide
- **AMPLIFY_DEPLOYMENT_STEPS.md** - Step-by-step Amplify deployment
- **DEPLOYMENT_OPTIONS.md** - Comparison of deployment options
- **PRE_DEPLOYMENT_CHECKLIST.md** - Pre-deployment validation checklist

### Planning & Progress
- **AssetQL_Implementation_Plan.md** - Implementation roadmap
- **PHASE_2_COMPLETION_SUMMARY.md** - Phase 2 completion status
- **DEPENDENCY_AUDIT_REPORT.md** - Dependency audit and optimization
- **GETTING_STARTED.md** - Quick start guide
- **QUICK_START.md** - Rapid setup instructions

## How to Use

### For Team Members

1. **Workspace-level (Project-specific)**
   - Copy these files to your local `.kiro/steering/` directory in the project root
   - These will be automatically included in all Kiro sessions for this project
   ```bash
   cp assetql-steering-files/*.md .kiro/steering/
   ```

2. **User-level (Global)**
   - Copy to `~/.kiro/steering/` if you want these rules to apply across all your projects
   ```bash
   cp assetql-steering-files/*.md ~/.kiro/steering/
   ```

### Version Control

These steering files should be committed to your repository so the entire team benefits:

```bash
git add .kiro/steering/*.md
git commit -m "Add AssetQL steering files"
git push
```

## What Are Steering Files?

Steering files are markdown documents that provide additional context and instructions to Kiro. They help ensure:

- Consistent code patterns across the team
- Adherence to project conventions
- Understanding of the technical stack
- Awareness of project structure and workflows

## Inclusion Modes

Steering files can be configured with different inclusion modes using front-matter:

- **Always included** (default) - No front-matter needed
- **Conditional** - Include when specific files are read
  ```markdown
  ---
  inclusion: fileMatch
  fileMatchPattern: 'README*'
  ---
  ```
- **Manual** - Only when referenced with `#` in chat
  ```markdown
  ---
  inclusion: manual
  ---
  ```

## Questions?

If you have questions about these steering files or need help setting them up, reach out to the team or consult the Kiro documentation.
