const projects = [
  {
    id: 'dear-pip',
    name: 'Dear Pip — Midnight Nursery',
    category: 'web',
    status: 'In progress',
    purpose: 'A storybook portfolio that presents real software work through a gentle, interactive nursery world.',
    problem: 'A conventional project list can feel detached from the ideas and stories behind making software.',
    features: [
      'Static, responsive pages built with semantic HTML, CSS, and plain JavaScript.',
      'A Flask API with PostgreSQL-backed Dream Garden state and pending guestbook submissions with an approved-only public list.',
      'Versioned local Garden backups and revision-aware server synchronization.',
      'Accessible branching fiction, a constellation journal, and interactive nursery scenes.',
    ],
    technologies: [
      { id: 'html', label: 'HTML' },
      { id: 'css', label: 'CSS' },
      { id: 'javascript', label: 'JavaScript' },
      { id: 'flask', label: 'Flask' },
      { id: 'postgresql', label: 'PostgreSQL' },
    ],
    evidence: 'Details are based on the files in this repository. Portfolio status: in progress.',
    links: [],
  },
];

const search = document.querySelector('#workshopSearch');
const category = document.querySelector('#workshopCategory');
const technology = document.querySelector('#workshopTechnology');
const results = document.querySelector('#workshopResults');
const empty = document.querySelector('#workshopEmpty');
const count = document.querySelector('#workshopCount');

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function renderProject(project) {
  const article = makeElement('article', 'workshop-project');
  const button = makeElement('button', 'workshop-project__toggle');
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  const icon = makeElement('span', 'workshop-project__icon', '✧');
  icon.setAttribute('aria-hidden', 'true');
  const heading = makeElement('span', 'workshop-project__heading');
  heading.append(
    makeElement('span', 'workshop-project__status', project.status),
    makeElement('strong', '', project.name),
    makeElement('span', '', project.purpose),
  );
  const caret = makeElement('span', 'workshop-project__caret', '＋');
  caret.setAttribute('aria-hidden', 'true');
  button.append(icon, heading, caret);

  const details = makeElement('div', 'workshop-project__details');
  details.hidden = true;
  details.append(makeElement('h3', '', 'The real work'));
  details.append(makeElement('p', '', project.problem));
  details.append(makeElement('h3', '', 'What is in the build'));
  const featureList = makeElement('ul');
  project.features.forEach((feature) => featureList.append(makeElement('li', '', feature)));
  details.append(featureList);
  details.append(makeElement('h3', '', 'Tools on the bench'));
  const tags = makeElement('ul', 'workshop-tags');
  project.technologies.forEach(({ label }) => tags.append(makeElement('li', '', label)));
  details.append(tags, makeElement('p', 'workshop-project__evidence', project.evidence));
  if (project.links.length) {
    const links = makeElement('div', 'workshop-project__links');
    project.links.forEach(({ label, href }) => {
      const link = makeElement('a', '', label);
      link.href = href;
      link.rel = 'noopener noreferrer';
      links.append(link);
    });
    details.append(links);
  } else {
    details.append(makeElement('p', 'workshop-project__unpublished', 'Repository and live demo links are not published here yet.'));
  }

  button.setAttribute('aria-controls', `project-details-${project.id}`);
  details.id = `project-details-${project.id}`;
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    if (!expanded) window.DearPipSounds?.play('workshop-open');
    button.setAttribute('aria-expanded', String(!expanded));
    details.hidden = expanded;
    caret.textContent = expanded ? '＋' : '−';
  });
  article.append(button, details);
  return article;
}

function renderProjects() {
  const query = search.value.trim().toLowerCase();
  const matches = projects.filter((project) => {
    const text = [
      project.name,
      project.purpose,
      project.problem,
      ...project.technologies.map(({ label }) => label),
    ].join(' ').toLowerCase();
    return (!query || text.includes(query))
      && (!category.value || project.category === category.value)
      && (!technology.value || project.technologies.some(({ id }) => id === technology.value));
  });
  results.replaceChildren(...matches.map(renderProject));
  count.textContent = `${matches.length} ${matches.length === 1 ? 'project' : 'projects'} on the shelf`;
  empty.hidden = matches.length > 0;
}

document.querySelector('#workshopFilters').addEventListener('submit', (event) => event.preventDefault());
search.addEventListener('input', renderProjects);
category.addEventListener('change', renderProjects);
technology.addEventListener('change', renderProjects);
renderProjects();
