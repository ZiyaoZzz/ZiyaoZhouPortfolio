console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const GITHUB_USERNAME = "ZiyaoZzz";
const GITHUB_REPO_NAME = "ZiyaoZhouPortfolio";

let basePath = "/";
if (
  location.hostname.toLowerCase() === `${GITHUB_USERNAME.toLowerCase()}.github.io` &&
  location.pathname.includes(`/${GITHUB_REPO_NAME}`)
) {
  basePath = `/${GITHUB_REPO_NAME}/`;
}

let pages = [
  { url: "", title: "Home" },
  { url: "contact/", title: "Contact" },
  { url: "projects/", title: "Projects" },
  { url: "https://github.com/ZiyaoZzz", title: "GitHub" },
  { url: "resume/", title: "Resume" },
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (const p of pages) {
  let url = p.url;

  if (!url.startsWith("http")) {
    url = basePath + url;
  }

  if (p.url === "") {
    url = basePath;
  }

  const a = document.createElement("a");
  a.href = url;
  a.textContent = p.title;

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }

  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-switcher">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`
);

const themeSwitcher = document.getElementById("theme-switcher");

window.addEventListener("DOMContentLoaded", () => {
  const savedScheme = localStorage.getItem("colorScheme");
  if (savedScheme) {
    document.documentElement.style.colorScheme = savedScheme;
    themeSwitcher.value = savedScheme;
  }
});

themeSwitcher.addEventListener("change", (event) => {
  const selectedScheme = event.target.value;
  document.documentElement.style.colorScheme = selectedScheme;
  localStorage.setItem("colorScheme", selectedScheme);
});

const select = document.querySelector(".color-scheme select");
select.addEventListener("input", function (event) {
  console.log("Color scheme changed to", event.target.value);
});

const form = document.querySelector("#contact-form");
form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const subject = encodeURIComponent(data.get("subject") || "");
  const message = encodeURIComponent(data.get("message") || "");
  const mailtoLink = `mailto:2089257436@qq.com?subject=${subject}&body=${message}`;

  console.log("Generated mailto link:", mailtoLink);
  location.href = mailtoLink;
});

/* Fetch JSON data */
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
    return [];
  }
}

/* Render projects with year */
export function renderProjects(projects, containerElement, headingLevel = "h2") {
  if (!containerElement || !(containerElement instanceof HTMLElement)) {
    console.error("Invalid containerElement provided.");
    return;
  }
  const validHeadings = ["h1", "h2", "h3", "h4", "h5", "h6"];
  if (!validHeadings.includes(headingLevel)) {
    console.error("Invalid headingLevel provided. Defaulting to h2.");
    headingLevel = "h2";
  }
  containerElement.innerHTML = "";

  if (!projects || projects.length === 0) {
    containerElement.innerHTML = "<p>No projects available.</p>";
    return;
  }

  projects.forEach((project) => {
    const article = document.createElement("article");

    const heading = document.createElement(headingLevel);
    heading.textContent = project.title || "Untitled Project";

    const img = document.createElement("img");
    img.src = project.image || "default-image.png";
    img.alt = project.title || "Project Image";

    const descriptionWrapper = document.createElement("div");

    const description = document.createElement("p");
    description.textContent = project.description || "No description available.";

    const year = document.createElement("p");
    year.textContent = project.year ? `c. ${project.year}` : "Year: Unknown";
    year.style.color = "gray";
    year.style.fontFamily = "Baskerville, serif";
    year.style.fontVariantNumeric = "oldstyle-nums";

    descriptionWrapper.appendChild(description);
    descriptionWrapper.appendChild(year);

    article.appendChild(heading);
    article.appendChild(img);
    article.appendChild(descriptionWrapper);

    containerElement.appendChild(article);
  });
}

/* Fetch GitHub Data */
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
