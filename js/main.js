document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements for better performance
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const body = document.body;
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links li');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectsContainer = document.getElementById('projects-container');
    
    // Check for saved theme preference or default to 'light' mode
    const currentTheme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    if (currentTheme === 'dark') {
        body.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fas fa-moon';
    }
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update icon
        themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    });

    // Mobile navigation

    burger.addEventListener('click', () => {
        nav.classList.toggle('nav-active');
        navLinks.forEach((link, index) => {
            if (link.style.animation) {
                link.style.animation = '';
            } else {
                link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
            }
        });
        burger.classList.toggle('toggle');
    });

    // Chargement des projets depuis les fichiers Markdown
    loadProjects();

    // Filtrage des projets
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Retirer la classe active de tous les boutons et mettre à jour ARIA
            filterBtns.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            // Ajouter la classe active au bouton cliqué et mettre à jour ARIA
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            
            const filter = btn.getAttribute('data-filter');
            filterProjects(filter);
        });
    });
});

const SITE_BASE_PATH = getSiteBasePath();

function getSiteBasePath() {
    const script = document.querySelector('script[src$="js/main.js"]');

    if (!script) {
        return '/';
    }

    const scriptUrl = new URL(script.getAttribute('src'), window.location.href);
    const basePath = scriptUrl.pathname.replace(/js\/main\.js$/, '');

    return basePath.endsWith('/') ? basePath : `${basePath}/`;
}

function buildSiteUrl(relativePath = '') {
    const normalizedPath = relativePath
        .replace(/^\.?\//, '')
        .replace(/^(\.\.\/)+/, '');

    return `${SITE_BASE_PATH}${normalizedPath}`.replace(/\/+/g, '/');
}

function resolveProjectImagePath(imagePath) {
    if (!imagePath) {
        return buildSiteUrl('images/default-project.jpg');
    }

    if (/^https?:\/\//i.test(imagePath)) {
        return imagePath;
    }

    return buildSiteUrl(imagePath);
}

// Fonction pour charger les projets avec gestion d'erreurs améliorée
async function loadProjects() {
    const projectsContainer = document.getElementById('projects-container');

    try {
        const response = await fetch(buildSiteUrl('projets/index.json'));

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const projects = data.projects || data;

        if (!Array.isArray(projects)) {
            throw new Error('Format de données invalide');
        }

        projectsContainer.innerHTML = '';

        // Filtrer par featured: true et trier par date (plus récent en premier)
        const sortedProjects = projects
            .filter(project => project.status === 'published' && project.featured === true)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedProjects.forEach(project => {
            try {
                const projectCard = createProjectCard(project);
                projectsContainer.appendChild(projectCard);
            } catch (cardError) {
                console.warn('Erreur lors de la création d\'une carte projet:', cardError, project);
            }
        });

    } catch (error) {
        console.error('Erreur lors du chargement des projets:', error);
        projectsContainer.innerHTML = '<div class="error-message">Erreur lors du chargement des projets. Veuillez réessayer plus tard.</div>';
    }
}

// Fonction pour créer une carte de projet
function createProjectCard(project) {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.setAttribute('role', 'article');
    card.setAttribute('aria-labelledby', `project-title-${project.title.replace(/\s+/g, '-').toLowerCase()}`);
    // Conserver les catégories originales avec espaces pour l'affichage
    // et créer une version normalisée pour le filtrage
    const categoriesForFiltering = project.categories.map(cat => cat.replace(/\s+/g, '-')).join(' ');
    card.setAttribute('data-categories', project.categories.join(' '));
    card.setAttribute('data-filter-categories', categoriesForFiltering);
    
    const imageContainer = document.createElement('div');
    imageContainer.className = 'project-image';
    
    const img = document.createElement('img');
    img.src = resolveProjectImagePath(project.image);
    img.alt = project.title;
    img.loading = 'lazy';
    imageContainer.appendChild(img);
    
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'project-tags';
    
    project.categories.forEach(category => {
        const tag = document.createElement('span');
        tag.className = `project-tag tag-${category.toLowerCase()}`;
        tag.textContent = category;
        tagsContainer.appendChild(tag);
    });
    
    imageContainer.appendChild(tagsContainer);
    card.appendChild(imageContainer);
    
    const content = document.createElement('div');
    content.className = 'project-content';
    
    const title = document.createElement('h3');
    title.className = 'project-title';
    title.id = `project-title-${project.title.replace(/\s+/g, '-').toLowerCase()}`;
    title.textContent = project.title;
    content.appendChild(title);
    
    const description = document.createElement('p');
    description.className = 'project-description';
    description.textContent = project.description;
    content.appendChild(description);
    
    const link = document.createElement('a');
    link.href = buildSiteUrl(`projets/${project.url}/`);
    link.className = 'btn primary';
    link.textContent = 'Voir le projet';
    content.appendChild(link);
    
    card.appendChild(content);
    
    return card;
}

// Fonction pour filtrer les projets
function filterProjects(filter) {
    const projects = document.querySelectorAll('.project-card');
    
    projects.forEach(project => {
        if (filter === 'all') {
            project.style.display = 'block';
        } else {
            // Normaliser le filtre (minuscules et remplacer espaces par tirets)
            const filterNormalized = filter.toLowerCase().replace(/\s+/g, '-');
            
            // Récupérer les catégories originales et normalisées
            const categoriesAttr = project.getAttribute('data-categories');
            const filterCategoriesAttr = project.getAttribute('data-filter-categories');
            
            // Vérifier si le filtre correspond à une catégorie (original ou normalisé)
            const hasCategory = categoriesAttr.split(' ').some(category => 
                category.toLowerCase() === filter.toLowerCase()
            ) || filterCategoriesAttr.split(' ').some(category => 
                category.toLowerCase() === filterNormalized
            );
            
            if (hasCategory) {
                project.style.display = 'block';
            } else {
                project.style.display = 'none';
            }
        }
    });
}

// Load related projects on project detail pages
function loadRelatedProjects() {
    const relatedContainer = document.getElementById('related-projects');
    if (!relatedContainer) return;
    
    // Get current project tags from the page
    const currentTags = Array.from(document.querySelectorAll('.project-tag')).map(tag => tag.textContent.trim());
    
    // Load projects data with better error handling
    fetch(buildSiteUrl('projets/index.json'))
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const projects = data.projects || data;
            // Filter projects that share at least one tag with current project
            const relatedProjects = projects.filter(project => {
                return project.tags && project.tags.some(tag => currentTags.includes(tag));
            }).slice(0, 3); // Limit to 3 projects
            
            // Display related projects
            relatedContainer.innerHTML = relatedProjects.map(project => `
                <div class="project-card">
                    <div class="project-image">
                        <img src="${resolveProjectImagePath(project.image)}" alt="${project.title}" loading="lazy">
                    </div>
                    <div class="project-info">
                        <h3>${project.title}</h3>
                        <p class="project-description">${project.description || ''}</p>
                        <div class="project-tags">
                            ${project.tags ? project.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('') : ''}
                        </div>
                        <a href="${buildSiteUrl(`projets/${project.url}/`)}" class="btn btn-primary">Voir le projet</a>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Erreur lors du chargement des projets similaires:', error);
            if (relatedContainer) {
                relatedContainer.innerHTML = '<div class="error-message">Erreur lors du chargement des projets similaires.</div>';
            }
        });
}

// Initialize related projects on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadRelatedProjects);
} else {
    loadRelatedProjects();
}