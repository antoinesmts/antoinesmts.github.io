# Portfolio Build System

Automated project publishing system for Antoine's portfolio. Transforms markdown files into a fully optimized portfolio website with SEO features, dynamic filtering, and social media optimization.

## Features

### 🚀 **Automation**
- **One-command build**: Generate everything from markdown files
- **Dynamic tag management**: Auto-detect and manage project categories/tags
- **Index generation**: Automatic `index.json` creation from frontmatter
- **HTML generation**: Individual project pages with SEO optimization

### 📱 **SEO & Social Media**
- **Structured data** (JSON-LD): Schema.org markup for better search results
- **XML Sitemap**: Automatic sitemap generation with images
- **Open Graph**: Optimized social media sharing
- **Twitter Cards**: Rich Twitter previews
- **Meta tags**: Complete SEO meta tag optimization

### 🎨 **Dynamic Features**
- **Smart filtering**: Auto-generate filter buttons from project tags
- **CSS generation**: Automatic tag styling with consistent colors
- **Responsive images**: Lazy loading and optimization
- **Performance**: Optimized HTML output with minimal overhead

### 📊 **Analytics & Reporting**
- **SEO reports**: Comprehensive SEO analysis and recommendations
- **Build statistics**: Detailed build metrics and performance data
- **Content analysis**: Missing descriptions, images, and optimization opportunities

## Quick Start

### 1. Install Dependencies
```bash
cd build-system
npm install
```

### 2. Migration (One-time)
```bash
npm run migrate  # Migrates existing flat MD files to folder structure
```

### 3. Create a New Project
```bash
mkdir projets/my-new-project
cp build-system/templates/project-template.md projets/my-new-project/index.md
# Edit the frontmatter and content
```

### 4. Build Everything
```bash
npm run build
```

## Project Structure

### Input Structure
```
projets/
├── project-slug/
│   ├── index.md              # Enhanced frontmatter + content
│   ├── images/               # Project-specific images
│   │   ├── hero.png
│   │   └── screenshot1.png
│   └── index.html            # Generated (auto-created)
└── index.json                # Generated (auto-created)
```

### Enhanced Frontmatter Example
```yaml
---
# Basic Information
title: "My Amazing Project"
description: "A comprehensive description for SEO (150-160 chars optimal)"
hero_image: "images/hero.png"

# Metadata
date: "2025-01-15"
status: "published"          # draft, published, archived
featured: true
categories: ["Automatisation", "Python"]
tags: ["Machine Learning", "API"]
tech_stack: ["Python", "FastAPI", "Docker"]

# SEO Enhancement (optional - auto-generated if not provided)
seo_title: "Custom SEO Title"
canonical_url: "https://votre-domaine.fr/projets/project-slug"
keywords: ["automation", "python", "ai"]

# Social Media (optional - auto-generated if not provided)
og_title: "Social Media Title"
og_description: "Social media description"
twitter_card: "summary_large_image"

# Project Details
duration: "2 semaines"
client: "Personal"
github_url: "https://github.com/user/repo"
demo_url: "https://demo.example.com"
---

# Content goes here...
```

## Available Commands

```bash
# Build everything
npm run build

# Development mode (watch for changes)
npm run dev

# Migration from old structure
npm run migrate

# Validate all projects
npm run validate

# Clean generated files
npm run clean
```

## Build Process Overview

1. **Discovery**: Scan all project folders for `index.md` files
2. **Parsing**: Extract and validate frontmatter, process markdown content
3. **Index Generation**: Create `index.json` from all project metadata
4. **HTML Generation**: Generate individual project pages using templates
5. **Tag Management**: Extract unique tags, update main site filters, generate CSS
6. **SEO Optimization**: Generate sitemap, robots.txt, structured data
7. **Validation**: Verify output quality and SEO compliance

## Generated Files

### Automatic Outputs
- `projets/index.json` - Project index for JavaScript loading
- `projets/*/index.html` - Individual project pages
- `sitemap.xml` - XML sitemap with all pages and images
- `robots.txt` - Search engine instructions
- `structured-data.json` - Schema.org structured data
- `seo-report.json` - Comprehensive SEO analysis

### Updated Files
- `index.html` - Filter buttons updated with new categories
- `css/style.css` - New tag styles added automatically

## Advanced Features

### Template Customization
Templates use Handlebars with custom helpers:
```handlebars
{{formatDate date}}           <!-- Format dates -->
{{readingTime minutes}}       <!-- Format reading time -->
{{#if featured}}Featured{{/if}} <!-- Conditional content -->
```

### SEO Optimization
- **Structured Data**: Person, WebSite, ItemList, CreativeWork schemas
- **Meta Tags**: Complete OpenGraph and Twitter Card support
- **Sitemap**: XML sitemap with image references
- **Performance**: Lazy loading, optimized HTML structure

### Dynamic Tag Management
- **Auto-detection**: Finds all unique categories, tags, and tech stack
- **Smart Filtering**: Generates filter buttons based on usage frequency
- **CSS Generation**: Creates consistent color schemes for tags
- **Statistics**: Tracks tag usage across all projects

## Migration Guide

### From Flat Structure
If you have existing projects as flat `.md` files:

```bash
# Before migration:
projets/
├── project1.md
├── project2.md
└── index.json

# Run migration:
npm run migrate

# After migration:
projets/
├── project1/index.md
├── project2/index.md
└── index.json (updated automatically)
```

### Enhancing Frontmatter
The migration script automatically:
- Converts existing frontmatter to new schema
- Adds SEO fields with defaults
- Preserves all existing content
- Creates backup of original files

## Configuration

### Environment Variables
```bash
NODE_ENV=production    # Skip draft projects in production builds
BASE_URL=https://votre-domaine.fr   # Public site URL used for canonical links and sitemap
CNAME_DOMAIN=votre-domaine.fr       # Optional: custom domain written to _site/CNAME in CI
```

### Build Configuration
The build system reads `BASE_URL` automatically. If it is not defined in CI, it falls back to the GitHub Pages URL of the repository.

```bash
BASE_URL=https://smeets.dev npm run build
```

## Troubleshooting

### Common Issues

**Missing dependencies**: Run `npm install` in the build-system directory

**Template errors**: Check that all required frontmatter fields are present

**SEO warnings**: Run `npm run validate` to check for missing meta descriptions, images, etc.

**Build failures**: Check the build output for specific error messages

### Validation
```bash
npm run validate  # Check all projects for required fields and formatting
```

### Debug Mode
```bash
DEBUG=1 npm run build  # Enable verbose logging
```

## Performance

### Build Time
- ~5-10 projects: < 5 seconds
- ~20-50 projects: 10-30 seconds
- Includes full SEO optimization and HTML generation

### Output Optimization
- Minified HTML output
- Optimized meta tags
- Lazy loading for images
- Structured data compression

## Contributing

### Adding New Features
1. Create new modules in `lib/`
2. Update main `build.js` to integrate
3. Add tests and documentation
4. Update this README

### Template Updates
- Templates are in `templates/`
- Use Handlebars syntax
- Test with multiple project types
- Maintain backward compatibility

---

## Next Steps After Setup

1. **Migrate existing projects**: `npm run migrate`
2. **Customize templates**: Edit `templates/project.hbs`
3. **Set up automation**: Add to GitHub Actions or CI/CD
4. **Monitor SEO**: Review generated `seo-report.json`
5. **Optimize performance**: Use generated recommendations

**🎉 You now have a fully automated portfolio publishing system!**

Just create new project folders with `index.md` files and run `npm run build` - everything else is handled automatically.