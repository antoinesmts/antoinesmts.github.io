const fs = require('fs-extra');
const path = require('path');
const markdownIt = require('markdown-it');
const markdownItFrontMatter = require('markdown-it-front-matter');

// Configuration
const projectsDir = path.join(__dirname, '../../projets');
const outputDir = path.join(__dirname, '../../_site');
const templateDir = path.join(__dirname, '../../templates');

// Créer le répertoire de sortie s'il n'existe pas
fs.ensureDirSync(outputDir);
fs.ensureDirSync(path.join(outputDir, 'projets'));
fs.ensureDirSync(path.join(outputDir, 'experience-graph'));

// Copier les fichiers statiques
fs.copySync(path.join(__dirname, '../../index.html'), path.join(outputDir, 'index.html'));

// Copier les dossiers CSS et JS
if (fs.existsSync(path.join(__dirname, '../../css'))) {
  fs.ensureDirSync(path.join(outputDir, 'css'));
  fs.copySync(path.join(__dirname, '../../css'), path.join(outputDir, 'css'));
  console.log('Dossier CSS copié avec succès!');
}

if (fs.existsSync(path.join(__dirname, '../../js'))) {
  fs.ensureDirSync(path.join(outputDir, 'js'));
  fs.copySync(path.join(__dirname, '../../js'), path.join(outputDir, 'js'));
  console.log('Dossier JS copié avec succès!');
}

// Copier le dossier images s'il existe
if (fs.existsSync(path.join(__dirname, '../../images'))) {
  fs.ensureDirSync(path.join(outputDir, 'images'));
  fs.copySync(path.join(__dirname, '../../images'), path.join(outputDir, 'images'));
  console.log('Dossier images copié avec succès!');
}

if (fs.existsSync(path.join(__dirname, '../../confidentialite'))) {
  fs.ensureDirSync(path.join(outputDir, 'confidentialite'));
  fs.copySync(path.join(__dirname, '../../confidentialite'), path.join(outputDir, 'confidentialite'));
  console.log('Dossier confidentialite copié avec succès!');
}

if (fs.existsSync(path.join(__dirname, '../../experience-graph'))) {
  fs.ensureDirSync(path.join(outputDir, 'experience-graph'));
  fs.copySync(path.join(__dirname, '../../experience-graph'), path.join(outputDir, 'experience-graph'));
  console.log('Dossier experience-graph copié avec succès!');
}

// Initialiser le parser Markdown
let frontMatterData = {};
const md = markdownIt({
  html: true,
  linkify: true,
  typographer: true
});

md.use(markdownItFrontMatter, function(fm) {
  try {
    // Amélioration du traitement du front matter pour éviter les erreurs de parsing
    let processedFm = fm
      .replace(/---/g, '') // Supprimer les délimiteurs
      .trim() // Supprimer les espaces en début et fin
      .split('\n') // Diviser par lignes
      .filter(line => line.trim() !== '') // Supprimer les lignes vides
      .map(line => {
        // Traiter chaque ligne pour la rendre compatible JSON
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) return null; // Ignorer les lignes sans deux-points
        
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        
        // Traitement spécial pour les tableaux
        if (value.startsWith('[') && value.endsWith(']')) {
          // Traiter les éléments du tableau
          const arrayItems = value.slice(1, -1).split(',').map(item => {
            item = item.trim();
            // Si l'élément n'est pas déjà entre guillemets, l'entourer
            if (!item.startsWith('"') && !item.startsWith('\'')) {
              item = '"' + item.replace(/"/g, '\\"') + '"';
            }
            return item;
          });
          value = '[' + arrayItems.join(', ') + ']';
        } else {
          // Échapper les guillemets dans les valeurs non-tableaux
          value = value.replace(/"/g, '\\"');
          
          // Ajouter des guillemets aux valeurs si nécessaire
          if (!value.startsWith('"') && !value.startsWith('\'')) {
            value = '"' + value + '"';
          }
        }
        
        return '"' + key + '": ' + value;
      })
      .filter(line => line !== null) // Filtrer les lignes invalides
      .join(',\n'); // Rejoindre avec virgules et sauts de ligne
    
    // Déboguer le JSON avant parsing
    const jsonStr = '{' + processedFm + '}';
    console.log('JSON à parser:', jsonStr);
    
    frontMatterData = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Erreur lors du parsing du front matter:', e);
    console.error('Front matter problématique:', fm);
    
    // Fallback: utiliser une méthode plus simple mais moins précise
    try {
      const simpleData = {};
      fm.replace(/---/g, '')
        .trim()
        .split('\n')
        .filter(line => line.trim() !== '')
        .forEach(line => {
          const colonIndex = line.indexOf(':');
          if (colonIndex !== -1) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();
            
            // Traitement basique pour les tableaux
            if (value.startsWith('[') && value.endsWith(']')) {
              value = value.slice(1, -1).split(',').map(item => item.trim());
            }
            
            simpleData[key] = value;
          }
        });
      
      frontMatterData = simpleData;
      console.log('Utilisation de la méthode de fallback pour le front matter');
    } catch (fallbackError) {
      console.error('Échec du fallback pour le front matter:', fallbackError);
      frontMatterData = {};
    }
  }
});

// Lire le template de projet
let projectTemplate = '';
try {
  projectTemplate = fs.readFileSync(path.join(templateDir, 'project.html'), 'utf8');
} catch (e) {
  // Si le template n'existe pas, créer un template par défaut
  projectTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - Mon Portfolio</title>
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <header>
        <div class="container">
            <nav>
                <div class="logo">Mon Portfolio</div>
                <ul class="nav-links">
                    <li><a href="../index.html">Accueil</a></li>
                    <li><a href="../index.html#projets">Projets</a></li>
                    <li><a href="../index.html#a-propos">À propos</a></li>
                    <li><a href="../index.html#contact">Contact</a></li>
                </ul>
                <div class="burger">
                    <div class="line1"></div>
                    <div class="line2"></div>
                    <div class="line3"></div>
                </div>
            </nav>
        </div>
    </header>

    <section class="project-detail">
        <div class="container">
            <div class="project-header">
                <h1>{{title}}</h1>
                <div class="project-meta">
                    <div class="project-date">{{date}}</div>
                    <div class="project-categories">{{categories}}</div>
                </div>
            </div>
            <div class="project-content">
                {{content}}
            </div>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; 2023 Mon Portfolio. Tous droits réservés.</p>
        </div>
    </footer>

    <script src="../js/main.js"></script>
</body>
</html>`;
  
  // Sauvegarder le template par défaut
  fs.ensureDirSync(templateDir);
  fs.writeFileSync(path.join(templateDir, 'project.html'), projectTemplate, 'utf8');
}

// Traiter les fichiers Markdown des projets
const projectFiles = fs.readdirSync(projectsDir).filter(file => file.endsWith('.md'));

projectFiles.forEach(file => {
  const filePath = path.join(projectsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Réinitialiser les données de front matter
  frontMatterData = {};
  
  // Convertir le Markdown en HTML
  const htmlContent = md.render(content);
  
  // Créer la page HTML à partir du template
  let projectHtml = projectTemplate;
  projectHtml = projectHtml.replace('{{title}}', frontMatterData.title || 'Projet');
  projectHtml = projectHtml.replace('{{title}}', frontMatterData.title || 'Projet'); // Pour le titre dans la balise title
  projectHtml = projectHtml.replace('{{date}}', frontMatterData.date || '');
  
  // Formater les catégories
  let categoriesHtml = '';
  if (frontMatterData.categories && Array.isArray(frontMatterData.categories)) {
    categoriesHtml = frontMatterData.categories.map(cat => 
      `<span class="project-category-tag tag-${cat.toLowerCase()}">${cat}</span>`
    ).join('');
  }
  projectHtml = projectHtml.replace('{{categories}}', categoriesHtml);
  
  // Insérer le contenu HTML
  projectHtml = projectHtml.replace('{{content}}', htmlContent);
  
  // Créer un dossier pour chaque projet et y mettre un fichier index.html
  const projectName = file.replace('.md', '');
  const projectDir = path.join(outputDir, 'projets', projectName);
  
  // Créer le dossier du projet s'il n'existe pas
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  
  // Écrire le fichier index.html dans le dossier du projet
  const outputFilePath = path.join(projectDir, 'index.html');
  fs.writeFileSync(outputFilePath, projectHtml, 'utf8');
  
  console.log(`Projet généré: ${outputFilePath}`);
});

// Générer le fichier JSON des projets pour la page d'accueil
const projectsJsonPath = path.join(projectsDir, 'index.json');
if (fs.existsSync(projectsJsonPath)) {
  // Lire le fichier JSON existant
  const projectsJson = fs.readFileSync(projectsJsonPath, 'utf8');
  let projectsData = JSON.parse(projectsJson);
  
  // Corriger les URLs pour qu'elles pointent vers les dossiers de projet
  projectsData = projectsData.map(project => {
    // Corriger l'URL pour qu'elle pointe vers le dossier du projet
    if (project.url) {
      const urlParts = project.url.split('/');
      const filename = urlParts[urlParts.length - 1];
      // Enlever toute extension et s'assurer que l'URL pointe vers le dossier du projet
      project.url = filename.replace(/\.(md|html)$/, '');
    }
    
    // Corriger le chemin de l'image si nécessaire
    if (project.image && !project.image.startsWith('../')) {
      project.image = '../' + project.image;
    }
    
    // Corriger l'extension de l'image si elle est incorrecte
    if (project.image && project.image.endsWith('.jpg')) {
      project.image = project.image.replace('.jpg', '.svg');
    }
    
    return project;
  });
  
  // Écrire le fichier JSON corrigé
  fs.writeFileSync(
    path.join(outputDir, 'projets', 'index.json'), 
    JSON.stringify(projectsData, null, 2), 
    'utf8'
  );
} else {
  // Générer le fichier JSON à partir des fichiers Markdown
  const projectsData = [];
  
  projectFiles.forEach(file => {
    const filePath = path.join(projectsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Réinitialiser les données de front matter
    frontMatterData = {};
    
    // Analyser le front matter
    md.render(content);
    
    if (frontMatterData.title) {
      // Corriger le chemin de l'image si nécessaire
      let imagePath = frontMatterData.image || '';
      if (imagePath && !imagePath.startsWith('../')) {
        imagePath = '../' + imagePath;
      }
      
      projectsData.push({
        title: frontMatterData.title,
        description: frontMatterData.description || '',
        image: imagePath,
        categories: frontMatterData.categories || [],
        url: file.replace('.md', '') // Enlever l'extension pour pointer vers le dossier du projet
      });
    }
  });
  
  fs.writeFileSync(
    path.join(outputDir, 'projets', 'index.json'), 
    JSON.stringify(projectsData, null, 2), 
    'utf8'
  );
}

console.log('Site généré avec succès!');
