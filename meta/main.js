
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


function renderPieChart(selectedCommit) {
  console.log("Selected Commit Lines:", selectedCommit ? selectedCommit.lines : "No commit selected");

  oldData = [...(oldData || [])];

  // Get language breakdown from the selected commit's lines
  let lines = selectedCommit ? selectedCommit.lines : [];
  let rolledData = d3.rollups(
      lines,
      (v) => v.length,
      (d) => d.type
  );

  let data = rolledData.map(([type, count]) => ({
      value: count,
      label: type,
      id: type
  }));

  let sliceGenerator = d3.pie()
      .value((d) => d.value)
      .sort(null);

  let arcData = sliceGenerator(data);
  let arcGenerator = d3.arc()
      .innerRadius(0)
      .outerRadius(50);
  
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  // Fixing the selection issue: Using `#language-pie` instead of `#language-plot`
  let svg = d3.select("#language-pie");

  // Remove any existing paths before updating
  svg.selectAll("path").remove();

  let paths = svg.selectAll("path")
      .data(arcData, d => d.data.id);

  let enterPaths = paths.enter()
      .append("path")
      .each(function(d) {
          this._current = d;
          wedges[d.data.id] = this;
      })
      .attr("d", arcGenerator)
      .attr("fill", (d, i) => d && d.data ? colors(d.data.id) : colors(i))
      .style("cursor", "pointer");

  paths.exit().remove();

  paths.merge(enterPaths).each(function(d) {
      this._current = d;
  });

  // Fixing `#language-breakdown` legend
  let legend = d3.select("#language-breakdown");
  legend.selectAll("*").remove();

  let totalLines = d3.sum(data, d => d.value);

  data.forEach((d, idx) => {
      let percentage = ((d.value / totalLines) * 100).toFixed(1);
      legend.append("li")
          .attr("style", `--color:${colors(idx)}`)
          .attr("class", "legend-item")
          .html(`<span class="swatch"></span> ${d.label} <em>(${d.value} lines, ${percentage}%)</em>`);
  });
}












function updateTimeFilter(maxTime) {
  filteredCommits = commits.filter(d => d.datetime <= maxTime);
  filteredLines = data.filter(d => d.datetime <= maxTime);
  
  // Process files data and sort by line count
  const files = d3.groups(filteredLines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);
  
  // Create color scale for file types with explicit domain
  const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(d3.groups(filteredLines, d => d.type).map(d => d[0]));
  
  // Update x-scale domain to show only filtered commits
  xScale.domain([d3.min(filteredCommits, d => d.datetime), maxTime]);
  
  // Update circles with transition
  const dots = d3.select('.dots')
    .selectAll('circle')
    .data(commits, d => d.id);

  // Update all circles
  dots
    .style('opacity', d => d.datetime <= maxTime ? 0.7 : 0)
    .transition()
    .duration(200)
    .attr('cx', d => xScale(d.datetime));

  // Add any missing circles
  dots.enter()
    .append('circle')
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('fill', d => fileTypeColors(d.lines[0].type))
    .style('opacity', d => d.datetime <= maxTime ? 0.7 : 0)
    .attr('cx', d => xScale(d.datetime));

  // Update x-axis with transition using class selector
  d3.select('.x-axis')
    .transition()
    .duration(200)
    .call(d3.axisBottom(xScale));
    
  // Update files visualization
  d3.select('.files').selectAll('div').remove();
  
  const filesContainer = d3.select('.files')
    .selectAll('div')
    .data(files)
    .enter()
    .append('div');

  filesContainer.append('dt')
    .append('code')
    .html(d => `${d.name} <small>${d.lines.length} lines</small>`);

  filesContainer.append('dd')
    .selectAll('div')
    .data(d => d.lines)
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type));
    
  // Update stats
  displayStats();
}

function setupSlider() {
  if (!commits.length) return;

  timeScale = d3.scaleTime()
    .domain([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)])
    .range([0, 100]);

  let commitMaxTime = timeScale.invert(commitProgress);
  
  const selectedTime = d3.select('#selectedTime');
  selectedTime.text(commitMaxTime.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short'
  }));

  d3.select('#commit-slider')
  .on('input', function() {
    commitProgress = +this.value;
    commitMaxTime = timeScale.invert(commitProgress);
    selectedTime.text(commitMaxTime.toLocaleString('en', {
      dateStyle: 'long',
      timeStyle: 'short'
    }));
    updateTimeFilter(commitMaxTime);
  });
}
async function loadData() {
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
  // Initialize filtered data
  filteredCommits = commits;
  filteredLines = data;
  displayStats();
  createScatterplot();
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
  // Clear existing stats first
  d3.select('#stats').selectAll('*').remove();

  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').text('Commits');
  dl.append('dd').text(filteredCommits.length);

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
  tooltip.style.left = event.pageX + 'px';
  tooltip.style.top = event.pageY + 'px';
}

function createScatterplot() {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

    xScale = d3
    .scaleTime()
    .domain([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)])
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);


  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([7, 27]); 

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat((d) => `${(d % 24 === 0 ? 0 : d).toString().padStart(2, '0')}:00`);

  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));


  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  svg.append('g')
    .attr('class', 'x-axis')  // Add this class
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  const dots = svg.append('g').attr('class', 'dots');
  // Update this line to use filteredCommits
  const sortedCommits = d3.sort(filteredCommits, (d) => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', function (event, commit) {
      d3.select(event.currentTarget)
        .style('fill-opacity', 1)
        .classed('selected', true);
      updateTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', function (event) {
      d3.select(event.currentTarget)
        .style('fill-opacity', 0.7)
        .classed('selected', false);
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });
}

function brushSelector() {
  const svg = d3.select('svg');

  const brush = d3.brush()
    .on('start brush end', brushed);

  svg.append('g')
    .attr('class', 'brush')
    .call(brush);

  svg.selectAll('.dots, .overlay ~ *').raise();
}

function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

function brushed(event) {
  if (!event.selection) {
      selectedCommits = [];
      renderPieChart(null);  // Clear the pie chart when no selection
  } else {
      selectedCommits = filteredCommits.filter(commit => {
          const x = xScale(commit.datetime);
          const y = yScale(commit.hourFrac);
          
          return x >= event.selection[0][0] && 
                 x <= event.selection[1][0] && 
                 y >= event.selection[0][1] && 
                 y <= event.selection[1][1];
      });
      // Render pie chart with the first selected commit
      renderPieChart(selectedCommits[0]);
  }
  
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

function updateSelectionCount() {
  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
}

function updateLanguageBreakdown() {
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
    .style('fill', d => isCommitSelected(d) ? '#ff6b6b' : 'steelblue')
    .classed('selected', d => isCommitSelected(d));
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  processCommits();
  brushSelector();
  setupSlider();
  renderPieChart(null);  // Initialize empty pie chart
});


