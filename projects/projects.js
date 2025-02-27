import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const isGitHubPages = window.location.hostname.includes("github.io");
console.log("Hostname:", window.location.hostname, "isGitHubPages:", isGitHubPages);
const baseImagePath = isGitHubPages 
    ? "/ZiyaoZhouPortfolio/images/" 
    : "../images/";               

let query = '';
let projects = [];
let selectedIndex = -1; 
let selectedYear = null;
let oldData = [];
const transitionDuration = 750;
let wedges = {};

async function loadProjects() {
    try {
        projects = await fetchJSON('../lib/projects.json');

        let titleElement = document.querySelector('.projects-title');
        if (titleElement) {
            titleElement.textContent = `${projects.length} Projects`;
        }

        renderProjects(projects, document.querySelector('.projects'), 'h2');
        applyImageCropping();

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
    applyImageCropping();
}

function renderPieChart(projectsGiven) {
    oldData = [...(oldData || [])];

    let rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
    );

    let data = rolledData.map(([year, count]) => ({
        value: count,
        label: year,
        id: year
    }));

    data.sort((a, b) => a.label - b.label);

    let sliceGenerator = d3.pie()
        .value((d) => d.value)
        .sort(null);

    let arcData = sliceGenerator(data);
    let arcGenerator = d3.arc()
        .innerRadius(0)
        .outerRadius(50);
    
    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    let svg = d3.select("#projects-plot");

    let paths = svg.selectAll("path")
        .data(arcData, d => d.data.id);

    paths.each(function(d) {
        wedges[d.data.id] = this;
        this._current = this._current || d;
    });

    paths.transition()
        .duration(transitionDuration)
        .attrTween("d", function(d) {
            let interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                return arcGenerator(interpolate(t));
            };
        })
        .attr("fill", (d, i) => colors(i))
        .attr("class", (d, i) => i === selectedIndex ? "selected" : "");

    let enterPaths = paths.enter()
        .append("path")
        .each(function(d) {
            this._current = d;
            wedges[d.data.id] = this;
        })
        .attr("d", arcGenerator)
        .attr("fill", (d, i) => colors(i))
        .attr("class", (d, i) => i === selectedIndex ? "selected" : "")
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            let idx = data.findIndex(item => item.label === d.data.label);
            selectedIndex = selectedIndex === idx ? -1 : idx;
            selectedYear = selectedIndex !== -1 ? data[selectedIndex].label : null;
            updateFilteredProjects();
            renderPieChart(projects);
        });

    paths.exit()
        .transition()
        .duration(transitionDuration)
        .attrTween("d", function(d) {
            let startAngle = this._current.startAngle;
            let endAngle = this._current.endAngle;
            let interpolateEnd = d3.interpolate(endAngle, startAngle);
            
            return function(t) {
                return arcGenerator({
                    startAngle: startAngle,
                    endAngle: interpolateEnd(t)
                });
            };
        })
        .remove();

    paths.merge(enterPaths).each(function(d) {
        this._current = d;
    });

    let legend = d3.select(".legend");
    legend.selectAll("*").remove();

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

function applyImageCropping() {
    const projectsContainer = document.querySelector('.projects');
    if (projectsContainer) {
        const images = projectsContainer.querySelectorAll('img');
        images.forEach(img => {
            let src = img.getAttribute("src");
            if (!src.startsWith("http") && !src.startsWith("/")) {
                img.src = baseImagePath + src;
            }
            img.classList.add('cropped-image');
        });
    }
}


loadProjects();