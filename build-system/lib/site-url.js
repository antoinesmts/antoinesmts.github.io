const DEFAULT_BASE_URL = 'https://antoinesmeets.com';

function getDefaultGitHubPagesUrl() {
  const repository = process.env.GITHUB_REPOSITORY || '';
  const [owner, repo] = repository.split('/');

  if (!owner || !repo) {
    return null;
  }

  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return `https://${owner}.github.io`;
  }

  return `https://${owner}.github.io/${repo}`;
}

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function getBaseUrl(explicitBaseUrl) {
  const resolvedUrl = explicitBaseUrl
    || process.env.BASE_URL
    || process.env.SITE_URL
    || getDefaultGitHubPagesUrl()
    || DEFAULT_BASE_URL;

  return normalizeBaseUrl(resolvedUrl);
}

module.exports = {
  DEFAULT_BASE_URL,
  getBaseUrl,
  getDefaultGitHubPagesUrl,
  normalizeBaseUrl
};