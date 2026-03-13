/**
 * Markdown Parser & Frontmatter Extractor
 *
 * Core module for processing project markdown files with enhanced frontmatter.
 * Handles validation, auto-generation, and content processing.
 */

const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const markdownIt = require('markdown-it');
const markdownItAttrs = require('markdown-it-attrs');
const slugify = require('slugify');
const { format } = require('date-fns');
const { fr } = require('date-fns/locale');
const { getBaseUrl } = require('./site-url');

class MarkdownParser {
  constructor(options = {}) {
    this.baseUrl = getBaseUrl(options.baseUrl);
    this.defaultLanguage = options.language || 'fr';

    // Initialize markdown processor
    this.md = markdownIt({
      html: true,
      linkify: true,
      typographer: true,
      quotes: '""\'\'',
    })
    .use(markdownItAttrs);

    // Schema for validation
    this.requiredFields = ['title', 'description', 'date'];
    this.optionalFields = [
      'slug', 'excerpt', 'hero_image', 'hero_alt', 'gallery', 'video_url',
      'last_updated', 'status', 'featured', 'categories', 'tags',
      'tech_stack', 'seo_title', 'seo_description', 'canonical_url', 'keywords',
      'og_title', 'og_description', 'og_image', 'og_type', 'twitter_card',
      'twitter_title', 'twitter_description', 'twitter_image', 'schema_type',
      'application_category', 'operating_system', 'programming_language',
      'role', 'github_url', 'documentation_url', 'language', 'alternate_languages'
    ];
  }

  /**
   * Parse a markdown file and extract enhanced metadata
   */
  async parseFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const projectDir = path.dirname(filePath);

      return this.parseContent(content, { projectDir, filePath });
    } catch (error) {
      throw new Error(`Failed to parse file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Parse markdown content string
   */
  parseContent(content, context = {}) {
    const { data: frontmatter, content: markdown, excerpt } = matter(content, {
      excerpt: true,
      excerpt_separator: '<!-- more -->'
    });

    // Validate required fields
    this.validateFrontmatter(frontmatter);

    // Auto-generate missing fields
    const enhancedFrontmatter = this.enhanceFrontmatter(frontmatter, context);

    // Process markdown content
    const html = this.md.render(markdown);

    // Extract additional metadata
    const metadata = this.extractMetadata(markdown, enhancedFrontmatter);

    return {
      frontmatter: enhancedFrontmatter,
      content: markdown,
      html: html,
      excerpt: excerpt || this.generateExcerpt(markdown),
      metadata: metadata,
      stats: this.generateStats(markdown, enhancedFrontmatter)
    };
  }

  /**
   * Validate frontmatter against schema
   */
  validateFrontmatter(frontmatter) {
    const errors = [];

    // Check required fields
    for (const field of this.requiredFields) {
      if (!frontmatter[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate field formats
    if (frontmatter.date && !this.isValidDate(frontmatter.date)) {
      errors.push('Invalid date format. Use YYYY-MM-DD');
    }

    if (frontmatter.status && !['draft', 'published', 'archived'].includes(frontmatter.status)) {
      errors.push('Status must be: draft, published, or archived');
    }

    if (frontmatter.categories && (!Array.isArray(frontmatter.categories) || frontmatter.categories.length === 0)) {
      errors.push('Categories must be a non-empty array');
    }

    if (errors.length > 0) {
      throw new Error(`Frontmatter validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Enhance frontmatter with auto-generated fields
   */
  enhanceFrontmatter(frontmatter, context = {}) {
    const enhanced = { ...frontmatter };

    // Auto-generate slug if not provided
    if (!enhanced.slug) {
      enhanced.slug = slugify(enhanced.title, { lower: true, strict: true });
    }

    // Auto-generate excerpt if not provided
    if (!enhanced.excerpt && enhanced.description) {
      enhanced.excerpt = this.generateExcerpt(enhanced.description);
    }

    // Set default values
    enhanced.last_updated = format(new Date(), 'yyyy-MM-dd');
    enhanced.status = enhanced.status || 'published';
    enhanced.featured = enhanced.featured || false;
    enhanced.priority = enhanced.priority || 5;
    enhanced.language = enhanced.language || this.defaultLanguage;

    // Ensure arrays
    enhanced.categories = enhanced.categories || ['Général'];
    enhanced.tags = enhanced.tags || [];
    enhanced.tech_stack = enhanced.tech_stack || [];
    enhanced.keywords = enhanced.keywords || [];

    // Auto-generate SEO fields
    enhanced.seo_title = enhanced.seo_title || this.generateSEOTitle(enhanced.title);
    enhanced.seo_description = enhanced.seo_description || this.generateSEODescription(enhanced.description);
    enhanced.canonical_url = enhanced.canonical_url || `${this.baseUrl}/projets/${enhanced.slug}`;

    // Auto-generate Open Graph fields
    enhanced.og_title = enhanced.og_title || enhanced.title;
    enhanced.og_description = enhanced.og_description || enhanced.description;
    enhanced.og_type = enhanced.og_type || 'article';
    enhanced.og_image = enhanced.og_image || enhanced.hero_image;

    // Auto-generate Twitter Card fields
    enhanced.twitter_card = enhanced.twitter_card || 'summary_large_image';
    enhanced.twitter_title = enhanced.twitter_title || enhanced.title;
    enhanced.twitter_description = enhanced.twitter_description || enhanced.description;
    enhanced.twitter_image = enhanced.twitter_image || enhanced.hero_image;

    // Auto-generate schema type
    enhanced.schema_type = enhanced.schema_type || this.inferSchemaType(enhanced.categories);

    // Project defaults
    enhanced.team_size = enhanced.team_size || 1;
    enhanced.client = enhanced.client || 'Personnel';
    enhanced.case_study = enhanced.case_study !== undefined ? enhanced.case_study : true;

    // Auto-generate hero alt text if not provided
    if (!enhanced.hero_alt && enhanced.hero_image) {
      enhanced.hero_alt = `Aperçu du projet: ${enhanced.title}`;
    }

    return enhanced;
  }

  /**
   * Extract additional metadata from content
   */
  extractMetadata(markdown, frontmatter) {
    const metadata = {
      headings: this.extractHeadings(markdown),
      links: this.extractLinks(markdown),
      images: this.extractImages(markdown),
      codeBlocks: this.extractCodeBlocks(markdown),
      readingTime: this.estimateReadingTime(markdown)
    };

    return metadata;
  }

  /**
   * Generate project statistics
   */
  generateStats(markdown, frontmatter) {
    return {
      wordCount: this.countWords(markdown),
      characterCount: markdown.length,
      readingTime: this.estimateReadingTime(markdown),
      lastModified: frontmatter.last_updated,
      complexity: this.assessComplexity(frontmatter, markdown)
    };
  }

  // === Utility Methods ===

  isValidDate(date) {
    // Handle both string and Date object formats
    if (date instanceof Date) {
      return !isNaN(date.getTime());
    }

    if (typeof date === 'string') {
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      return regex.test(date) && !isNaN(Date.parse(date));
    }

    return false;
  }

  generateExcerpt(text, maxLength = 120) {
    if (!text) return '';
    const cleaned = text.replace(/[#*`]/g, '').trim();
    return cleaned.length > maxLength
      ? cleaned.substring(0, maxLength - 3) + '...'
      : cleaned;
  }

  generateSEOTitle(title, maxLength = 60) {
    return title.length > maxLength
      ? title.substring(0, maxLength - 3) + '...'
      : title;
  }

  generateSEODescription(description, maxLength = 160) {
    if (!description) return '';
    return description.length > maxLength
      ? description.substring(0, maxLength - 3) + '...'
      : description;
  }

  inferSchemaType(categories) {
    const cats = categories.map(c => c.toLowerCase());

    if (cats.some(c => ['automatisation', 'python', 'n8n', 'ia', 'no-code'].includes(c))) {
      return 'SoftwareApplication';
    }
    if (cats.some(c => ['power-bi', 'sql', 'analyse', 'data'].includes(c))) {
      return 'Dataset';
    }
    if (cats.some(c => ['vibe-coding', 'portfolio'].includes(c))) {
      return 'WebSite';
    }
    return 'CreativeWork';
  }

  extractHeadings(markdown) {
    const headings = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2],
          slug: slugify(match[2], { lower: true, strict: true })
        });
      }
    }

    return headings;
  }

  extractLinks(markdown) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;

    while ((match = linkRegex.exec(markdown)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        isExternal: match[2].startsWith('http')
      });
    }

    return links;
  }

  extractImages(markdown) {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images = [];
    let match;

    while ((match = imageRegex.exec(markdown)) !== null) {
      images.push({
        alt: match[1] || '',
        src: match[2]
      });
    }

    return images;
  }

  extractCodeBlocks(markdown) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    const codeBlocks = [];
    let match;

    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2]
      });
    }

    return codeBlocks;
  }

  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  estimateReadingTime(text) {
    const wordsPerMinute = 200; // Average reading speed in French
    const wordCount = this.countWords(text);
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return minutes;
  }

  assessComplexity(frontmatter, markdown) {
    let score = 1; // Base complexity

    // Factor in categories and tech stack
    score += (frontmatter.categories?.length || 0) * 0.2;
    score += (frontmatter.tech_stack?.length || 0) * 0.3;

    // Factor in content length
    const wordCount = this.countWords(markdown);
    if (wordCount > 2000) score += 2;
    else if (wordCount > 1000) score += 1;

    // Factor in code blocks
    const codeBlocks = this.extractCodeBlocks(markdown);
    score += codeBlocks.length * 0.5;

    // Factor in external links
    const links = this.extractLinks(markdown);
    const externalLinks = links.filter(l => l.isExternal);
    score += externalLinks.length * 0.1;

    return Math.min(Math.ceil(score), 10); // Cap at 10
  }
}

module.exports = MarkdownParser;