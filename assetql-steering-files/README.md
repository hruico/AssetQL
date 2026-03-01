# AssetQL Steering Files

This folder contains the steering files for the AssetQL project. These files provide context, conventions, and guidelines for working with Kiro on this project.

## Files Included

- **product.md** - Product vision, target users, key differentiators, and success metrics
- **structure.md** - Project structure, Lambda functions, infrastructure modules, and development workflows
- **tech.md** - Technical stack, AI/ML models, code conventions, and AWS configuration

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
