#!/usr/bin/env node

/**
 * Project Validation Script
 *
 * Validates all projects for required fields, formats, and SEO optimization.
 * Provides detailed reports on missing elements and recommendations.
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');
const chalk = require('chalk');
const ora = require('ora');

class ProjectValidator {
  constructor() {
    this.projectsDir = path.join(__dirname, '../../projets');
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
    this.validatedProjects = [];
  }

  async validate() {
    const spinner = ora('Validating projects...').start();

    try {
      spinner.text = 'Discovering project folders...';
      const projectFolders = await this.findProjectFolders();

      if (projectFolders.length === 0) {
        spinner.warn(chalk.yellow('No project folders found'));
        return this.generateReport();
      }

      spinner.text = `Validating ${projectFolders.length} projects...`;

      for (let i = 0; i < projectFolders.length; i++) {
        const folder = projectFolders[i];
        spinner.text = `Validating ${path.basename(folder)} (${i + 1}/${projectFolders.length})...`;

        try {
          await this.validateProject(folder);
        } catch (error) {
          this.errors.push({
            project: path.basename(folder),
            type: 'critical',
            message: `Failed to validate: ${error.message}`
          });
        }
      }

      spinner.succeed(chalk.green(`✅ Validation completed for ${projectFolders.length} projects`));

      this.generateReport();
      return this.printSummary();

    } catch (error) {
      spinner.fail(chalk.red('❌ Validation failed'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  }

  async findProjectFolders() {
    const pattern = path.join(this.projectsDir, '*', 'index.md');
    const indexFiles = glob.sync(pattern);
    return indexFiles.map(file => path.dirname(file));
  }

  async validateProject(projectFolder) {
    const projectName = path.basename(projectFolder);
    const indexFile = path.join(projectFolder, 'index.md');

    if (!await fs.pathExists(indexFile)) {
      this.errors.push({
        project: projectName,
        type: 'missing_file',
        message: 'Missing index.md file'
      });
      return;
    }

    try {
      const content = await fs.readFile(indexFile, 'utf-8');
      const { data: frontmatter, content: markdown } = matter(content);

      // Validate frontmatter
      this.validateFrontmatter(projectName, frontmatter);

      // Validate content
      this.validateContent(projectName, markdown);

      // Validate SEO
      this.validateSEO(projectName, frontmatter);

      // Validate images
      await this.validateImages(projectName, projectFolder, frontmatter);

      this.validatedProjects.push({
        name: projectName,
        frontmatter,
        wordCount: this.countWords(markdown),
        status: frontmatter.status || 'unknown'
      });

    } catch (error) {
      this.errors.push({
        project: projectName,
        type: 'parse_error',
        message: `Failed to parse markdown: ${error.message}`
      });
    }
  }

  validateFrontmatter(projectName, frontmatter) {
    const required = ['title', 'description', 'date'];
    const recommended = ['categories', 'hero_image', 'slug'];

    // Check required fields
    for (const field of required) {
      if (!frontmatter[field]) {
        this.errors.push({
          project: projectName,
          type: 'missing_required',
          field: field,
          message: `Missing required field: ${field}`
        });
      }
    }

    // Check recommended fields
    for (const field of recommended) {
      if (!frontmatter[field]) {
        this.warnings.push({
          project: projectName,
          type: 'missing_recommended',
          field: field,
          message: `Missing recommended field: ${field}`
        });
      }
    }

    // Validate field formats
    if (frontmatter.date && !this.isValidDate(frontmatter.date)) {
      this.errors.push({
        project: projectName,
        type: 'invalid_format',
        field: 'date',
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    if (frontmatter.status && !['draft', 'published', 'archived'].includes(frontmatter.status)) {
      this.errors.push({
        project: projectName,
        type: 'invalid_value',
        field: 'status',
        message: 'Status must be: draft, published, or archived'
      });
    }

    // Validate description length for SEO
    if (frontmatter.description) {
      const desc = frontmatter.description;
      if (desc.length < 50) {
        this.warnings.push({
          project: projectName,
          type: 'seo_warning',
          field: 'description',
          message: `Description too short (${desc.length} chars). Recommended: 120-160 chars`
        });
      } else if (desc.length > 160) {
        this.warnings.push({
          project: projectName,
          type: 'seo_warning',
          field: 'description',
          message: `Description too long (${desc.length} chars). Recommended: 120-160 chars`
        });
      }
    }

    // Validate title length
    if (frontmatter.title && frontmatter.title.length > 60) {
      this.warnings.push({
        project: projectName,
        type: 'seo_warning',
        field: 'title',
        message: `Title too long (${frontmatter.title.length} chars). Recommended: < 60 chars`
      });
    }
  }

  validateContent(projectName, markdown) {
    const wordCount = this.countWords(markdown);

    if (wordCount < 100) {
      this.warnings.push({
        project: projectName,
        type: 'content_warning',
        message: `Very short content (${wordCount} words). Consider adding more detail`
      });
    }

    // Check for broken markdown links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(markdown)) !== null) {
      const url = match[2];
      if (url.startsWith('./') || url.startsWith('../')) {
        // Local link - could validate if file exists
        this.suggestions.push({
          project: projectName,
          type: 'suggestion',
          message: `Consider verifying local link: ${url}`
        });
      }
    }

    // Check for images without alt text
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = imageRegex.exec(markdown)) !== null) {
      const alt = match[1];
      const src = match[2];
      if (!alt || alt.trim() === '') {
        this.warnings.push({
          project: projectName,
          type: 'accessibility_warning',
          message: `Image missing alt text: ${src}`
        });
      }
    }
  }

  validateSEO(projectName, frontmatter) {
    // Check for SEO fields
    const seoFields = ['seo_title', 'seo_description', 'canonical_url'];
    let missingSeoFields = 0;

    seoFields.forEach(field => {
      if (!frontmatter[field]) {
        missingSeoFields++;
      }
    });

    if (missingSeoFields === seoFields.length) {
      this.suggestions.push({
        project: projectName,
        type: 'seo_suggestion',
        message: 'Consider adding custom SEO fields for better search optimization'
      });
    }

    // Check for social media fields
    const socialFields = ['og_title', 'og_description', 'twitter_card'];
    let missingSocialFields = 0;

    socialFields.forEach(field => {
      if (!frontmatter[field]) {
        missingSocialFields++;
      }
    });

    if (missingSocialFields === socialFields.length) {
      this.suggestions.push({
        project: projectName,
        type: 'social_suggestion',
        message: 'Consider adding Open Graph/Twitter fields for better social sharing'
      });
    }

    // Check categories
    if (!frontmatter.categories || frontmatter.categories.length === 0) {
      this.warnings.push({
        project: projectName,
        type: 'categorization_warning',
        message: 'Project has no categories - will be hard to discover'
      });
    } else if (frontmatter.categories.length > 5) {
      this.warnings.push({
        project: projectName,
        type: 'categorization_warning',
        message: `Too many categories (${frontmatter.categories.length}). Recommended: 1-5`
      });
    }
  }

  async validateImages(projectName, projectFolder, frontmatter) {
    if (frontmatter.hero_image) {
      let imagePath;

      // Resolve image path
      if (frontmatter.hero_image.startsWith('images/')) {
        imagePath = path.join(projectFolder, frontmatter.hero_image);
      } else if (frontmatter.hero_image.startsWith('../images/')) {
        imagePath = path.join(this.projectsDir, '..', frontmatter.hero_image.replace('../', ''));
      } else {
        imagePath = path.join(projectFolder, frontmatter.hero_image);
      }

      if (!await fs.pathExists(imagePath)) {
        this.errors.push({
          project: projectName,
          type: 'missing_image',
          message: `Hero image not found: ${frontmatter.hero_image}`
        });
      }
    }

    // Check if images directory exists
    const imagesDir = path.join(projectFolder, 'images');
    if (await fs.pathExists(imagesDir)) {
      const images = await fs.readdir(imagesDir);
      if (images.length === 0) {
        this.warnings.push({
          project: projectName,
          type: 'empty_images',
          message: 'Images directory exists but is empty'
        });
      }
    } else if (!frontmatter.hero_image) {
      this.suggestions.push({
        project: projectName,
        type: 'image_suggestion',
        message: 'Consider adding a hero image for better visual appeal'
      });
    }
  }

  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  isValidDate(dateString) {
    // Handle Date objects (gray-matter auto-parses YYYY-MM-DD dates)
    if (dateString instanceof Date) {
      return !isNaN(dateString.getTime());
    }
    // Handle string format
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(dateString) && !isNaN(Date.parse(dateString));
  }

  generateReport() {
    const reportData = {
      generated: new Date().toISOString(),
      summary: {
        totalProjects: this.validatedProjects.length,
        errors: this.errors.length,
        warnings: this.warnings.length,
        suggestions: this.suggestions.length
      },
      projects: this.validatedProjects.map(p => ({
        name: p.name,
        status: p.status,
        wordCount: p.wordCount,
        hasHeroImage: !!p.frontmatter.hero_image,
        categoryCount: (p.frontmatter.categories || []).length,
        descriptionLength: p.frontmatter.description ? p.frontmatter.description.length : 0
      })),
      issues: {
        errors: this.errors,
        warnings: this.warnings,
        suggestions: this.suggestions
      }
    };

    const reportPath = path.join(this.projectsDir, 'validation-report.json');
    fs.writeJsonSync(reportPath, reportData, { spaces: 2 });

    console.log(chalk.blue(`📋 Validation report saved: ${reportPath}`));

    return reportData;
  }

  printSummary() {
    console.log('\n' + chalk.cyan('🔍 Validation Summary:'));
    console.log(`   Projects validated: ${chalk.bold(this.validatedProjects.length)}`);

    if (this.errors.length > 0) {
      console.log(`   ${chalk.red('❌ Errors:')} ${chalk.bold.red(this.errors.length)}`);
      this.errors.forEach(error => {
        console.log(`     ${chalk.red('•')} ${error.project}: ${error.message}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log(`   ${chalk.yellow('⚠️  Warnings:')} ${chalk.bold.yellow(this.warnings.length)}`);
      if (this.warnings.length <= 5) {
        this.warnings.forEach(warning => {
          console.log(`     ${chalk.yellow('•')} ${warning.project}: ${warning.message}`);
        });
      } else {
        this.warnings.slice(0, 5).forEach(warning => {
          console.log(`     ${chalk.yellow('•')} ${warning.project}: ${warning.message}`);
        });
        console.log(`     ${chalk.yellow('...')} and ${this.warnings.length - 5} more warnings`);
      }
    }

    if (this.suggestions.length > 0) {
      console.log(`   ${chalk.blue('💡 Suggestions:')} ${chalk.bold.blue(this.suggestions.length)}`);
      if (this.suggestions.length <= 3) {
        this.suggestions.forEach(suggestion => {
          console.log(`     ${chalk.blue('•')} ${suggestion.project}: ${suggestion.message}`);
        });
      } else {
        console.log(`     ${chalk.blue('•')} See validation-report.json for all suggestions`);
      }
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(chalk.green('   ✅ All projects pass validation!'));
    }

    // Project status summary
    const statusCount = {};
    this.validatedProjects.forEach(p => {
      statusCount[p.status] = (statusCount[p.status] || 0) + 1;
    });

    console.log('\n' + chalk.cyan('📊 Project Status:'));
    Object.entries(statusCount).forEach(([status, count]) => {
      const color = status === 'published' ? chalk.green :
                   status === 'draft' ? chalk.yellow : chalk.gray;
      console.log(`   ${color(status)}: ${chalk.bold(count)}`);
    });

    return this.errors.length === 0;
  }
}

// CLI execution
if (require.main === module) {
  const validator = new ProjectValidator();
  validator.validate()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Validation failed:'), error);
      process.exit(1);
    });
}

module.exports = ProjectValidator;