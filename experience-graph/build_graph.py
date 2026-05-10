from __future__ import annotations

import html
import json
import re
from pathlib import Path

import networkx as nx
from pyvis.network import Network


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data.json"
OUTPUT_PATH = BASE_DIR / "index.html"

LIGHT_NODE_STYLES = {
    "experience": {
        "background": "#4a6cf7",
        "border": "#3557d6",
        "highlight": {"background": "#5c7cff", "border": "#2743b8"},
        "hover": {"background": "#5c7cff", "border": "#2743b8"},
    },
    "project": {
        "background": "#8ea7ff",
        "border": "#4a6cf7",
        "highlight": {"background": "#a9bcff", "border": "#4a6cf7"},
        "hover": {"background": "#a9bcff", "border": "#4a6cf7"},
    },
    "technology": {
        "background": "#eef2ff",
        "border": "#94a3b8",
        "highlight": {"background": "#dbe7ff", "border": "#64748b"},
        "hover": {"background": "#dbe7ff", "border": "#64748b"},
    },
}

DARK_NODE_STYLES = {
    "experience": {
        "background": "#60a5fa",
        "border": "#bfdbfe",
        "highlight": {"background": "#7db7ff", "border": "#dbeafe"},
        "hover": {"background": "#7db7ff", "border": "#dbeafe"},
    },
    "project": {
        "background": "#4b6bdb",
        "border": "#93c5fd",
        "highlight": {"background": "#6384f1", "border": "#bfdbfe"},
        "hover": {"background": "#6384f1", "border": "#bfdbfe"},
    },
    "technology": {
        "background": "#334155",
        "border": "#94a3b8",
        "highlight": {"background": "#3f5168", "border": "#cbd5e1"},
        "hover": {"background": "#3f5168", "border": "#cbd5e1"},
    },
}

NODE_META = {
    "experience": {"shape": "dot", "size": 36},
    "project": {"shape": "box", "size": 28},
    "technology": {"shape": "diamond", "size": 19},
}

LIGHT_EDGE_STYLES = {
    "experience_project": {"color": "rgba(74, 108, 247, 0.46)", "width": 2.6, "dashes": False},
    "technology_project": {"color": "rgba(148, 163, 184, 0.65)", "width": 1.7, "dashes": [6, 8]},
    "default": {"color": "rgba(148, 163, 184, 0.55)", "width": 1.4, "dashes": False},
}

DARK_EDGE_STYLES = {
    "experience_project": {"color": "rgba(96, 165, 250, 0.52)", "width": 2.6, "dashes": False},
    "technology_project": {"color": "rgba(148, 163, 184, 0.78)", "width": 1.7, "dashes": [6, 8]},
    "default": {"color": "rgba(148, 163, 184, 0.6)", "width": 1.4, "dashes": False},
}


def load_data(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)

    declared_technologies = {
        item["id"]: item
        for item in data.get("technologies", [])
    }

    inferred_technology_ids = []
    for project in data.get("projects", []):
        for technology_id in project.get("technologies", []):
            if technology_id not in declared_technologies and technology_id not in inferred_technology_ids:
                inferred_technology_ids.append(technology_id)

    for technology_id in inferred_technology_ids:
        data.setdefault("technologies", []).append({
            "id": technology_id,
            "label": technology_id.replace("-", " ").title(),
        })

    return data


def validate_data(data: dict) -> None:
    required_keys = {"experiences", "technologies", "projects"}
    missing_keys = required_keys - set(data.keys())
    if missing_keys:
        raise ValueError(f"Missing top-level keys: {sorted(missing_keys)}")

    experience_ids = [item["id"] for item in data["experiences"]]
    technology_ids = [item["id"] for item in data["technologies"]]
    project_ids = [item["id"] for item in data["projects"]]

    duplicates = {
        "experiences": sorted({item_id for item_id in experience_ids if experience_ids.count(item_id) > 1}),
        "technologies": sorted({item_id for item_id in technology_ids if technology_ids.count(item_id) > 1}),
        "projects": sorted({item_id for item_id in project_ids if project_ids.count(item_id) > 1}),
    }
    duplicate_groups = {group: ids for group, ids in duplicates.items() if ids}
    if duplicate_groups:
        raise ValueError(f"Duplicate ids found: {duplicate_groups}")

    known_experiences = set(experience_ids)
    known_technologies = set(technology_ids)
    project_errors = []
    for project in data["projects"]:
        if project["experience"] not in known_experiences:
            project_errors.append(f"Project {project['id']} references unknown experience {project['experience']}")
        for technology_id in project.get("technologies", []):
            if technology_id not in known_technologies:
                project_errors.append(f"Project {project['id']} references unknown technology {technology_id}")
    if project_errors:
        raise ValueError("; ".join(project_errors))


def vis_node_id(entity_type: str, entity_id: str) -> str:
    return f"{entity_type}:{entity_id}"


def tooltip_html(entity_type: str, entity: dict) -> str:
    fields = [
        ("Label", entity.get("label")),
        ("Type", entity_type),
        ("Role", entity.get("role")),
        ("Summary", entity.get("summary")),
        ("Impact", entity.get("impact")),
    ]
    rows = "".join(
        f"<div style='margin-bottom:8px;'><strong>{label}:</strong> {html.escape(value)}</div>"
        for label, value in fields
        if value
    )
    return (
        "<div style='font-family:Inter,Segoe UI,sans-serif; max-width: 320px; "
        "padding: 2px 4px; line-height:1.5;'>"
        f"{rows}</div>"
    )


def build_graph(data: dict) -> nx.Graph:
    graph = nx.Graph()

    for experience in data["experiences"]:
        graph.add_node(
            vis_node_id("experience", experience["id"]),
            entity_type="experience",
            entity_id=experience["id"],
            label=experience["label"],
            role=experience.get("role"),
            summary=experience.get("summary"),
        )

    for technology in data["technologies"]:
        graph.add_node(
            vis_node_id("technology", technology["id"]),
            entity_type="technology",
            entity_id=technology["id"],
            label=technology["label"],
        )

    for project in data["projects"]:
        project_node_id = vis_node_id("project", project["id"])
        graph.add_node(
            project_node_id,
            entity_type="project",
            entity_id=project["id"],
            label=project["label"],
            summary=project.get("summary"),
            impact=project.get("impact"),
        )
        graph.add_edge(
            project_node_id,
            vis_node_id("experience", project["experience"]),
            edge_type="experience_project",
        )
        for technology_id in project.get("technologies", []):
            graph.add_edge(
                project_node_id,
                vis_node_id("technology", technology_id),
                edge_type="technology_project",
            )

    return graph


def create_network(graph: nx.Graph) -> Network:
    network = Network(
        height="100%",
        width="100%",
        bgcolor="rgba(0,0,0,0)",
        font_color="#0f172a",
        notebook=False,
        cdn_resources="in_line",
    )

    network.set_options(
        """
        const options = {
          "autoResize": true,
          "interaction": {
            "hover": false,
            "hoverConnectedEdges": false,
            "navigationButtons": false,
            "keyboard": false
          },
          "physics": {
            "enabled": true,
            "stabilization": {
              "enabled": true,
              "iterations": 1000,
              "updateInterval": 50
            },
            "barnesHut": {
              "gravitationalConstant": -5200,
              "centralGravity": 0.22,
              "springLength": 160,
              "springConstant": 0.035,
              "damping": 0.9,
              "avoidOverlap": 0.5
            }
          },
          "layout": {
            "improvedLayout": true,
            "randomSeed": 42
          },
          "nodes": {
            "borderWidth": 2,
            "borderWidthSelected": 3,
            "font": {
              "face": "Inter, Segoe UI, sans-serif",
              "size": 16,
              "strokeWidth": 0
            },
            "shadow": {
              "enabled": true,
              "color": "rgba(15, 23, 42, 0.12)",
              "size": 22,
              "x": 0,
              "y": 10
            }
          },
          "edges": {
            "color": {
              "inherit": false
            },
            "smooth": {
              "enabled": true,
              "type": "cubicBezier",
              "roundness": 0.28
            },
            "selectionWidth": 2.2,
            "hoverWidth": 1.4
          }
        }
        """
    )

    for node_id, attrs in graph.nodes(data=True):
        entity_type = attrs["entity_type"]
        network.add_node(
            node_id,
            label=attrs.get("label", node_id),
            group=entity_type,
            shape=NODE_META[entity_type]["shape"],
            size=NODE_META[entity_type]["size"],
            color=LIGHT_NODE_STYLES[entity_type],
        )

    for source, target, attrs in graph.edges(data=True):
        edge_type = attrs.get("edge_type", "default")
        style = LIGHT_EDGE_STYLES.get(edge_type, LIGHT_EDGE_STYLES["default"])
        network.add_edge(
            source,
            target,
            color=style["color"],
            width=style["width"],
            dashes=style.get("dashes", False),
        )

    return network


def extract_tag_content(markup: str, tag_name: str) -> str:
    match = re.search(rf"<{tag_name}[^>]*>(.*?)</{tag_name}>", markup, flags=re.DOTALL | re.IGNORECASE)
    if not match:
        raise ValueError(f"Could not extract <{tag_name}> from generated HTML.")
    return match.group(1).strip()


def sanitize_generated_html(markup: str) -> str:
    sanitized = markup
    sanitized = re.sub(r"<link\b[^>]*bootstrap[^>]*>\s*", "", sanitized, flags=re.DOTALL | re.IGNORECASE)
    sanitized = re.sub(r"<script\b[^>]*bootstrap[^>]*>\s*</script>\s*", "", sanitized, flags=re.DOTALL | re.IGNORECASE)
    sanitized = re.sub(r"<center>\s*<h1>\s*</h1>\s*</center>\s*", "", sanitized, flags=re.DOTALL | re.IGNORECASE)
    sanitized = re.sub(r"<style type=\"text/css\">\s*#mynetwork\s*\{.*?\}\s*</style>\s*", "", sanitized, flags=re.DOTALL | re.IGNORECASE)
    sanitized = re.sub(r"<!--\s*<link rel=\"stylesheet\" href=\"\.\./node_modules/vis/dist/vis\.min\.css\".*?-->\s*", "", sanitized, flags=re.DOTALL | re.IGNORECASE)
    return sanitized


def sanitize_head_content(head_content: str) -> str:
    sanitized = head_content
    sanitized = re.sub(r'<meta charset="[^"]*">\s*', "", sanitized, flags=re.IGNORECASE)
    return sanitized.strip()


def sanitize_body_content(body_content: str) -> str:
    sanitized = body_content
    sanitized = re.sub(r"<center>\s*<h1>\s*</h1>\s*</center>\s*", "", sanitized, flags=re.DOTALL | re.IGNORECASE)
    sanitized = re.sub(r"<style type=\"text/css\">\s*#mynetwork\s*\{.*?\}\s*</style>\s*", "", sanitized, flags=re.DOTALL | re.IGNORECASE)
    sanitized = re.sub(r'<div class="card"\s+style="width:\s*100%">', '<div class="experience-network-inner">', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r'<div id="mynetwork"\s+class="card-body"></div>', '<div id="mynetwork" class="experience-network-canvas"></div>', sanitized, flags=re.IGNORECASE)
    sanitized = re.sub(r"</div>\s*</div>\s*<script type=\"text/javascript\">", '</div>\n\n        <script type="text/javascript">', sanitized, count=1, flags=re.IGNORECASE)
    return sanitized.strip()


def compose_page(network_html: str, data: dict) -> str:
    cleaned_network_html = sanitize_generated_html(network_html)
    head_content = sanitize_head_content(extract_tag_content(cleaned_network_html, "head"))
    body_content = sanitize_body_content(extract_tag_content(cleaned_network_html, "body"))

    node_type_by_id = {}
    node_entity_id_by_id = {}
    for experience in data["experiences"]:
        node_id = vis_node_id("experience", experience["id"])
        node_type_by_id[node_id] = "experience"
        node_entity_id_by_id[node_id] = experience["id"]
    for technology in data["technologies"]:
        node_id = vis_node_id("technology", technology["id"])
        node_type_by_id[node_id] = "technology"
        node_entity_id_by_id[node_id] = technology["id"]
    for project in data["projects"]:
        node_id = vis_node_id("project", project["id"])
        node_type_by_id[node_id] = "project"
        node_entity_id_by_id[node_id] = project["id"]

    details_default_html = """
      <div class="experience-details-empty">
        <span class="experience-details-kicker">Aucune sélection</span>
        <h2>Sélectionnez un élément du graphe</h2>
        <p>
          Cliquez sur une expérience, une technologie ou un projet pour afficher ici ses liens,
          son contexte et les détails associés.
        </p>
      </div>
    """.strip()

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Graphe interactif d'expériences, projets et technologies d'Antoine Smeets.">
  <meta name="keywords" content="graphe d'expérience, portfolio, data, automatisation, python, n8n, power bi">
  <meta name="author" content="Antoine Smeets">
  <meta property="og:title" content="Graphe d'expérience - Antoine Smeets">
  <meta property="og:description" content="Une carte interactive reliant expériences, projets et technologies.">
  <meta property="og:type" content="website">
  <title>Graphe d'expérience | Antoine Smeets</title>
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="shortcut icon" type="image/jpg" href="../images/favicon.ico"/>
  {head_content}
  <style>
    .experience-graph-page {{
      background-color: var(--background-color);
    }}

    .experience-graph-main {{
      margin-top: 110px;
      padding: 40px 0 100px;
    }}

    .experience-panel {{
      background-color: var(--white);
      border-radius: var(--border-radius);
      box-shadow: var(--box-shadow);
    }}

    .experience-layout {{
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.9fr);
      gap: 30px;
      align-items: start;
    }}

    .experience-title-wrap {{
      margin-bottom: 32px;
    }}

    .experience-title-wrap .section-title {{
      margin-bottom: 0;
    }}

    .experience-legend {{
      display: flex;
      align-items: center;
      gap: 18px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 18px;
      color: var(--secondary-color);
      font-size: 0.95rem;
    }}

    .experience-legend-item {{
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }}

    .experience-legend-swatch {{
      width: 14px;
      height: 14px;
      flex: 0 0 auto;
      border: 2px solid transparent;
      box-shadow: 0 3px 10px rgba(15, 23, 42, 0.12);
    }}

    .experience-legend-swatch.experience {{
      border-radius: 999px;
      background: #4a6cf7;
      border-color: #3557d6;
    }}

    .experience-legend-swatch.technology {{
      border-radius: 4px;
      background: #eef2ff;
      border-color: #94a3b8;
      transform: rotate(45deg);
    }}

    .experience-legend-swatch.project {{
      border-radius: 5px;
      background: #8ea7ff;
      border-color: #4a6cf7;
    }}

    .experience-graph-shell {{
      padding: 20px;
    }}

    .experience-graph-frame {{
      position: relative;
      overflow: hidden;
      border-radius: var(--border-radius);
      border: 1px solid rgba(74, 108, 247, 0.12);
      background:
        radial-gradient(circle at top left, rgba(74, 108, 247, 0.14), transparent 30%),
        radial-gradient(circle at bottom right, rgba(74, 108, 247, 0.08), transparent 34%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(248, 249, 250, 0.96));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.65),
        0 18px 40px rgba(15, 23, 42, 0.08);
    }}

    .experience-network-inner,
    .experience-network-canvas,
    .experience-graph-frame .card,
    .experience-graph-frame .card-body {{
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
      border-radius: 0 !important;
      width: 100% !important;
    }}

    .experience-graph-frame::before {{
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(74, 108, 247, 0.045) 1px, transparent 1px),
        linear-gradient(90deg, rgba(74, 108, 247, 0.045) 1px, transparent 1px);
      background-size: 28px 28px;
      mask-image: radial-gradient(circle at center, black 48%, transparent 100%);
      pointer-events: none;
      opacity: 0.55;
    }}

    [data-theme="dark"] .experience-graph-frame {{
      border-color: rgba(96, 165, 250, 0.18);
      background:
        radial-gradient(circle at top left, rgba(96, 165, 250, 0.18), transparent 28%),
        radial-gradient(circle at bottom right, rgba(96, 165, 250, 0.12), transparent 34%),
        linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.98));
      box-shadow:
        inset 0 1px 0 rgba(191, 219, 254, 0.06),
        0 24px 48px rgba(2, 8, 23, 0.4);
    }}

    #mynetwork {{
      width: 100% !important;
      height: min(78vh, 920px) !important;
      min-height: 620px !important;
      background: transparent !important;
      border: 0 !important;
    }}

    .experience-panel.experience-graph-shell {{
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.98));
    }}

    [data-theme="dark"] .experience-panel.experience-graph-shell {{
      background:
        linear-gradient(180deg, rgba(30, 41, 59, 0.92), rgba(30, 41, 59, 0.98));
    }}

    .experience-details-panel {{
      position: sticky;
      top: 120px;
      min-height: 420px;
      padding: 36px;
    }}

    .experience-details-kicker {{
      display: inline-block;
      margin-bottom: 14px;
      color: var(--primary-color);
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }}

    .experience-details-panel h2 {{
      margin-bottom: 14px;
      line-height: 1.2;
    }}

    .experience-details-panel h3 {{
      margin: 22px 0 10px;
      font-size: 1rem;
      color: var(--text-color);
    }}

    .experience-details-panel p {{
      color: var(--secondary-color);
      margin-bottom: 12px;
    }}

    .experience-meta {{
      margin-bottom: 18px;
      color: var(--secondary-color);
      font-weight: 500;
    }}

    .experience-list,
    .experience-sublist {{
      margin: 0;
      padding-left: 20px;
      color: var(--secondary-color);
    }}

    .experience-list li,
    .experience-sublist li {{
      margin-bottom: 10px;
      line-height: 1.6;
    }}

    .experience-sublist {{
      margin-top: 8px;
    }}

    .experience-tech-group {{
      margin-bottom: 18px;
    }}

    .experience-tech-group:last-child {{
      margin-bottom: 0;
    }}

    .experience-tech-group strong,
    .experience-project-item strong {{
      color: var(--text-color);
    }}

    .experience-project-card {{
      padding: 14px 16px;
      margin-bottom: 12px;
      border-radius: 14px;
      background: var(--light-gray);
    }}

    .experience-project-card:last-child {{
      margin-bottom: 0;
    }}

    .experience-project-card p {{
      margin: 8px 0 0;
      font-size: 0.95rem;
    }}

    .experience-details-empty {{
      display: grid;
      align-content: start;
      min-height: 100%;
    }}

    [data-theme="dark"] .experience-project-card {{
      background: rgba(51, 65, 85, 0.7);
    }}

    @media (max-width: 960px) {{
      .experience-layout {{
        grid-template-columns: 1fr;
      }}

      .experience-details-panel {{
        position: static;
      }}
    }}

    @media (max-width: 768px) {{
      .experience-graph-main {{
        margin-top: 92px;
        padding: 24px 0 72px;
      }}

      .experience-details-panel {{
        padding: 24px 20px;
      }}

      #mynetwork {{
        min-height: 520px !important;
        height: 68vh !important;
      }}
    }}
  </style>
</head>
<body class="experience-graph-page">
  <header>
    <div class="container">
      <nav>
        <div class="logo"><a href="../">Antoine Smeets</a></div>
        <ul class="nav-links">
          <li><a href="../">Accueil</a></li>
          <li><a href="../#projets">Projets</a></li>
          <li><a href="./">Graphe d’expérience</a></li>
          <li><a href="../#a-propos">À propos</a></li>
          <li><a href="../#contact">Contact</a></li>
        </ul>
        <button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode">
          <i class="fas fa-sun" id="theme-icon"></i>
        </button>
        <div class="burger">
          <div class="line1"></div>
          <div class="line2"></div>
          <div class="line3"></div>
        </div>
      </nav>
    </div>
  </header>

  <main class="experience-graph-main">
    <div class="container">
      <div class="experience-title-wrap">
        <h1 class="section-title">Graphe d’expérience</h1>
      </div>
      <div class="experience-layout">
        <section class="experience-panel experience-graph-shell">
          <div class="experience-graph-frame" id="experience-graph-network">
            {body_content}
          </div>
          <div class="experience-legend" aria-label="Légende du graphe">
            <span class="experience-legend-item"><span class="experience-legend-swatch experience"></span>Expérience</span>
            <span class="experience-legend-item"><span class="experience-legend-swatch technology"></span>Technologie</span>
            <span class="experience-legend-item"><span class="experience-legend-swatch project"></span>Projets</span>
          </div>
        </section>

        <aside class="experience-panel experience-details-panel">
          <div id="experience-details-content">
            {details_default_html}
          </div>
        </aside>
      </div>
    </div>
  </main>

  <footer>
    <div class="container">
      <p class="footer-links">
        <button type="button" class="cookie-settings-trigger" data-cookie-settings-trigger>Gérer les cookies</button>
        <span class="footer-separator" aria-hidden="true">|</span>
        <a href="../confidentialite/">Politique de confidentialité et de cookies</a>
      </p>
      <p>&copy; 2026 Antoine Smeets</p>
    </div>
  </footer>

  <script>
    window.EXPERIENCE_GRAPH_THEME = {{
      nodeTypeById: {json.dumps(node_type_by_id, ensure_ascii=False)},
      nodeEntityIdById: {json.dumps(node_entity_id_by_id, ensure_ascii=False)},
      nodeStyles: {{
        light: {json.dumps(LIGHT_NODE_STYLES, ensure_ascii=False)},
        dark: {json.dumps(DARK_NODE_STYLES, ensure_ascii=False)}
      }},
      edgeStyles: {{
        light: {json.dumps(LIGHT_EDGE_STYLES, ensure_ascii=False)},
        dark: {json.dumps(DARK_EDGE_STYLES, ensure_ascii=False)}
      }},
      data: {json.dumps(data, ensure_ascii=False)}
    }};
    window.EXPERIENCE_GRAPH_DEFAULT_PANEL = {json.dumps(details_default_html, ensure_ascii=False)};
  </script>
  <script>
    (function() {{
      function graphThemeName() {{
        return document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      }}

      function sanitizeHtml(value) {{
        return String(value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }}

      function renderDefaultPanel() {{
        var panel = document.getElementById('experience-details-content');
        if (panel) {{
          panel.innerHTML = window.EXPERIENCE_GRAPH_DEFAULT_PANEL;
        }}
      }}

      function buildIndexes(data) {{
        var experiences = new Map();
        var technologies = new Map();
        var projects = new Map();

        data.experiences.forEach(function(item) {{ experiences.set(item.id, item); }});
        data.technologies.forEach(function(item) {{ technologies.set(item.id, item); }});
        data.projects.forEach(function(item) {{ projects.set(item.id, item); }});

        return {{
          experiences: experiences,
          technologies: technologies,
          projects: projects
        }};
      }}

      function renderExperience(experienceId, indexes, data) {{
        var experience = indexes.experiences.get(experienceId);
        if (!experience) {{
          renderDefaultPanel();
          return;
        }}

        var projects = data.projects.filter(function(project) {{
          return project.experience === experienceId;
        }});

        var techGroups = new Map();
        projects.forEach(function(project) {{
          project.technologies.forEach(function(technologyId) {{
            if (!techGroups.has(technologyId)) {{
              techGroups.set(technologyId, []);
            }}
            techGroups.get(technologyId).push(project);
          }});
        }});

        var technologiesHtml = Array.from(techGroups.keys()).map(function(technologyId) {{
          var technology = indexes.technologies.get(technologyId);
          var relatedProjects = techGroups.get(technologyId) || [];
          var projectsHtml = relatedProjects.map(function(project) {{
            return '<li>' + sanitizeHtml(project.label) + '</li>';
          }}).join('');
          return (
            '<div class="experience-tech-group">' +
              '<strong>' + sanitizeHtml(technology ? technology.label : technologyId) + '</strong>' +
              '<ul class="experience-sublist">' + projectsHtml + '</ul>' +
            '</div>'
          );
        }}).join('');

        var panel = document.getElementById('experience-details-content');
        panel.innerHTML =
          '<span class="experience-details-kicker">Expérience</span>' +
          '<h2>' + sanitizeHtml(experience.label) + '</h2>' +
          '<p class="experience-meta">' + sanitizeHtml(experience.role || '') + '</p>' +
          '<p>' + sanitizeHtml(experience.summary || '') + '</p>' +
          '<h3>Technologies utilisées</h3>' +
          (technologiesHtml || '<p>Aucune technologie liée.</p>');
      }}

      function renderTechnology(technologyId, indexes, data) {{
        var technology = indexes.technologies.get(technologyId);
        if (!technology) {{
          renderDefaultPanel();
          return;
        }}

        var relatedProjects = data.projects.filter(function(project) {{
          return project.technologies.indexOf(technologyId) !== -1;
        }});

        var projectsHtml = relatedProjects.map(function(project) {{
          var experience = indexes.experiences.get(project.experience);
          return (
            '<div class="experience-project-card">' +
              '<strong>' + sanitizeHtml(project.label) + '</strong>' +
              '<p><strong>Expérience:</strong> ' + sanitizeHtml(experience ? experience.label : project.experience) + '</p>' +
              '<p>' + sanitizeHtml(project.summary || '') + '</p>' +
            '</div>'
          );
        }}).join('');

        var panel = document.getElementById('experience-details-content');
        panel.innerHTML =
          '<span class="experience-details-kicker">Technologie</span>' +
          '<h2>' + sanitizeHtml(technology.label) + '</h2>' +
          '<h3>Projets liés</h3>' +
          (projectsHtml || '<p>Aucun projet lié.</p>');
      }}

      function renderProject(projectId, indexes) {{
        var project = indexes.projects.get(projectId);
        if (!project) {{
          renderDefaultPanel();
          return;
        }}

        var experience = indexes.experiences.get(project.experience);
        var technologiesHtml = (project.technologies || []).map(function(technologyId) {{
          var technology = indexes.technologies.get(technologyId);
          return '<li>' + sanitizeHtml(technology ? technology.label : technologyId) + '</li>';
        }}).join('');

        var panel = document.getElementById('experience-details-content');
        panel.innerHTML =
          '<span class="experience-details-kicker">Projet</span>' +
          '<h2>' + sanitizeHtml(project.label) + '</h2>' +
          '<p class="experience-meta"><strong>Expérience:</strong> ' + sanitizeHtml(experience ? experience.label : project.experience) + '</p>' +
          '<h3>Technologies utilisées</h3>' +
          '<ul class="experience-list">' + technologiesHtml + '</ul>' +
          '<h3>Résumé</h3>' +
          '<p>' + sanitizeHtml(project.summary || '') + '</p>' +
          '<h3>Impact</h3>' +
          '<p>' + sanitizeHtml(project.impact || '') + '</p>';
      }}

      function renderPanelForNode(nodeId) {{
        var graphTheme = window.EXPERIENCE_GRAPH_THEME;
        if (!graphTheme) {{
          return;
        }}

        var nodeType = graphTheme.nodeTypeById[nodeId];
        var entityId = graphTheme.nodeEntityIdById[nodeId];
        var data = graphTheme.data;
        var indexes = buildIndexes(data);

        if (nodeType === 'experience') {{
          renderExperience(entityId, indexes, data);
          return;
        }}
        if (nodeType === 'technology') {{
          renderTechnology(entityId, indexes, data);
          return;
        }}
        if (nodeType === 'project') {{
          renderProject(entityId, indexes);
          return;
        }}
        renderDefaultPanel();
      }}

      function applyGraphTheme() {{
        if (typeof network === 'undefined' || !network.body || !window.EXPERIENCE_GRAPH_THEME) {{
          return;
        }}

        var theme = graphThemeName();
        var graphTheme = window.EXPERIENCE_GRAPH_THEME;
        var nodeStyles = graphTheme.nodeStyles[theme];
        var edgeStyles = graphTheme.edgeStyles[theme];
        var nodeUpdates = [];
        var edgeUpdates = [];

        network.body.data.nodes.forEach(function(node) {{
          var nodeType = graphTheme.nodeTypeById[node.id] || 'project';
          nodeUpdates.push({{
            id: node.id,
            color: nodeStyles[nodeType],
            font: {{
              color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
              face: 'Inter, Segoe UI, sans-serif'
            }}
          }});
        }});

        network.body.data.edges.forEach(function(edge) {{
          var fromType = graphTheme.nodeTypeById[edge.from];
          var toType = graphTheme.nodeTypeById[edge.to];
          var edgeType = (fromType === 'experience' || toType === 'experience')
            ? 'experience_project'
            : 'technology_project';
          var style = edgeStyles[edgeType] || edgeStyles.default;
          edgeUpdates.push({{
            id: edge.id,
            color: style.color,
            width: style.width,
            dashes: style.dashes || false
          }});
        }});

        network.body.data.nodes.update(nodeUpdates);
        network.body.data.edges.update(edgeUpdates);
        network.setOptions({{
          nodes: {{
            font: {{
              color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
              face: 'Inter, Segoe UI, sans-serif'
            }},
            shadow: {{
              enabled: true,
              color: theme === 'dark' ? 'rgba(15, 23, 42, 0.35)' : 'rgba(15, 23, 42, 0.12)',
              size: 22,
              x: 0,
              y: 10
            }}
          }}
        }});
        network.redraw();
      }}

      function bindPanelInteractions() {{
        if (typeof network === 'undefined') {{
          return;
        }}

        network.on('click', function(params) {{
          if (params.nodes && params.nodes.length > 0) {{
            renderPanelForNode(params.nodes[0]);
            return;
          }}
          renderDefaultPanel();
        }});
      }}

      function watchThemeChanges() {{
        var observer = new MutationObserver(applyGraphTheme);
        observer.observe(document.body, {{ attributes: true, attributeFilter: ['data-theme'] }});
      }}

      function initialize() {{
        renderDefaultPanel();
        applyGraphTheme();
        bindPanelInteractions();
        watchThemeChanges();
      }}

      if (document.readyState === 'loading') {{
        document.addEventListener('DOMContentLoaded', initialize);
      }} else {{
        initialize();
      }}
    }})();
  </script>
  <script src="../js/main.js"></script>
</body>
</html>
"""


def main() -> None:
    data = load_data(DATA_PATH)
    validate_data(data)
    graph = build_graph(data)
    network = create_network(graph)
    generated_html = network.generate_html(notebook=False)
    OUTPUT_PATH.write_text(compose_page(generated_html, data), encoding="utf-8")
    print(f"Generated {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
