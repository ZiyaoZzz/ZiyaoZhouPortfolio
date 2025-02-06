import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let query = '';
let projects = [];
let selectedIndex = -1; // Default: No selection

async function loadProjects() {
    try {
        projects = await fetchJSON('../lib/projects.json');

        let titleElement = document.querySelector('.projects-title');
        if (titleElement) {
            titleElement.textContent = `${projects.length} Projects`;
        }

        renderProjects(projects, document.querySelector('.projects'), 'h2');
        renderPieChart(projects);

        let searchInput = document.querySelector('.searchBar');
        searchInput.addEventListener('input', (event) => {
            query = event.target.value.toLowerCase();
            let filteredProjects = projects.filter(project => {
                let values = Object.values(project).join('\n').toLowerCase();
                return values.includes(query);
            });

            if (titleElement) {
                titleElement.textContent = `${filteredProjects.length} Projects`;
            }

            renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');
            renderPieChart(filteredProjects);
        });

    } catch (error) {
        console.error("Error loading projects:", error);
    }
}
function renderPieChart(projectsGiven) {
    let rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
    );

    let data = rolledData.map(([year, count]) => ({
        value: count, label: year
    }));

    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcData = sliceGenerator(data);
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    d3.select("#projects-plot").selectAll("*").remove();
    d3.select(".legend").selectAll("*").remove();

    let svg = d3.select("#projects-plot");

    arcData.forEach((d, idx) => {
        svg.append("path")
            .attr("d", arcGenerator(d))
            .attr("fill", colors(idx))
            .attr("class", selectedIndex === idx ? "selected" : "")
            .on("click", () => {
                // Toggle selection
                selectedIndex = selectedIndex === idx ? -1 : idx;
                let selectedYear = selectedIndex !== -1 ? data[selectedIndex].label : null;

                // Filter projects based on selected year
                let filteredProjects = selectedYear
                    ? projects.filter((p) => p.year === selectedYear)
                    : projects;

                // Update project list
                renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');

                // Update pie chart with highlighting
                renderPieChart(projectsGiven);
            });
    });

    let legend = d3.select(".legend");

    data.forEach((d, idx) => {
        legend.append("li")
            .attr("style", `--color:${colors(idx)}`)
            .attr("class", `legend-item ${selectedIndex === idx ? "selected" : ""}`)
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
            .on("click", () => {
                // Toggle selection
                selectedIndex = selectedIndex === idx ? -1 : idx;
                let selectedYear = selectedIndex !== -1 ? data[selectedIndex].label : null;

                // Filter projects based on selected year
                let filteredProjects = selectedYear
                    ? projects.filter((p) => p.year === selectedYear)
                    : projects;

                // Update project list
                renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');

                // Update pie chart with highlighting
                renderPieChart(projectsGiven);
            });
    });
}


loadProjects();
