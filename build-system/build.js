#!/usr/bin/env node

/**
 * Portfolio Build System
 * Automated project publishing for Antoine's portfolio
 *
 * Features:
 * - Parse markdown frontmatter
 * - Generate JSON index
 * - Create HTML project pages
 * - Manage tags dynamically
 * - SEO optimization
 * - Image processing
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');
const markdownIt = require('markdown-it');
const markdownItAttrs = require('markdown-it-attrs');
const markdownItAnchor = require('markdown-it-anchor');
const Handlebars = require('handlebars');
const chalk = require('chalk');
const ora = require('ora');
const { format } = require('date-fns');
const { fr } = require('date-fns/locale');
const { getBaseUrl } = require('./lib/site-url');

// Configuration
const config = {
  projectsDir: path.join(__dirname, '../projets'),
  outputDir: path.join(__dirname, '../'),
  templatesDir: path.join(__dirname, 'templates'),
  assetsDir: path.join(__dirname, '../images'),
  baseUrl: getBaseUrl()
};

// Initialize markdown processor
const md = markdownIt({
  html: true,
  linkify: true,
  typographer: true
})
.use(markdownItAttrs)
.use(markdownItAnchor, {
  permalink: markdownItAnchor.permalink.headerLink()
});

class PortfolioBuildSystem {
  constructor(options = {}) {
    this.projects = [];
    this.allTags = new Set();
    this.allCategories = new Set();
    this.options = {
      verbose: options.verbose || process.env.CI || false,
      production: process.env.NODE_ENV === 'production',
      ...options
    };

    // GitHub Actions compatibility
    if (process.env.CI) {
      console.log(chalk.blue('🔧 Running in CI environment (GitHub Actions)'));
      console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Working directory: ${process.cwd()}`);
    }
  }

  async build() {
    const spinner = ora('Building portfolio...').start();

    try {
      // Validate build environment
      if (this.options.verbose) {
        spinner.text = 'Validating build environment...';
        await this.validateBuildEnvironment();
      }

      spinner.text = 'Discovering projects...';
      await this.discoverProjects();

      spinner.text = 'Processing projects...';
      await this.processProjects();

      spinner.text = 'Generating JSON index...';
      await this.generateIndex();

      spinner.text = 'Creating project pages...';
      await this.generateProjectPages();

      spinner.text = 'Updating main site...';
      await this.updateMainSite();

      spinner.succeed(chalk.green(`✅ Build complete! Processed ${this.projects.length} projects`));

      this.printSummary();
    } catch (error) {
      spinner.fail(chalk.red('❌ Build failed'));
      console.error(chalk.red('Error message:', error.message));
      console.error(chalk.red('Error stack:', error.stack));
      console.error(chalk.red('Full error object:', error));

      if (this.options.verbose || process.env.CI) {
        console.error(chalk.red('Stack trace:'));
        console.error(error.stack);
      }

      process.exit(1);
    }
  }

  async validateBuildEnvironment() {
    // Check if we're in the right directory
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('Build system package.json not found. Make sure you are in the build-system directory.');
    }

    // Check if node_modules exists
    const nodeModulesPath = path.join(__dirname, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      throw new Error('Dependencies not installed. Run: npm install');
    }

    // Check if projects directory exists
    const projectsDir = path.join(config.projectsDir);
    if (!fs.existsSync(projectsDir)) {
      console.warn(chalk.yellow('⚠️  Projects directory not found, creating...'));
      fs.ensureDirSync(projectsDir);
    }

    if (this.options.verbose) {
      console.log(chalk.green('✅ Build environment validated'));
    }
  }

  async discoverProjects() {
    const IndexGenerator = require('./lib/index-generator');
    const indexGenerator = new IndexGenerator({
      projectsDir: config.projectsDir,
      baseUrl: config.baseUrl
    });

    const projectFolders = await indexGenerator.findProjectFolders();
    console.log(chalk.blue(`🔍 Discovered ${projectFolders.length} project folders`));

    return projectFolders;
  }

  async processProjects() {
    const IndexGenerator = require('./lib/index-generator');
    const indexGenerator = new IndexGenerator({
      projectsDir: config.projectsDir,
      outputFile: path.join(config.projectsDir, 'index.json'),
      baseUrl: config.baseUrl
    });

    const indexData = await indexGenerator.generate();
    this.projects = indexData.projects;

    // Extract all unique tags and categories
    this.projects.forEach(project => {
      project.categories.forEach(cat => this.allCategories.add(cat));
      if (project.tags) project.tags.forEach(tag => this.allTags.add(tag));
    });

    console.log(chalk.green(`⚙️  Processed ${this.projects.length} projects`));
    return indexData;
  }

  async generateIndex() {
    // Index generation is handled in processProjects()
    console.log(chalk.green('📋 Index generation completed during project processing'));
  }

  async generateProjectPages() {
    const TemplateEngine = require('./lib/template-engine');
    const templateEngine = new TemplateEngine({
      templatesDir: config.templatesDir,
      baseUrl: config.baseUrl
    });

    const projectFolders = await this.discoverProjects();
    const results = await templateEngine.generateAllPages(projectFolders);

    console.log(chalk.green(`📄 Generated ${results.generated.length} project pages`));
    return results;
  }

  async updateMainSite() {
    const TagManager = require('./lib/tag-manager');
    const SEOOptimizer = require('./lib/seo-optimizer');

    // Manage tags and update filters
    const tagManager = new TagManager({
      projectsDir: config.projectsDir,
      mainSiteDir: config.outputDir
    });

    const tagResults = await tagManager.manageTagsFromProjects(this.projects);
    tagManager.printTagSummary(tagResults);

    // Generate SEO features
    const seoOptimizer = new SEOOptimizer({
      baseUrl: config.baseUrl,
      outputDir: config.outputDir
    });

    const seoResults = await seoOptimizer.generateSEOPackage(this.projects);

    console.log(chalk.green('🌐 Main site updates completed'));
    return { tagResults, seoResults };
  }

  printSummary() {
    console.log('\n' + chalk.cyan('📊 Build Summary:'));
    console.log(`   Projects: ${chalk.bold(this.projects.length)}`);
    console.log(`   Categories: ${chalk.bold(Array.from(this.allCategories).join(', '))}`);
    console.log(`   Tags: ${chalk.bold(Array.from(this.allTags).join(', '))}`);
    console.log(`   Generated: ${chalk.bold(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr }))}`);
  }
}

// CLI execution
if (require.main === module) {
  const buildSystem = new PortfolioBuildSystem();
  buildSystem.build().catch(console.error);
}

module.exports = PortfolioBuildSystem;