import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
    try {
        const projects = await fetchJSON('../lib/projects.json');

        const projectsContainer = document.querySelector('.projects');
        const projectsTitle = document.querySelector('.projects-title');

        if (projectsTitle) {
            projectsTitle.textContent = `${projects.length} Projects`;
        }

        if (!projectsContainer) {
            console.error("Projects container not found.");
            return;
        }

        renderProjects(projects, projectsContainer, 'h2');

        if (projects.length === 0) {
            projectsContainer.innerHTML = "<p>No projects available at the moment.</p>";
        }
    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

loadProjects();
