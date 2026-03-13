/**
 * JSON Index Generator
 *
 * Automatically generates the projects index.json file from markdown frontmatter.
 * Maintains backward compatibility with existing JavaScript while adding new features.
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const { format, parseISO } = require('date-fns');
const { fr } = require('date-fns/locale');
const MarkdownParser = require('./markdown-parser');
const { getBaseUrl } = require('./site-url');

class IndexGenerator {
  constructor(options = {}) {
    this.projectsDir = options.projectsDir || path.join(__dirname, '../../projets');
    this.outputFile = options.outputFile || path.join(this.projectsDir, 'index.json');
    this.baseUrl = getBaseUrl(options.baseUrl);
    this.parser = new MarkdownParser({ baseUrl: this.baseUrl });

    this.projects = [];
    this.stats = {
      totalProjects: 0,
      publishedProjects: 0,
      draftProjects: 0,
      featuredProjects: 0,
      categories: new Set(),
      tags: new Set(),
      techStack: new Set()
    };
  }

  /**
   * Generate the complete index from all project folders
   */
  async generate() {
    console.log(chalk.blue('🔍 Scanning for project folders...'));

    const projectFolders = await this.findProjectFolders();
    console.log(chalk.blue(`Found ${projectFolders.length} project folders`));

    console.log(chalk.blue('📝 Processing projects...'));

    for (const folder of projectFolders) {
      try {
        const project = await this.processProject(folder);
        if (project) {
          this.projects.push(project);
          this.updateStats(project);
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Skipping ${folder}: ${error.message}`));
      }
    }

    // Sort projects
    this.sortProjects();

    // Generate the index
    const indexData = this.generateIndexData();

    // Write to file
    await this.writeIndex(indexData);

    console.log(chalk.green(`✅ Generated index with ${this.projects.length} projects`));
    return indexData;
  }

  /**
   * Find all project folders (containing index.md)
   */
  async findProjectFolders() {
    const pattern = path.join(this.projectsDir, '*', 'index.md').replace(/\\/g, '/');
    const indexFiles = glob.sync(pattern);

    return indexFiles.map(file => path.dirname(file));
  }

  /**
   * Process a single project folder
   */
  async processProject(projectFolder) {
    const indexFile = path.join(projectFolder, 'index.md');

    if (!await fs.pathExists(indexFile)) {
      throw new Error('No index.md file found');
    }

    const parsed = await this.parser.parseFile(indexFile);
    const { frontmatter, metadata, stats } = parsed;

    // Skip drafts in production builds
    if (frontmatter.status === 'draft' && process.env.NODE_ENV === 'production') {
      return null;
    }

    // Build project data for index
    const projectData = this.buildProjectData(frontmatter, metadata, stats, projectFolder);

    return projectData;
  }

  /**
   * Build project data object for the index
   */
  buildProjectData(frontmatter, metadata, stats, projectFolder) {
    const folderName = path.basename(projectFolder);

    return {
      // Core fields for backward compatibility
      title: frontmatter.title,
      description: frontmatter.description,
      image: this.resolveImagePath(frontmatter.hero_image, folderName),
      categories: frontmatter.categories,
      url: `${folderName}`, // Relative to /projets/

      // Enhanced fields
      slug: frontmatter.slug,
      excerpt: frontmatter.excerpt,
      date: frontmatter.date,
      last_updated: frontmatter.last_updated,
      status: frontmatter.status,
      featured: frontmatter.featured,

      // Tags and tech
      tags: frontmatter.tags || [],
      tech_stack: frontmatter.tech_stack || [],

      // SEO fields
      seo_title: frontmatter.seo_title,
      seo_description: frontmatter.seo_description,

      // Links
      github_url: frontmatter.github_url,

      // Metadata
      reading_time: stats.readingTime,
      word_count: stats.wordCount,
      complexity: stats.complexity,

      // Generated info
      generated_at: new Date().toISOString(),
      schema_type: frontmatter.schema_type
    };
  }

  /**
   * Resolve image paths relative to the main site
   */
  resolveImagePath(imagePath, projectSlug) {
    if (!imagePath) return null;

    // If it's already a full path from images/, return as-is
    if (imagePath.startsWith('../images/')) {
      return imagePath;
    }

    // If it's a relative path from the project folder
    if (imagePath.startsWith('images/')) {
      return `../images/projets/${projectSlug}/${imagePath.replace('images/', '')}`;
    }

    // Default case
    return imagePath;
  }

  /**
   * Update statistics while processing
   */
  updateStats(project) {
    this.stats.totalProjects++;

    if (project.status === 'published') {
      this.stats.publishedProjects++;
    } else if (project.status === 'draft') {
      this.stats.draftProjects++;
    }

    if (project.featured) {
      this.stats.featuredProjects++;
    }

    // Collect categories, tags, and tech stack
    project.categories.forEach(cat => this.stats.categories.add(cat));
    project.tags.forEach(tag => this.stats.tags.add(tag));
    project.tech_stack.forEach(tech => this.stats.techStack.add(tech));
  }

  /**
   * Sort projects by date (newest first)
   */
  sortProjects() {
    this.projects.sort((a, b) => {
      // Sort by date (newer first)
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });
  }

  /**
   * Generate the final index data structure
   */
  generateIndexData() {
    // Filter only published projects for production
    const visibleProjects = process.env.NODE_ENV === 'production'
      ? this.projects.filter(p => p.status === 'published')
      : this.projects;

    return {
      // Backward compatibility: just the array of projects
      projects: visibleProjects,

      // Enhanced metadata
      metadata: {
        generated_at: new Date().toISOString(),
        total_projects: this.stats.totalProjects,
        published_projects: this.stats.publishedProjects,
        featured_projects: this.stats.featuredProjects,
        build_version: require('../package.json').version,

        // Available filters
        available_categories: Array.from(this.stats.categories).sort(),
        available_tags: Array.from(this.stats.tags).sort(),
        available_tech_stack: Array.from(this.stats.techStack).sort(),

        // For analytics
        average_reading_time: this.calculateAverageReadingTime(),
        complexity_distribution: this.getComplexityDistribution()
      }
    };
  }

  /**
   * Write the index to file
   */
  async writeIndex(indexData) {
    // Write the full index with metadata
    await fs.writeJson(this.outputFile, indexData, { spaces: 2 });

    // Also write a simple array version for backward compatibility
    const simpleIndex = indexData.projects.map(project => ({
      title: project.title,
      description: project.description,
      image: project.image,
      categories: project.categories,
      url: project.url
    }));

    const simpleFile = path.join(this.projectsDir, 'index-simple.json');
    await fs.writeJson(simpleFile, simpleIndex, { spaces: 2 });

    console.log(chalk.green(`📝 Written index to ${this.outputFile}`));
    console.log(chalk.green(`📝 Written simple index to ${simpleFile}`));
  }

  /**
   * Calculate average reading time
   */
  calculateAverageReadingTime() {
    if (this.projects.length === 0) return 0;

    const totalTime = this.projects.reduce((sum, project) => sum + (project.reading_time || 0), 0);
    return Math.round(totalTime / this.projects.length);
  }

  /**
   * Get complexity distribution
   */
  getComplexityDistribution() {
    const distribution = {};

    this.projects.forEach(project => {
      const complexity = project.complexity || 1;
      distribution[complexity] = (distribution[complexity] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Generate summary report
   */
  generateReport() {
    console.log('\n' + chalk.cyan('📊 Index Generation Report:'));
    console.log(`   Total projects: ${chalk.bold(this.stats.totalProjects)}`);
    console.log(`   Published: ${chalk.bold(this.stats.publishedProjects)}`);
    console.log(`   Drafts: ${chalk.bold(this.stats.draftProjects)}`);
    console.log(`   Featured: ${chalk.bold(this.stats.featuredProjects)}`);
    console.log(`   Categories: ${chalk.bold(Array.from(this.stats.categories).join(', '))}`);
    console.log(`   Average reading time: ${chalk.bold(this.calculateAverageReadingTime())} min`);

    if (this.stats.tags.size > 0) {
      console.log(`   Tags: ${chalk.bold(this.stats.tags.size)} unique tags`);
    }

    if (this.stats.techStack.size > 0) {
      console.log(`   Technologies: ${chalk.bold(Array.from(this.stats.techStack).slice(0, 5).join(', '))}${this.stats.techStack.size > 5 ? '...' : ''}`);
    }
  }

  /**
   * Validate generated index
   */
  async validateIndex() {
    if (!await fs.pathExists(this.outputFile)) {
      throw new Error('Index file was not created');
    }

    const indexData = await fs.readJson(this.outputFile);

    if (!indexData.projects || !Array.isArray(indexData.projects)) {
      throw new Error('Invalid index structure');
    }

    // Validate each project has required fields
    for (const project of indexData.projects) {
      if (!project.title || !project.description || !project.categories) {
        throw new Error(`Invalid project data: ${JSON.stringify(project)}`);
      }
    }

    console.log(chalk.green('✅ Index validation passed'));
    return true;
  }
}

module.exports = IndexGenerator;