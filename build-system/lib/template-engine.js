/**
 * Template Engine
 *
 * Handles HTML template generation for project pages using Handlebars.
 * Includes helpers, SEO optimization, and file generation.
 */

const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');
const chalk = require('chalk');
const { format, parseISO } = require('date-fns');
const { fr } = require('date-fns/locale');
const MarkdownParser = require('./markdown-parser');
const { getBaseUrl } = require('./site-url');

class TemplateEngine {
  constructor(options = {}) {
    this.templatesDir = options.templatesDir || path.join(__dirname, '../templates');
    this.outputDir = options.outputDir || path.join(__dirname, '../../projets');
    this.baseUrl = getBaseUrl(options.baseUrl);
    this.parser = new MarkdownParser({ baseUrl: this.baseUrl });

    // Register Handlebars helpers
    this.registerHelpers();

    // Cache for compiled templates
    this.templateCache = new Map();
  }

  /**
   * Register Handlebars helper functions
   */
  registerHelpers() {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date) => {
      if (!date) return '';
      try {
        const parsedDate = typeof date === 'string' ? parseISO(date) : date;
        return format(parsedDate, 'dd MMMM yyyy', { locale: fr });
      } catch (error) {
        return date;
      }
    });

    // Current year helper
    Handlebars.registerHelper('currentYear', () => {
      return new Date().getFullYear();
    });

    // Equality helper
    Handlebars.registerHelper('eq', (a, b) => {
      return a === b;
    });

    // Greater than helper
    Handlebars.registerHelper('gt', (a, b) => {
      return a > b;
    });

    // Logical OR helper
    Handlebars.registerHelper('or', (...args) => {
      const options = args.pop();
      return args.some(arg => !!arg);
    });

    // Join array helper
    Handlebars.registerHelper('join', (array, separator = ', ') => {
      if (!Array.isArray(array)) return '';
      return array.join(separator);
    });

    // Truncate text helper
    Handlebars.registerHelper('truncate', (text, length = 100) => {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    });

    // JSON stringify helper for structured data
    Handlebars.registerHelper('json', (obj) => {
      return JSON.stringify(obj, null, 2);
    });

    // Capitalize first letter
    Handlebars.registerHelper('capitalize', (text) => {
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1);
    });

    // Debug helper
    Handlebars.registerHelper('debug', (obj) => {
      console.log('Debug:', obj);
      return '';
    });

    // Reading time formatting
    Handlebars.registerHelper('readingTime', (minutes) => {
      if (!minutes || minutes < 1) return 'Moins d\'1 min';
      return minutes === 1 ? '1 min' : `${minutes} min`;
    });
  }

  /**
   * Load and compile a template
   */
  async loadTemplate(templateName) {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    if (!await fs.pathExists(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const templateSource = await fs.readFile(templatePath, 'utf-8');
    const compiled = Handlebars.compile(templateSource);

    this.templateCache.set(templateName, compiled);
    return compiled;
  }

  /**
   * Generate HTML page for a project
   */
  async generateProjectPage(projectFolder) {
    const indexFile = path.join(projectFolder, 'index.md');

    if (!await fs.pathExists(indexFile)) {
      throw new Error(`No index.md found in ${projectFolder}`);
    }

    // Parse the markdown file
    const parsed = await this.parser.parseFile(indexFile);
    const { frontmatter, html, metadata, stats } = parsed;

    // Skip drafts in production
    if (frontmatter.status === 'draft' && process.env.NODE_ENV === 'production') {
      console.log(chalk.yellow(`⏭️  Skipping draft: ${frontmatter.title}`));
      return null;
    }

    // Load project template
    const template = await this.loadTemplate('project');

    // Prepare template data
    const templateData = this.prepareTemplateData(frontmatter, html, metadata, stats, projectFolder);

    // Generate HTML
    const renderedHtml = template(templateData);

    // Write HTML file
    const outputPath = path.join(projectFolder, 'index.html');
    await fs.writeFile(outputPath, renderedHtml, 'utf-8');

    console.log(chalk.green(`✅ Generated: ${path.basename(projectFolder)}/index.html`));

    return {
      projectFolder,
      outputPath,
      title: frontmatter.title,
      status: frontmatter.status
    };
  }

  /**
   * Prepare data for template rendering
   */
  prepareTemplateData(frontmatter, html, metadata, stats, projectFolder) {
    const projectSlug = path.basename(projectFolder);

    return {
      // Basic project data
      ...frontmatter,

      // Processed content
      content: html,

      // Metadata
      ...metadata,
      ...stats,

      // Context
      baseUrl: this.baseUrl,
      projectSlug: projectSlug,
      NODE_ENV: process.env.NODE_ENV || 'development',

      // Enhanced SEO data
      keywords: this.generateKeywords(frontmatter),
      hero_alt: frontmatter.hero_alt || `Aperçu du projet: ${frontmatter.title}`,

      // Social media optimizations
      og_image: this.resolveSocialImage(frontmatter.og_image || frontmatter.hero_image, projectSlug),
      twitter_image: this.resolveSocialImage(frontmatter.twitter_image || frontmatter.hero_image, projectSlug),

      // Default values
      language: frontmatter.language || 'fr',
      reading_time: stats.readingTime || 0,
      word_count: stats.wordCount || 0
    };
  }

  /**
   * Generate keywords from project data
   */
  generateKeywords(frontmatter) {
    const keywords = new Set();

    // Add explicit keywords
    if (frontmatter.keywords) {
      frontmatter.keywords.forEach(kw => keywords.add(kw));
    }

    // Add categories as keywords
    if (frontmatter.categories) {
      frontmatter.categories.forEach(cat => keywords.add(cat.toLowerCase()));
    }

    // Add tech stack as keywords
    if (frontmatter.tech_stack) {
      frontmatter.tech_stack.forEach(tech => keywords.add(tech.toLowerCase()));
    }

    // Add common SEO keywords
    keywords.add('antoine smeets');
    keywords.add('portfolio');
    keywords.add('développeur');

    return Array.from(keywords);
  }

  /**
   * Resolve social media image paths
   */
  resolveSocialImage(imagePath, projectSlug) {
    if (!imagePath) return null;

    // If it's already absolute, return as-is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // If it's a relative path from the project folder
    if (imagePath.startsWith('images/')) {
      return `${this.baseUrl}/images/projets/${projectSlug}/${imagePath.replace('images/', '')}`;
    }

    // If it's already a full path from images/
    if (imagePath.startsWith('../images/') || imagePath.startsWith('images/')) {
      return `${this.baseUrl}/${imagePath.replace('../', '')}`;
    }

    return `${this.baseUrl}/images/projets/${projectSlug}/${imagePath}`;
  }

  /**
   * Generate all project pages
   */
  async generateAllPages(projectFolders) {
    const results = {
      generated: [],
      skipped: [],
      errors: []
    };

    console.log(chalk.blue(`🏗️  Generating HTML pages for ${projectFolders.length} projects...`));

    for (const folder of projectFolders) {
      try {
        const result = await this.generateProjectPage(folder);

        if (result) {
          results.generated.push(result);
        } else {
          results.skipped.push({
            projectFolder: folder,
            reason: 'Draft project'
          });
        }
      } catch (error) {
        console.error(chalk.red(`❌ Error generating ${folder}: ${error.message}`));
        results.errors.push({
          projectFolder: folder,
          error: error.message
        });
      }
    }

    this.printGenerationSummary(results);
    return results;
  }

  /**
   * Print generation summary
   */
  printGenerationSummary(results) {
    console.log('\n' + chalk.cyan('📄 Page Generation Summary:'));
    console.log(`   Generated: ${chalk.bold.green(results.generated.length)}`);
    console.log(`   Skipped: ${chalk.bold.yellow(results.skipped.length)}`);
    console.log(`   Errors: ${chalk.bold.red(results.errors.length)}`);

    if (results.generated.length > 0) {
      console.log('\n' + chalk.green('✅ Generated Pages:'));
      results.generated.forEach(result => {
        console.log(`   ${chalk.green('✓')} ${result.title}`);
      });
    }

    if (results.skipped.length > 0) {
      console.log('\n' + chalk.yellow('⏭️  Skipped Pages:'));
      results.skipped.forEach(result => {
        console.log(`   ${chalk.yellow('-')} ${path.basename(result.projectFolder)} (${result.reason})`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n' + chalk.red('❌ Errors:'));
      results.errors.forEach(result => {
        console.log(`   ${chalk.red('✗')} ${path.basename(result.projectFolder)}: ${result.error}`);
      });
    }
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.templateCache.clear();
    console.log(chalk.blue('🧹 Template cache cleared'));
  }

  /**
   * Validate template output
   */
  async validateOutput(outputPath) {
    if (!await fs.pathExists(outputPath)) {
      throw new Error(`Output file not found: ${outputPath}`);
    }

    const content = await fs.readFile(outputPath, 'utf-8');

    // Basic HTML validation
    if (!content.includes('<!DOCTYPE html>')) {
      throw new Error('Missing DOCTYPE declaration');
    }

    if (!content.includes('<title>') || !content.includes('</title>')) {
      throw new Error('Missing title tag');
    }

    if (!content.includes('<meta name="description"')) {
      throw new Error('Missing meta description');
    }

    return true;
  }
}

module.exports = TemplateEngine;