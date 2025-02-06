import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let query = '';
let projects = [];
let selectedIndex = -1; // Default: No selection
let selectedYear = null;

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
            updateFilteredProjects();
        });

    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

function updateFilteredProjects() {
    let filteredProjects = projects.filter((p) => {
        let matchesYear = selectedYear ? p.year === selectedYear : true;
        let matchesQuery = query ? Object.values(p).join('\n').toLowerCase().includes(query) : true;
        return matchesYear && matchesQuery;
    });

    renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');
}

function renderPieChart(projectsGiven) {
    let rolledData = d3.rollups(
        projects,
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
        let isSelected = selectedIndex === idx;

        svg.append("path")
            .attr("d", arcGenerator(d))
            .attr("fill", colors(idx))
            .attr("class", isSelected ? "selected" : "")
            .style("cursor", "pointer")
            .on("click", () => {
                selectedIndex = selectedIndex === idx ? -1 : idx;
                selectedYear = selectedIndex !== -1 ? data[selectedIndex].label : null;
                updateFilteredProjects();
                renderPieChart(projects); 
            });
    });

    let legend = d3.select(".legend");

    data.forEach((d, idx) => {
        let isSelected = selectedIndex === idx;

        legend.append("li")
            .attr("style", `--color:${colors(idx)}`)
            .attr("class", `legend-item ${isSelected ? "selected" : ""}`)
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
            .style("cursor", "pointer")
            .on("click", () => {
                selectedIndex = selectedIndex === idx ? -1 : idx;
                selectedYear = selectedIndex !== -1 ? data[selectedIndex].label : null;
                updateFilteredProjects();
                renderPieChart(projects);
            });
    });
}

loadProjects();
