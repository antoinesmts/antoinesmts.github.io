#!/usr/bin/env node

/**
 * Migration Script: Flat MD Files → Folder Structure
 *
 * This script migrates existing projects from:
 * - /projets/project-name.md
 * To:
 * - /projets/project-name/index.md (with enhanced frontmatter)
 *
 * Features:
 * - Preserves all existing content
 * - Enhances frontmatter with new SEO fields
 * - Creates backup of original files
 * - Validates migration success
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');
const chalk = require('chalk');
const ora = require('ora');
const slugify = require('slugify');
const { getBaseUrl } = require('../lib/site-url');

class ProjectMigrator {
  constructor() {
    this.projectsDir = path.resolve(__dirname, '../../projets');
    this.backupDir = path.join(__dirname, '../../backup');
    this.existingIndex = null;
    this.migratedProjects = [];
  }

  async migrate() {
    const spinner = ora('Starting migration...').start();

    try {
      // Step 1: Create backup
      spinner.text = 'Creating backup...';
      await this.createBackup();

      // Step 2: Load existing index for reference
      spinner.text = 'Loading existing project index...';
      await this.loadExistingIndex();

      // Step 3: Find all MD files to migrate
      spinner.text = 'Discovering projects to migrate...';
      const mdFiles = await this.findProjectFiles();

      // Step 4: Migrate each project
      for (let i = 0; i < mdFiles.length; i++) {
        const file = mdFiles[i];
        spinner.text = `Migrating ${path.basename(file)} (${i + 1}/${mdFiles.length})...`;
        await this.migrateProject(file);
      }

      // Step 5: Validate migration
      spinner.text = 'Validating migration...';
      const isValid = await this.validateMigration();

      if (isValid) {
        spinner.succeed(chalk.green(`✅ Migration completed! Migrated ${this.migratedProjects.length} projects`));
        this.printSummary();
      } else {
        throw new Error('Migration validation failed');
      }

    } catch (error) {
      spinner.fail(chalk.red('❌ Migration failed'));
      console.error(chalk.red(error.message));
      console.error(error.stack);
      console.log(chalk.yellow('💡 Original files are preserved in backup folder'));
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `migration-${timestamp}`);

    await fs.ensureDir(backupPath);
    await fs.copy(this.projectsDir, backupPath);

    console.log(chalk.blue(`📁 Backup created: ${backupPath}`));
  }

  async loadExistingIndex() {
    const indexPath = path.join(this.projectsDir, 'index.json');
    if (await fs.pathExists(indexPath)) {
      const indexData = await fs.readJson(indexPath);
      // Handle both array format and object format
      this.existingIndex = Array.isArray(indexData) ? indexData : (indexData.projects || []);
      console.log(chalk.blue(`📋 Loaded ${this.existingIndex.length} projects from existing index`));
    } else {
      this.existingIndex = [];
    }
  }

  async findProjectFiles() {
    try {
      const files = await fs.readdir(this.projectsDir);
      const mdFiles = files
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(this.projectsDir, file));

      // Exclude template and non-project files
      const projectFiles = mdFiles.filter(file => {
        const basename = path.basename(file, '.md');
        return !['template', 'README', 'index'].includes(basename);
      });

      console.log(chalk.blue(`🔍 Found ${projectFiles.length} project files to migrate`));
      return projectFiles;
    } catch (error) {
      console.error(chalk.red(`Error reading projects directory: ${error.message}`));
      return [];
    }
  }

  async migrateProject(filePath) {
    const filename = path.basename(filePath, '.md');
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: markdown } = matter(content);

    // Create slug from filename
    const slug = slugify(filename, { lower: true, strict: true });

    // Create project folder
    const projectFolder = path.join(this.projectsDir, slug);
    await fs.ensureDir(projectFolder);

    // Find matching data from existing index
    const indexData = this.existingIndex?.find(p =>
      p.url === `projets/${filename}` ||
      p.url === `projets/${slug}` ||
      p.title.toLowerCase().includes(filename.toLowerCase())
    );

    // Enhance frontmatter with new schema
    const enhancedFrontmatter = this.enhanceFrontmatter(frontmatter, indexData, slug);

    // Create new markdown file with enhanced frontmatter
    const newContent = matter.stringify(markdown, enhancedFrontmatter);
    const newFilePath = path.join(projectFolder, 'index.md');

    await fs.writeFile(newFilePath, newContent, 'utf-8');

    // Copy associated images if they exist
    await this.copyProjectImages(slug, projectFolder);

    this.migratedProjects.push({
      original: filePath,
      migrated: newFilePath,
      slug: slug,
      title: enhancedFrontmatter.title
    });

    console.log(chalk.green(`  ✓ Migrated: ${filename} → ${slug}/index.md`));
  }

  enhanceFrontmatter(existing, indexData, slug) {
    const baseUrl = getBaseUrl();

    const enhanced = {
      // Basic Information
      title: existing.title || indexData?.title || 'Untitled Project',
      slug: slug,
      description: existing.description || indexData?.description || '',
      excerpt: existing.excerpt || this.generateExcerpt(existing.description || indexData?.description),

      // Content & Media
      hero_image: existing.image || indexData?.image || 'images/hero.png',

      // Metadata
      date: existing.date || indexData?.date || new Date().toISOString().split('T')[0],
      status: existing.status || 'published',
      featured: existing.featured || false,

      // Categories & Tags
      categories: existing.categories || indexData?.categories || ['Général'],
      tags: existing.tags || [],
      tech_stack: existing.tech_stack || [],

      // SEO (auto-generated for now, can be customized later)
      seo_title: existing.seo_title || null, // Will be auto-generated
      canonical_url: `${baseUrl}/projets/${slug}`,

      // Schema.org
      schema_type: this.inferSchemaType(existing.categories || indexData?.categories || []),

      // Project Details
      duration: existing.duration || null,
      team_size: existing.team_size || 1,
      client: existing.client || 'Personnel',

      // Links
      github_url: existing.github_url || null,
      demo_url: existing.demo_url || null,
      case_study: existing.case_study || true,

      // Preserve any custom fields
      ...Object.fromEntries(
        Object.entries(existing).filter(([key]) =>
          !['title', 'description', 'image', 'date', 'categories'].includes(key)
        )
      )
    };

    return enhanced;
  }

  generateExcerpt(description) {
    if (!description) return '';
    return description.length > 120
      ? description.substring(0, 117) + '...'
      : description;
  }

  inferSchemaType(categories) {
    const cats = (categories || []).map(c => c.toLowerCase());

    if (cats.some(c => ['automatisation', 'python', 'n8n', 'ia'].includes(c))) {
      return 'SoftwareApplication';
    }
    if (cats.some(c => ['power-bi', 'sql', 'analyse'].includes(c))) {
      return 'Dataset';
    }
    return 'CreativeWork';
  }

  async copyProjectImages(slug, projectFolder) {
    const imagesDir = path.join(__dirname, '../../images/projets', slug);
    if (await fs.pathExists(imagesDir)) {
      const targetImagesDir = path.join(projectFolder, 'images');
      await fs.copy(imagesDir, targetImagesDir);
      console.log(chalk.blue(`    📁 Copied images for ${slug}`));
    }
  }

  async validateMigration() {
    let isValid = true;

    for (const project of this.migratedProjects) {
      // Check if new file exists
      if (!await fs.pathExists(project.migrated)) {
        console.error(chalk.red(`❌ Missing migrated file: ${project.migrated}`));
        isValid = false;
      }

      // Check if content is valid
      try {
        const content = await fs.readFile(project.migrated, 'utf-8');
        const parsed = matter(content);

        if (!parsed.data.title) {
          console.error(chalk.red(`❌ Missing title in: ${project.migrated}`));
          isValid = false;
        }
      } catch (error) {
        console.error(chalk.red(`❌ Invalid markdown in: ${project.migrated}`));
        isValid = false;
      }
    }

    return isValid;
  }

  printSummary() {
    console.log('\n' + chalk.cyan('📊 Migration Summary:'));
    console.log(`   Projects migrated: ${chalk.bold(this.migratedProjects.length)}`);
    console.log(`   New structure: ${chalk.bold('projets/{slug}/index.md')}`);
    console.log(`   Enhanced frontmatter: ${chalk.bold('SEO optimized')}`);
    console.log(`   Backup location: ${chalk.bold('backup/')}`);

    console.log('\n' + chalk.cyan('📁 Migrated Projects:'));
    this.migratedProjects.forEach(project => {
      console.log(`   ${chalk.green('✓')} ${project.title} → ${chalk.bold(project.slug)}/`);
    });

    console.log('\n' + chalk.yellow('🔄 Next Steps:'));
    console.log('   1. Review migrated projects for accuracy');
    console.log('   2. Customize enhanced frontmatter fields');
    console.log('   3. Run build system to generate new index.json');
    console.log('   4. Test the new project pages');
  }
}

// CLI execution
if (require.main === module) {
  const migrator = new ProjectMigrator();
  migrator.migrate().catch(console.error);
}

module.exports = ProjectMigrator;