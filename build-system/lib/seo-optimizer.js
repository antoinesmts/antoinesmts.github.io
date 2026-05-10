/**
 * SEO Optimizer
 *
 * Generates structured data, sitemaps, meta tags, and other SEO features
 * for improved search engine visibility and social media sharing.
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { format } = require('date-fns');
const { getBaseUrl } = require('./site-url');

class SEOOptimizer {
  constructor(options = {}) {
    this.baseUrl = getBaseUrl(options.baseUrl);
    this.outputDir = options.outputDir || path.join(__dirname, '../../');
    this.language = options.language || 'fr';

    this.siteMetadata = {
      name: 'Antoine Smeets - Portfolio',
      description: 'Portfolio d\'Antoine Smeets - Développeur spécialisé en valorisation de données, automatisation et solutions no-code',
      author: 'Antoine Smeets',
      keywords: ['développeur', 'data', 'automatisation', 'SQL', 'Power BI', 'Python', 'n8n', 'no-code', 'IA'],
      social: {
        linkedin: 'https://www.linkedin.com/in/antoinesmeets/',
        github: 'https://github.com/antoinesmts'
      }
    };
  }

  /**
   * Generate complete SEO package for the site
   */
  async generateSEOPackage(projectsData) {
    console.log(chalk.blue('🚀 Generating SEO optimization package...'));

    const results = {};

    try {
      // Generate sitemap
      results.sitemap = await this.generateSitemap(projectsData);

      // Generate robots.txt
      results.robots = await this.generateRobotsTxt();

      // Generate structured data for main site
      results.structuredData = await this.generateMainSiteStructuredData(projectsData);

      // Generate Open Graph images metadata
      results.socialMedia = await this.generateSocialMediaOptimization(projectsData);

      // Generate SEO report
      results.report = await this.generateSEOReport(projectsData);

      console.log(chalk.green('✅ SEO optimization package generated successfully'));

      return results;

    } catch (error) {
      console.error(chalk.red('❌ SEO optimization failed:'), error.message);
      throw error;
    }
  }

  /**
   * Generate XML sitemap for all pages
   */
  async generateSitemap(projectsData) {
    console.log(chalk.blue('🗺️  Generating XML sitemap...'));

    const urls = [];

    // Add main site pages
    urls.push({
      loc: this.baseUrl,
      lastmod: format(new Date(), 'yyyy-MM-dd'),
      changefreq: 'weekly',
      priority: '1.0'
    });

    urls.push({
      loc: `${this.baseUrl}/#projets`,
      lastmod: format(new Date(), 'yyyy-MM-dd'),
      changefreq: 'weekly',
      priority: '0.9'
    });

    urls.push({
      loc: `${this.baseUrl}/#a-propos`,
      lastmod: format(new Date(), 'yyyy-MM-dd'),
      changefreq: 'monthly',
      priority: '0.7'
    });

    urls.push({
      loc: `${this.baseUrl}/#contact`,
      lastmod: format(new Date(), 'yyyy-MM-dd'),
      changefreq: 'monthly',
      priority: '0.6'
    });

    urls.push({
      loc: `${this.baseUrl}/confidentialite/`,
      lastmod: format(new Date(), 'yyyy-MM-dd'),
      changefreq: 'yearly',
      priority: '0.4'
    });

    // Add project pages
    projectsData
      .filter(project => project.status === 'published')
      .forEach(project => {
        urls.push({
          loc: `${this.baseUrl}/projets/${project.slug || project.url}`,
          lastmod: project.last_updated || project.date,
          changefreq: project.featured ? 'monthly' : 'yearly',
          priority: project.featured ? '0.8' : '0.6',
          image: project.hero_image ? `${this.baseUrl}/${project.hero_image.replace('../', '')}` : null
        });
      });

    // Generate XML
    const xml = this.generateSitemapXML(urls);

    // Write sitemap
    const sitemapPath = path.join(this.outputDir, 'sitemap.xml');
    await fs.writeFile(sitemapPath, xml, 'utf-8');

    console.log(chalk.green(`✅ Sitemap generated with ${urls.length} URLs: ${sitemapPath}`));

    return {
      path: sitemapPath,
      urls: urls.length,
      lastGenerated: new Date().toISOString()
    };
  }

  /**
   * Generate sitemap XML content
   */
  generateSitemapXML(urls) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

    // Add image namespace if any URLs have images
    const hasImages = urls.some(url => url.image);
    if (hasImages) {
      xml += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
    }

    xml += '>\n';

    urls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(url.loc)}</loc>\n`;
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      xml += `    <priority>${url.priority}</priority>\n`;

      if (url.image) {
        xml += '    <image:image>\n';
        xml += `      <image:loc>${this.escapeXml(url.image)}</image:loc>\n`;
        xml += '    </image:image>\n';
      }

      xml += '  </url>\n';
    });

    xml += '</urlset>';

    return xml;
  }

  /**
   * Generate robots.txt file
   */
  async generateRobotsTxt() {
    console.log(chalk.blue('🤖 Generating robots.txt...'));

    const robotsContent = [
      'User-agent: *',
      'Allow: /',
      '',
      '# Sitemaps',
      `Sitemap: ${this.baseUrl}/sitemap.xml`,
      '',
      '# Disallow admin/build directories if they exist',
      'Disallow: /build-system/',
      'Disallow: /backup/',
      '',
      '# Allow access to CSS, JS, and image files',
      'Allow: /css/',
      'Allow: /js/',
      'Allow: /images/',
      '',
      `# Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`
    ].join('\n');

    const robotsPath = path.join(this.outputDir, 'robots.txt');
    await fs.writeFile(robotsPath, robotsContent, 'utf-8');

    console.log(chalk.green(`✅ robots.txt generated: ${robotsPath}`));

    return {
      path: robotsPath,
      content: robotsContent
    };
  }

  /**
   * Generate structured data for main site
   */
  async generateMainSiteStructuredData(projectsData) {
    console.log(chalk.blue('📋 Generating structured data...'));

    // Portfolio/Person structured data
    const personData = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      'name': 'Antoine Smeets',
      'url': this.baseUrl,
      'sameAs': [
        this.siteMetadata.social.linkedin,
        this.siteMetadata.social.github
      ],
      'jobTitle': 'Développeur spécialisé en valorisation de données',
      'worksFor': {
        '@type': 'Organization',
        'name': 'Freelance'
      },
      'knowsAbout': [
        'Automatisation',
        'Analyse de données',
        'Python',
        'SQL',
        'Power BI',
        'n8n',
        'Intelligence Artificielle'
      ],
      'mainEntityOfPage': {
        '@type': 'WebSite',
        '@id': this.baseUrl
      }
    };

    // Website structured data
    const websiteData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': this.baseUrl,
      'url': this.baseUrl,
      'name': this.siteMetadata.name,
      'description': this.siteMetadata.description,
      'author': {
        '@type': 'Person',
        'name': 'Antoine Smeets'
      },
      'inLanguage': this.language,
      'potentialAction': {
        '@type': 'SearchAction',
        'target': {
          '@type': 'EntryPoint',
          'urlTemplate': `${this.baseUrl}/#projets?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };

    // Portfolio collection structured data
    const portfolioData = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': 'Portfolio Projects - Antoine Smeets',
      'description': 'Collection of development projects by Antoine Smeets',
      'url': `${this.baseUrl}/#projets`,
      'author': {
        '@type': 'Person',
        'name': 'Antoine Smeets'
      },
      'numberOfItems': projectsData.filter(p => p.status === 'published').length,
      'itemListElement': projectsData
        .filter(p => p.status === 'published')
        .slice(0, 10) // Limit to top 10 projects
        .map((project, index) => ({
          '@type': 'ListItem',
          'position': index + 1,
          'url': `${this.baseUrl}/projets/${project.slug || project.url}`,
          'name': project.title,
          'description': project.description
        }))
    };

    const structuredDataPath = path.join(this.outputDir, 'structured-data.json');
    const allStructuredData = {
      person: personData,
      website: websiteData,
      portfolio: portfolioData,
      generated: new Date().toISOString()
    };

    await fs.writeJson(structuredDataPath, allStructuredData, { spaces: 2 });

    console.log(chalk.green(`✅ Structured data generated: ${structuredDataPath}`));

    return allStructuredData;
  }

  /**
   * Generate social media optimization data
   */
  async generateSocialMediaOptimization(projectsData) {
    console.log(chalk.blue('📱 Generating social media optimization...'));

    const socialData = {
      mainSite: {
        og: {
          title: this.siteMetadata.name,
          description: this.siteMetadata.description,
          type: 'website',
          url: this.baseUrl,
          image: `${this.baseUrl}/images/og-default.png`, // Should exist
          locale: this.language === 'fr' ? 'fr_FR' : 'en_US'
        },
        twitter: {
          card: 'summary_large_image',
          site: '@antoinesmts', // If Twitter account exists
          title: this.siteMetadata.name,
          description: this.siteMetadata.description,
          image: `${this.baseUrl}/images/twitter-default.png`
        }
      },

      projects: projectsData
        .filter(p => p.status === 'published')
        .map(project => ({
          slug: project.slug || project.url,
          og: {
            title: project.og_title || project.title,
            description: project.og_description || project.description,
            type: 'article',
            url: `${this.baseUrl}/projets/${project.slug || project.url}`,
            image: project.og_image ? `${this.baseUrl}/${project.og_image.replace('../', '')}` : null,
            article: {
              published_time: project.date,
              modified_time: project.last_updated,
              author: 'Antoine Smeets',
              section: project.categories?.[0],
              tags: [...(project.categories || []), ...(project.tags || [])]
            }
          },
          twitter: {
            card: project.twitter_card || 'summary_large_image',
            title: project.twitter_title || project.title,
            description: project.twitter_description || project.description,
            image: project.twitter_image ? `${this.baseUrl}/${project.twitter_image.replace('../', '')}` : null
          }
        }))
    };

    const socialDataPath = path.join(this.outputDir, 'social-media-data.json');
    await fs.writeJson(socialDataPath, socialData, { spaces: 2 });

    console.log(chalk.green(`✅ Social media optimization data generated: ${socialDataPath}`));

    return socialData;
  }

  /**
   * Generate comprehensive SEO report
   */
  async generateSEOReport(projectsData) {
    console.log(chalk.blue('📊 Generating SEO report...'));

    const publishedProjects = projectsData.filter(p => p.status === 'published');

    const report = {
      generated: new Date().toISOString(),
      summary: {
        totalProjects: projectsData.length,
        publishedProjects: publishedProjects.length,
        featuredProjects: publishedProjects.filter(p => p.featured).length,
        averageReadingTime: this.calculateAverage(publishedProjects, 'reading_time'),
        averageComplexity: this.calculateAverage(publishedProjects, 'complexity')
      },

      seo: {
        sitemap: {
          generated: true,
          urls: publishedProjects.length + 4, // projects + main pages
          lastUpdated: format(new Date(), 'yyyy-MM-dd')
        },
        structuredData: {
          implemented: true,
          schemas: ['Person', 'WebSite', 'ItemList', 'CreativeWork/SoftwareApplication']
        },
        socialMedia: {
          openGraph: true,
          twitterCards: true,
          linkedInOptimized: true
        }
      },

      contentAnalysis: {
        missingDescriptions: publishedProjects.filter(p => !p.description || p.description.length < 50).length,
        missingImages: publishedProjects.filter(p => !p.hero_image).length,
        longTitles: publishedProjects.filter(p => p.title && p.title.length > 60).length,
        shortDescriptions: publishedProjects.filter(p => p.description && p.description.length < 120).length,
        categoriesDistribution: this.getDistribution(publishedProjects, 'categories'),
        tagsUsage: this.getDistribution(publishedProjects, 'tags')
      },

      recommendations: this.generateSEORecommendations(publishedProjects)
    };

    const reportPath = path.join(this.outputDir, 'seo-report.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });

    console.log(chalk.green(`📋 SEO report generated: ${reportPath}`));

    // Print summary to console
    this.printSEOSummary(report);

    return report;
  }

  /**
   * Generate SEO recommendations
   */
  generateSEORecommendations(projects) {
    const recommendations = [];

    // Check for missing meta descriptions
    const missingDescriptions = projects.filter(p => !p.seo_description || p.seo_description.length < 120);
    if (missingDescriptions.length > 0) {
      recommendations.push({
        type: 'meta_description',
        priority: 'high',
        count: missingDescriptions.length,
        message: `${missingDescriptions.length} projects need better meta descriptions (120-160 characters)`
      });
    }

    // Check for missing images
    const missingImages = projects.filter(p => !p.hero_image);
    if (missingImages.length > 0) {
      recommendations.push({
        type: 'images',
        priority: 'medium',
        count: missingImages.length,
        message: `${missingImages.length} projects are missing hero images`
      });
    }

    // Check for long titles
    const longTitles = projects.filter(p => p.title && p.title.length > 60);
    if (longTitles.length > 0) {
      recommendations.push({
        type: 'title_length',
        priority: 'medium',
        count: longTitles.length,
        message: `${longTitles.length} projects have titles longer than 60 characters`
      });
    }

    // Check for projects without GitHub links
    const missingGitHub = projects.filter(p => !p.github_url);
    if (missingGitHub.length > 0) {
      recommendations.push({
        type: 'github_links',
        priority: 'low',
        count: missingGitHub.length,
        message: `${missingGitHub.length} projects could benefit from GitHub links`
      });
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  calculateAverage(items, field) {
    const values = items.map(item => item[field]).filter(val => val && !isNaN(val));
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  }

  getDistribution(items, field) {
    const distribution = {};
    items.forEach(item => {
      const values = item[field] || [];
      values.forEach(value => {
        distribution[value] = (distribution[value] || 0) + 1;
      });
    });
    return distribution;
  }

  escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  /**
   * Print SEO summary to console
   */
  printSEOSummary(report) {
    console.log('\n' + chalk.cyan('🚀 SEO Optimization Summary:'));
    console.log(`   Published projects: ${chalk.bold(report.summary.publishedProjects)}`);
    console.log(`   Featured projects: ${chalk.bold(report.summary.featuredProjects)}`);
    console.log(`   Sitemap URLs: ${chalk.bold(report.seo.sitemap.urls)}`);

    if (report.recommendations.length > 0) {
      console.log('\n' + chalk.yellow('💡 SEO Recommendations:'));
      report.recommendations.forEach(rec => {
        const priority = rec.priority === 'high' ? chalk.red('[HIGH]') :
                        rec.priority === 'medium' ? chalk.yellow('[MEDIUM]') :
                        chalk.blue('[LOW]');
        console.log(`   ${priority} ${rec.message}`);
      });
    } else {
      console.log(`   ${chalk.green('✅ No immediate SEO issues detected')}`);
    }
  }
}

module.exports = SEOOptimizer;
