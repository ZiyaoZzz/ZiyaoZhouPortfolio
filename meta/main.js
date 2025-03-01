let data = [];
let commits = [];
let xScale, yScale, rScale;  // Added rScale to global scope
let commitProgress = 100;
let selectedCommits = [];
let timeScale;
let filteredCommits, filteredLines;
let oldData = [];
const transitionDuration = 750;
let wedges = {};

// At the top of the file, declare variables without const
let scrollContainer, spacer, itemsContainer;
let NUM_ITEMS = 100;
let ITEM_HEIGHT = 80; // Increased height for better readability
let VISIBLE_COUNT = 10;
let totalHeight;

// Add this to track scroll progress
let currentScrollIndex = 0;

// Initialize scroll-related elements
function initializeScroll() {
  console.log('Initializing scroll...');
  
  // Initialize DOM elements
  scrollContainer = d3.select('#scroll-container');
  spacer = d3.select('#spacer');
  itemsContainer = d3.select('#items-container');
  
  if (!scrollContainer.node() || !spacer.node() || !itemsContainer.node()) {
    console.error('Could not find required DOM elements');
    return;
  }
  
  // Set initial spacer height
  NUM_ITEMS = commits.length;
  totalHeight = NUM_ITEMS * ITEM_HEIGHT;
  
  console.log('Setting spacer height:', totalHeight);
  spacer.style('height', `${totalHeight}px`);
  
  // Set up scroll handler with throttling
  scrollContainer.on('scroll', () => {
    const scrollTop = scrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    
    // Only update if the index has changed
    if (startIndex !== currentScrollIndex) {
      console.log('Scroll position changed:', startIndex);
      renderItems(startIndex);
    }
  });
  
  // Initial render
  console.log('Performing initial render...');
  renderItems(0);
}

async function loadData() {
  try {
    data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line),
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
      file: row.file,
      author: row.author,
    }));

    processCommits();
    console.log("Data loaded, commits:", commits.length);
    
    // Initialize filtered data
    filteredCommits = commits;
    filteredLines = data;
    
    // Create scatter plot first
    createScatterplot();
    displayStats();
    
    // Then initialize scroll
    initializeScroll();
    
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

function processCommits() {
  commits = d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
    let first = lines[0];
    let { author, date, time, timezone, datetime } = first;

    let ret = {
      id: commit,
      url: `https://github.com/YOUR_REPO/commit/${commit}`,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };

    Object.defineProperty(ret, 'lines', {
      value: lines,
      enumerable: false,
      writable: false,
      configurable: false,
    });

    return ret;
  });
}

function displayStats() {
  processCommits();

  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').text('Commits');
  dl.append('dd').text(commits.length);

  const numFiles = d3.groups(data, (d) => d.file).length;
  dl.append('dt').text('Files');
  dl.append('dd').text(numFiles);

  dl.append('dt').html('Total <abbr title="Lines of Code">LOC</abbr>');
  dl.append('dd').text(data.length);

  const longestLine = d3.max(data, (d) => d.length) || 'N/A';
  dl.append('dt').text('Longest Line (Characters)');
  dl.append('dd').text(longestLine);

  const workByPeriod = d3.rollups(
    data,
    (v) => v.length,
    (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })
  );
  const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0] || 'Unknown';

  const workByDay = d3.rollups(
    data,
    (v) => v.length,
    (d) => new Date(d.datetime).toLocaleString('en', { weekday: 'long' })
  );
  const maxDay = d3.greatest(workByDay, (d) => d[1])?.[0] || 'Unknown';

  dl.append('dt').text('Most Active Time of Day');
  dl.append('dd').text(maxPeriod);

  dl.append('dt').text('Most Active Day of the Week');
  dl.append('dd').text(maxDay);
}

function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit || Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleDateString('en', { dateStyle: 'full' });
  time.textContent = commit.datetime?.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');

  tooltip.style.left = (event.pageX) + 'px';
  tooltip.style.top = (event.pageY) + 'px';
}

function createScatterplot() {
  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const usableWidth = width - margin.left - margin.right;
  const usableHeight = height - margin.top - margin.bottom;

  // Create the SVG with a clipping path
  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'hidden');

  // Add a clipping path
  svg.append('defs')
    .append('clipPath')
    .attr('id', 'plot-area')
    .append('rect')
    .attr('x', margin.left)
    .attr('y', margin.top)
    .attr('width', usableWidth)
    .attr('height', usableHeight);

  // Create a group for the entire plot and translate it
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Add the clipped plot area
  const plotArea = g.append('g')
    .attr('clip-path', 'url(#plot-area)');

  // Add the dots group inside the clipped area
  plotArea.append('g')
    .attr('class', 'dots');

  // Initialize scales
  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, usableWidth]);

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableHeight, 0]);

  // Initialize rScale
  rScale = d3.scaleSqrt()
    .domain(d3.extent(commits, d => d.totalLines))
    .range([9, 27]);

  // Add axes
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${usableHeight})`)
    .call(d3.axisBottom(xScale));

  g.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale)
      .tickFormat(d => `${(d % 24 === 0 ? 0 : d).toString().padStart(2, '0')}:00`));

  // Add gridlines
  g.append('g')
    .attr('class', 'gridlines')
    .call(d3.axisLeft(yScale)
      .tickFormat('')
      .tickSize(-usableWidth));
}

function brushSelector() {
  const svg = d3.select('svg');

  const brush = d3.brush()
    .on('start brush end', brushed);

  svg.append('g') // Append a new group for the brush
    .attr('class', 'brush')
    .call(brush);

  // Ensure dots remain on top
  svg.selectAll('.dots, .overlay ~ *').raise();
}

function isCommitSelected(commit) {
  if (!brushSelection) return false;
  
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  
  return x >= brushSelection[0][0] && 
         x <= brushSelection[1][0] && 
         y >= brushSelection[0][1] && 
         y <= brushSelection[1][1];
}

function brushed(event) {
  brushSelection = event.selection;
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

function updateSelectionCount() {
  const selectedCommits = brushSelection 
      ? commits.filter(isCommitSelected) 
      : [];

  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;

  return selectedCommits;
}

function updateLanguageBreakdown() {
  const selectedCommits = brushSelection 
      ? commits.filter(isCommitSelected) 
      : [];

  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
  }

  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap(d => d.lines);

  const breakdown = d3.rollup(
      lines,
      v => v.length,
      d => d.type
  );

  container.innerHTML = '';

  const breakdownHTML = Array.from(breakdown, ([language, count], index) => {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);

      return `
          <div class="language-item" style="grid-row: ${index >= 3 ? 2 : 1};">
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          </div>
      `;
  }).join('');

  container.innerHTML = breakdownHTML;
}


function updateSelection() {
  d3.selectAll('circle')
    .classed('selected', (d) => isCommitSelected(d));
}

function renderItems(startIndex) {
  console.log('Rendering items from index:', startIndex);
  
  if (!itemsContainer) {
    console.error('Items container not initialized');
    return;
  }
  
  // Clear things off
  itemsContainer.selectAll('div').remove();
  
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  // Get all commits up to the current scroll position
  let visibleCommits = commits.slice(0, endIndex);
  
  console.log(`Rendering commits from 0 to ${endIndex}, total visible: ${visibleCommits.length}`);
  
  // Re-bind the commit data to the container
  itemsContainer.selectAll('div')
    .data(commits.slice(startIndex, endIndex))
    .enter()
    .append('div')
    .attr('class', 'item')
    .html((commit, index) => `
      <p>
        On ${commit.datetime.toLocaleString("en", {
          dateStyle: "full",
          timeStyle: "short"
        })}, I made

          ${startIndex + index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}. I edited ${commit.totalLines} lines across 
        ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files. 
        Then I looked over all I had made, and I saw that it was very good.
      </p>
    `)
    .style('position', 'absolute')
    .style('top', (_, idx) => `${(startIndex + idx) * ITEM_HEIGHT}px`);
    
  // Update scatter plot with all commits up to current scroll position
  if (visibleCommits.length > 0) {
    currentScrollIndex = endIndex;
    console.log('Updating scatter plot with commits:', visibleCommits.length);
    updateScatterPlot(visibleCommits);
  }
}

function updateScatterPlot(visibleCommits) {
  if (!visibleCommits.length) return;
  
  const latestVisibleDate = visibleCommits[visibleCommits.length - 1].datetime;
  
  // Update x-scale domain to show progression
  xScale.domain([
    d3.min(commits, d => d.datetime),
    latestVisibleDate
  ]);
  
  const t = d3.transition().duration(750);
  
  // Update axes
  d3.select('.x-axis')
    .transition(t)
    .call(d3.axisBottom(xScale));
  
  // Update dots with proper selection
  const dots = d3.select('#chart svg .dots')
    .selectAll('circle')
    .data(commits, d => d.id);
  
  // Update existing dots
  dots.transition(t)
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('opacity', d => d.datetime <= latestVisibleDate ? 1 : 0)
    .style('fill', d => d.datetime <= latestVisibleDate ? 'var(--color-accent)' : 'steelblue')
    .style('pointer-events', d => d.datetime <= latestVisibleDate ? 'all' : 'none');
  
  // Enter new dots
  const dotsEnter = dots.enter()
    .append('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('opacity', d => d.datetime <= latestVisibleDate ? 1 : 0.2)
    .style('fill', d => d.datetime <= latestVisibleDate ? 'var(--color-accent)' : 'steelblue');
}

// Update the DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded');
  await loadData();
  brushSelector();
});