console.log('IT’S ALIVE!');

/*
  函数 $$：与原代码一致，用于在 document 或指定元素中，选出所有符合选择器的元素数组
*/
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/*
  1) 新增：确定 basePath 的逻辑
     - 如果在本地 (localhost / file://) 或用户主页 (例如 ziyaozzz.github.io 根路径)，basePath = "/"
     - 如果在 GitHub Pages 的某个“项目页”，比如 ziyaozzz.github.io/ZiyaoZhouPortfolio/，
       则我们把 basePath 设为 "/ZiyaoZhouPortfolio/"
 */
const GITHUB_USERNAME = "ZiyaoZzz";
const GITHUB_REPO_NAME = "ZiyaoZhouPortfolio";

let basePath = "/"; // 默认假设在本地或用户主页的根路径
if (
  location.hostname.toLowerCase() === `${GITHUB_USERNAME.toLowerCase()}.github.io`
  && location.pathname.includes(`/${GITHUB_REPO_NAME}`)
) {
  basePath = `/${GITHUB_REPO_NAME}/`;
}

/*
  2) 定义页面列表 (pages)；这里和原代码基本一致
*/
let pages = [
  { url: '', title: 'Home' },
  { url: 'contact/', title: 'Contact' },
  { url: 'projects/', title: 'Projects' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/ZiyaoZzz', title: 'GitHub' }
];

/*
  3) 生成 <nav> 导航并插入到页面 body 最前
*/
let nav = document.createElement('nav');
document.body.prepend(nav);

/*
  4) 循环处理 pages，给内部链接加上 basePath
     - 原本使用的 `ARE_WE_HOME` 被移除
     - 如果 url 不是 http 开头，就认为是站内链接，用 basePath 拼接
*/
for (const p of pages) {
  let url = p.url;

  // 如果不是 http(s) 开头的外部链接，那就是内部链接，加上 basePath
  if (!url.startsWith('http')) {
    url = basePath + url;
  }

  // 如果原始 url 为空字符串 (Home)，让它指向 basePath
  if (p.url === '') {
    url = basePath;
  }

  const a = document.createElement('a');
  a.href = url;
  a.textContent = p.title;

  // 如果链接和当前所在路径相同，则高亮
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }

  // 如果是外部链接（host 不同），在新窗口中打开
  if (a.host !== location.host) {
    a.target = '_blank';
  }

  nav.append(a);
}

/*
  5) 主题切换（与原代码相同）
*/
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-switcher">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`
);

const themeSwitcher = document.getElementById('theme-switcher');
const savedScheme = localStorage.getItem('colorScheme');
if (savedScheme) {
  document.documentElement.style.colorScheme = savedScheme;
  themeSwitcher.value = savedScheme;
}
themeSwitcher.addEventListener('change', (event) => {
  console.log('Color scheme changed to', event.target.value);
  document.documentElement.style.colorScheme = event.target.value;
  localStorage.setItem('colorScheme', event.target.value);
});

/*
  6) fetchJSON, renderProjects, fetchGitHubData 几个函数保持不变
*/
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
    return [];
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement || !(containerElement instanceof HTMLElement)) {
    console.error("Invalid container element provided.");
    return;
  }
  if (!Array.isArray(projects) || projects.length === 0) {
    console.warn("No projects available to render.");
    containerElement.innerHTML = "<p>No projects available.</p >";
    return;
  }

  containerElement.innerHTML = '';

  const validHeadingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const safeHeading = validHeadingLevels.includes(headingLevel) ? headingLevel : 'h2';

  projects.forEach(project => {
    const article = document.createElement('article');

    const heading = document.createElement(safeHeading);
    heading.textContent = project.title || "Untitled Project";

    const img = document.createElement('img');
    img.src = project.image || 'placeholder.png';
    img.alt = project.title || 'Project Image';

    const description = document.createElement('p');
    description.textContent = project.description || "No description available.";

    article.appendChild(heading);
    article.appendChild(img);
    article.appendChild(description);

    containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching GitHub data:", error);
    return null;
  }
}

