import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

async function displayLatestProjects() {
    try {
        const isGitHubPages = window.location.hostname.includes("github.io");
        const projectsUrl = isGitHubPages
            ? "https://ZiyaoZzz.github.io/ZiyaoZhouPortfolio/lib/projects.json"
            : "../lib/projects.json";

        console.log(`Fetching projects from: ${projectsUrl}`);
        const projects = await fetchJSON(projectsUrl);
        if (!projects || projects.length === 0) {
            console.warn("No projects found in JSON.");
            return;
        }

        const latestProjects = projects.slice(0, 3);
        const projectsContainer = document.querySelector('.projects');

        if (!projectsContainer) {
            console.error("No '.projects' container found in the DOM.");
            return;
        }

        // Render the latest projects
        renderProjects(latestProjects, projectsContainer, 'h2');

        // **Crop images** after rendering
        const images = projectsContainer.querySelectorAll('img');
        images.forEach((img) => {
            img.classList.add('cropped-image');
        });
    } catch (error) {
        console.error("Error loading latest projects:", error);
    }
}

window.addEventListener('DOMContentLoaded', displayLatestProjects);

const githubUsername = 'ZiyaoZzz';
async function displayGitHubStats() {
    try {
        const githubData = await fetchGitHubData(githubUsername);

        if (!githubData) {
            console.error("No GitHub data received.");
            return;
        }

        const profileStats = document.querySelector('#profile-stats');

        if (profileStats) {
            profileStats.innerHTML = `
                <dl>
                    <dt>Public Repos:</dt> <dd>${githubData.public_repos}</dd>
                    <dt>Public Gists:</dt> <dd>${githubData.public_gists}</dd>
                    <dt>Followers:</dt> <dd>${githubData.followers}</dd>
                    <dt>Following:</dt> <dd>${githubData.following}</dd>
                </dl>
            `;
        }
    } catch (error) {
        console.error("Error fetching GitHub stats:", error);
    }
}

displayGitHubStats();
