#!/usr/bin/env node

/**
 * Production Build Script for GitHub Actions
 *
 * This script integrates our new automated build system with GitHub Actions.
 * It handles environment setup, builds the portfolio, and prepares for deployment.
 */

const path = require('path');
const fs = require('fs').promises;

// Simple console colors without external dependency
const colors = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// Simple fs-extra replacements
const fsExtra = {
  pathExists: async (path) => {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  },
  ensureDir: async (path) => {
    await fs.mkdir(path, { recursive: true });
  },
  remove: async (path) => {
    await fs.rm(path, { recursive: true, force: true });
  },
  copy: async (src, dest) => {
    await fs.cp(src, dest, { recursive: true });
  },
  readdir: fs.readdir,
  stat: fs.stat,
  readFile: fs.readFile,
  readJson: async (path) => {
    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content);
  }
};

// Set production environment
process.env.NODE_ENV = 'production';

class ProductionBuilder {
  constructor() {
    this.rootDir = path.join(__dirname, '../../');
    this.buildSystemDir = path.join(this.rootDir, 'build-system');
    this.outputDir = path.join(this.rootDir, '_site');

    console.log(colors.blue('🚀 Starting production build for GitHub Actions...'));
    console.log(`   Root directory: ${this.rootDir}`);
    console.log(`   Build system: ${this.buildSystemDir}`);
    console.log(`   Output directory: ${this.outputDir}`);
  }

  async build() {
    try {
      // Step 1: Validate environment
      await this.validateEnvironment();

      // Step 2: Clean previous build
      await this.cleanBuild();

      // Step 3: Run the new build system
      await this.runBuildSystem();

      // Step 4: Prepare for deployment
      await this.prepareDeployment();

      // Step 5: Validate output
      await this.validateOutput();

      console.log(colors.green('\n✅ Production build completed successfully!'));

    } catch (error) {
      console.error(colors.red('\n❌ Production build failed:'));
      console.error(colors.red(error.message));
      console.error(error.stack);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log(colors.blue('\n🔍 Validating environment...'));

    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`   Node.js version: ${nodeVersion}`);

    // Check if build system exists
    if (!await fsExtra.pathExists(this.buildSystemDir)) {
      throw new Error('Build system directory not found');
    }

    // Check if build system dependencies are installed
    const packageJsonPath = path.join(this.buildSystemDir, 'package.json');
    const nodeModulesPath = path.join(this.buildSystemDir, 'node_modules');

    if (!await fsExtra.pathExists(packageJsonPath)) {
      throw new Error('Build system package.json not found');
    }

    if (!await fsExtra.pathExists(nodeModulesPath)) {
      throw new Error('Build system dependencies not installed. Run: cd build-system && npm install');
    }

    // Check if projects exist
    const projectsDir = path.join(this.rootDir, 'projets');
    if (!await fsExtra.pathExists(projectsDir)) {
      console.warn(colors.yellow('⚠️  No projects directory found'));
    }

    console.log(colors.green('   ✅ Environment validation passed'));
  }

  async cleanBuild() {
    console.log(colors.blue('\n🧹 Cleaning previous build...'));

    // Remove output directory if it exists
    if (await fsExtra.pathExists(this.outputDir)) {
      await fsExtra.remove(this.outputDir);
      console.log('   ✅ Removed previous _site directory');
    }

    // Clean any previous generated files
    const filesToClean = [
      path.join(this.rootDir, 'sitemap.xml'),
      path.join(this.rootDir, 'robots.txt'),
      path.join(this.rootDir, 'seo-report.json'),
      path.join(this.rootDir, 'structured-data.json'),
      path.join(this.rootDir, 'social-media-data.json')
    ];

    for (const file of filesToClean) {
      if (await fsExtra.pathExists(file)) {
        await fsExtra.remove(file);
        console.log(`   ✅ Removed ${path.basename(file)}`);
      }
    }
  }

  async runBuildSystem() {
    console.log(colors.blue('\n⚙️  Running automated build system...'));

    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const buildProcess = spawn('node', ['build.js'], {
        cwd: this.buildSystemDir,
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' }
      });

      let stdout = '';
      let stderr = '';

      buildProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        // Forward output to console
        process.stdout.write(data);
      });

      buildProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log(colors.green('   ✅ Build system completed successfully'));
          resolve();
        } else {
          reject(new Error(`Build system failed with exit code ${code}\nstderr: ${stderr}`));
        }
      });

      buildProcess.on('error', (error) => {
        reject(new Error(`Failed to start build system: ${error.message}`));
      });
    });
  }

  async prepareDeployment() {
    console.log(colors.blue('\n📦 Preparing deployment...'));

    // Create output directory
    await fsExtra.ensureDir(this.outputDir);

    // Disable Jekyll processing on GitHub Pages
    await fs.writeFile(path.join(this.outputDir, '.nojekyll'), '');
    console.log('   ✅ Created .nojekyll');

    // Copy main site files
    const staticFiles = [
      'index.html',
      'confidentialite/',
      'experience-graph/',
      'css/',
      'js/',
      'images/'
    ];

    for (const file of staticFiles) {
      const sourcePath = path.join(this.rootDir, file);
      const targetPath = path.join(this.outputDir, file);

      if (await fsExtra.pathExists(sourcePath)) {
        await fsExtra.copy(sourcePath, targetPath);
        console.log(`   ✅ Copied ${file}`);
      } else {
        console.warn(colors.yellow(`   ⚠️  ${file} not found, skipping`));
      }
    }

    // Copy projects with generated HTML
    const projectsSource = path.join(this.rootDir, 'projets');
    const projectsTarget = path.join(this.outputDir, 'projets');

    if (await fsExtra.pathExists(projectsSource)) {
      await fsExtra.copy(projectsSource, projectsTarget);
      console.log('   ✅ Copied projects directory');
    }

    // Copy generated SEO files
    const seoFiles = [
      'sitemap.xml',
      'robots.txt'
    ];

    for (const file of seoFiles) {
      const sourcePath = path.join(this.rootDir, file);
      const targetPath = path.join(this.outputDir, file);

      if (await fsExtra.pathExists(sourcePath)) {
        await fsExtra.copy(sourcePath, targetPath);
        console.log(`   ✅ Copied ${file}`);
      }
    }

    const cnameDomain = (process.env.CNAME_DOMAIN || '').trim();
    if (cnameDomain) {
      await fs.writeFile(path.join(this.outputDir, 'CNAME'), `${cnameDomain}\n`, 'utf-8');
      console.log(`   ✅ Created CNAME for ${cnameDomain}`);
    }

    console.log(colors.green('   ✅ Deployment preparation completed'));
  }

  async validateOutput() {
    console.log(colors.blue('\n🔍 Validating build output...'));

    // Check essential files
    const requiredFiles = [
      'index.html',
      'confidentialite/index.html',
      'css/style.css',
      'js/main.js',
      'projets/index.json'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.outputDir, file);
      if (!await fsExtra.pathExists(filePath)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    // Check if we have project HTML files
    const projectsDir = path.join(this.outputDir, 'projets');
    const projectDirs = await fsExtra.readdir(projectsDir);
    const htmlFiles = [];

    for (const dir of projectDirs) {
      const dirPath = path.join(projectsDir, dir);
      const stat = await fsExtra.stat(dirPath);

      if (stat.isDirectory()) {
        const htmlFile = path.join(dirPath, 'index.html');
        if (await fsExtra.pathExists(htmlFile)) {
          htmlFiles.push(dir);
        }
      }
    }

    console.log(`   ✅ Found ${htmlFiles.length} project HTML files`);

    // Validate JSON structure
    const indexJsonPath = path.join(this.outputDir, 'projets', 'index.json');
    if (await fsExtra.pathExists(indexJsonPath)) {
      try {
        const indexData = await fsExtra.readJson(indexJsonPath);
        const projectCount = Array.isArray(indexData) ? indexData.length :
                            indexData.projects ? indexData.projects.length : 0;
        console.log(`   ✅ Project index contains ${projectCount} projects`);
      } catch (error) {
        throw new Error(`Invalid project index JSON: ${error.message}`);
      }
    }

    // Check sitemap
    const sitemapPath = path.join(this.outputDir, 'sitemap.xml');
    if (await fsExtra.pathExists(sitemapPath)) {
      const sitemap = await fsExtra.readFile(sitemapPath, 'utf-8');
      const urlCount = (sitemap.match(/<loc>/g) || []).length;
      console.log(`   ✅ Sitemap contains ${urlCount} URLs`);
    }

    console.log(colors.green('   ✅ Output validation passed'));
  }

  async printBuildSummary() {
    console.log('\n' + colors.cyan('📊 Production Build Summary:'));

    try {
      // Count files in output directory
      const countFiles = async (dir) => {
        let count = 0;
        const items = await fsExtra.readdir(dir);

        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = await fsExtra.stat(itemPath);

          if (stat.isDirectory()) {
            count += await countFiles(itemPath);
          } else {
            count++;
          }
        }
        return count;
      };

      const totalFiles = await countFiles(this.outputDir);
      const outputSize = await this.getDirectorySize(this.outputDir);

      console.log(`   Total files: ${colors.bold(totalFiles)}`);
      console.log(`   Output size: ${colors.bold(this.formatBytes(outputSize))}`);
      console.log(`   Output directory: ${colors.bold(this.outputDir)}`);

      // Build timing
      console.log(`   Environment: ${colors.bold(process.env.NODE_ENV || 'development')}`);
      console.log(`   Node.js: ${colors.bold(process.version)}`);

    } catch (error) {
      console.warn(colors.yellow('   Could not generate complete summary'));
    }
  }

  async getDirectorySize(dir) {
    let size = 0;
    const items = await fsExtra.readdir(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = await fsExtra.stat(itemPath);

      if (stat.isDirectory()) {
        size += await this.getDirectorySize(itemPath);
      } else {
        size += stat.size;
      }
    }

    return size;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Execute if called directly
if (require.main === module) {
  const builder = new ProductionBuilder();
  builder.build()
    .then(() => builder.printBuildSummary())
    .then(() => {
      console.log(colors.green('\n🎉 Ready for deployment!'));
      process.exit(0);
    })
    .catch(error => {
      console.error(colors.red('\n💥 Build failed:'), error.message);
      process.exit(1);
    });
}

module.exports = ProductionBuilder;
