(() => {
  const apiMeta = document.querySelector('meta[name="dear-pip-api-base"]');
  const configuredBase = apiMeta?.content.trim();
  const apiBase = (configuredBase || (
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
      ? 'http://127.0.0.1:5000'
      : window.location.origin
  )).replace(/\/+$/, '');
  const elements = {
    status: document.querySelector('#atlasDataStatus'),
    skills: document.querySelector('#atlasSkillsList'),
    skillName: document.querySelector('#atlasSkillName'),
    skillStage: document.querySelector('#atlasSkillStage'),
    skillLearning: document.querySelector('#atlasSkillLearning'),
    skillEvidence: document.querySelector('#atlasSkillEvidence'),
    skillProjects: document.querySelector('#atlasSkillProjects'),
    projectDetails: document.querySelector('#atlasProjectDetails'),
    projectDirectory: document.querySelector('#atlasProjectDirectory'),
    projectsList: document.querySelector('#atlasProjectsList'),
    projectEmpty: document.querySelector('#atlasProjectEmpty'),
    projectName: document.querySelector('#atlasProjectName'),
    projectDescription: document.querySelector('#atlasProjectDescription'),
    projectStatus: document.querySelector('#atlasProjectStatus'),
    projectRepository: document.querySelector('#atlasProjectRepository'),
    projectSkills: document.querySelector('#atlasProjectSkills'),
    token: document.querySelector('#atlasOwnerToken'),
    unlockForm: document.querySelector('#atlasUnlockForm'),
    ownerStatus: document.querySelector('#atlasOwnerStatus'),
    ownerControls: document.querySelector('#atlasOwnerControls'),
    scanProject: document.querySelector('#atlasScanProject'),
    scanButton: document.querySelector('#atlasScanButton'),
    scanStatus: document.querySelector('#atlasScanStatus'),
    scanPreview: document.querySelector('#atlasScanPreview'),
    scanSummary: document.querySelector('#atlasScanSummary'),
    scanCandidates: document.querySelector('#atlasScanCandidates'),
    importButton: document.querySelector('#atlasImportButton'),
    manualInput: document.querySelector('#atlasManualSkills'),
    manualPreview: document.querySelector('#atlasManualPreview'),
    manualProject: document.querySelector('#atlasManualProject'),
    saveSkills: document.querySelector('#atlasSaveSkills'),
    manualStatus: document.querySelector('#atlasManualStatus'),
    projectForm: document.querySelector('#atlasProjectForm'),
    projectFormStatus: document.querySelector('#atlasProjectFormStatus'),
  };
  let ownerToken = '';
  let skills = [];
  let projects = [];
  let selectedSkillId = null;
  let manualEntries = [];

  function normalizeName(value) {
    return value.trim().replace(/\s+/g, ' ');
  }

  function nameKey(value) {
    return normalizeName(value).toLowerCase();
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  async function api(path, { method = 'GET', body, owner = false } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (owner) headers['X-Admin-Token'] = ownerToken;
    let response;
    try {
      response = await fetch(`${apiBase}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
      });
    } catch (_error) {
      throw new Error('Could not reach the Dream Atlas API. Check that Flask is running and the API address is correct.');
    }
    let data;
    try {
      data = await response.json();
    } catch (_error) {
      throw new Error('The Dream Atlas API returned an unreadable response.');
    }
    if (!response.ok) throw new Error(data.error || `The request failed (${response.status}).`);
    return data;
  }

  function setStatus(node, message, state = '') {
    node.textContent = message;
    node.dataset.state = state;
  }

  function makeOwnerJump() {
    const button = make('button', 'atlas-owner-jump', 'Open owner tools');
    button.type = 'button';
    button.addEventListener('click', () => document.querySelector('.atlas-owner-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return button;
  }

  function renderSkills() {
    elements.skills.replaceChildren();
    if (!skills.length) {
      elements.skills.append(make('p', 'atlas-empty-state', 'No skills are saved yet. An owner can preview repository evidence or add skills manually below.'));
      elements.skillName.textContent = 'No saved skills';
      elements.skillStage.textContent = 'Evidence status: not assessed';
      elements.skillLearning.textContent = 'Skills appear here after approved repository detections are imported or the owner adds them manually.';
      elements.skillEvidence.replaceChildren();
      elements.skillProjects.replaceChildren();
      return;
    }

    skills.forEach((skill) => {
      const button = make('button', 'atlas-skill-button', skill.name);
      button.type = 'button';
      button.dataset.skillId = String(skill.id);
      button.setAttribute('aria-pressed', String(skill.id === selectedSkillId));
      button.addEventListener('click', () => selectSkill(skill.id));
      elements.skills.append(button);
    });
    const selected = skills.find((skill) => skill.id === selectedSkillId) || skills[0];
    selectSkill(selected.id);
  }

  function selectSkill(skillId) {
    const skill = skills.find((item) => item.id === skillId);
    if (!skill) return;
    selectedSkillId = skillId;
    elements.skills.querySelectorAll('.atlas-skill-button').forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.skillId) === skillId));
    });
    elements.skillName.textContent = skill.name;
    elements.skillStage.textContent = `Evidence status: ${skill.status.replaceAll('_', ' ')}`;
    elements.skillLearning.textContent = `${skill.category} · Primary source: ${skill.source_type === 'repository_detected' ? 'detected in the repository' : 'added manually'}. This records evidence only, not a proficiency rating.`;
    elements.skillEvidence.replaceChildren();
    if (!skill.evidence.length) {
      elements.skillEvidence.append(make('li', 'atlas-evidence-empty', 'No supporting evidence references are saved.'));
    } else {
      skill.evidence.forEach((item) => {
        const row = make('li', 'atlas-evidence-item');
        row.append(make('code', '', item.reference || 'Owner-added note'));
        if (item.detail) row.append(make('span', '', item.detail));
        elements.skillEvidence.append(row);
      });
    }
    elements.skillProjects.replaceChildren();
    const heading = make('h4', '', 'Related projects');
    elements.skillProjects.append(heading);
    if (!skill.projects.length) {
      elements.skillProjects.append(make('p', 'atlas-empty-state', 'No project is associated with this skill yet.'));
      elements.skillProjects.append(makeOwnerJump());
    } else {
      const list = make('ul', 'atlas-related-project-list');
      skill.projects.forEach((project) => {
        const item = make('li');
        const button = make('button', 'atlas-project-link', project.name);
        button.type = 'button';
        button.addEventListener('click', () => openProject(project.id));
        item.append(button);
        if (project.evidence_reference) item.append(make('code', '', project.evidence_reference));
        list.append(item);
      });
      elements.skillProjects.append(list);
    }
  }

  async function openProject(projectId) {
    elements.projectDetails.hidden = false;
    elements.projectName.textContent = 'Loading project…';
    elements.projectDescription.textContent = '';
    elements.projectSkills.replaceChildren();
    try {
      const { project } = await api(`/api/projects/${projectId}`);
      elements.projectName.textContent = project.name;
      elements.projectDescription.textContent = project.description || 'No description has been added.';
      elements.projectStatus.textContent = `Status: ${project.status.replaceAll('_', ' ')}`;
      elements.projectRepository.hidden = !project.repository_url;
      if (project.repository_url) {
        elements.projectRepository.href = project.repository_url;
        elements.projectRepository.textContent = 'Open verified repository';
      } else {
        elements.projectRepository.removeAttribute('href');
      }
      if (project.skills.length) {
        project.skills.forEach((skill) => elements.projectSkills.append(make('li', '', `${skill.name}${skill.evidence_reference ? ` · ${skill.evidence_reference}` : ''}`)));
      } else {
        elements.projectSkills.append(make('li', 'atlas-evidence-empty', 'No technologies are associated with this project yet.'));
      }
      elements.projectDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      elements.projectName.textContent = 'Project details unavailable';
      elements.projectDescription.textContent = error.message;
    }
  }

  function renderProjectOptions() {
    [elements.scanProject, elements.manualProject].forEach((select) => {
      const selectedValue = select.value;
      select.replaceChildren(new Option('No project association', ''));
      projects.forEach((project) => select.add(new Option(project.name, String(project.id))));
      if (projects.some((project) => String(project.id) === selectedValue)) select.value = selectedValue;
    });
    elements.projectEmpty.hidden = projects.length > 0;
    elements.projectDirectory.hidden = projects.length === 0;
    elements.projectsList.replaceChildren();
    projects.forEach((project) => {
      const card = make('article', 'atlas-project-directory__item');
      const button = make('button', 'atlas-project-link', project.name);
      button.type = 'button';
      button.addEventListener('click', () => openProject(project.id));
      card.append(button);
      card.append(make('span', '', project.status.replaceAll('_', ' ')));
      if (project.description) card.append(make('p', '', project.description));
      elements.projectsList.append(card);
    });
  }

  async function loadAtlasData() {
    setStatus(elements.status, 'Loading saved skills and projects…');
    try {
      const [skillResult, projectResult] = await Promise.all([api('/api/skills'), api('/api/projects')]);
      skills = skillResult.skills;
      projects = projectResult.projects;
      renderProjectOptions();
      renderSkills();
      renderManualPreview();
      setStatus(elements.status, `${skills.length} saved skill${skills.length === 1 ? '' : 's'} · ${projects.length} saved project${projects.length === 1 ? '' : 's'}.`, 'loaded');
    } catch (error) {
      elements.skills.replaceChildren(make('p', 'atlas-error-state', error.message));
      setStatus(elements.status, error.message, 'error');
    }
  }

  function parseManualEntries() {
    const seen = new Set();
    const existing = new Set(skills.map((skill) => nameKey(skill.name)));
    const entries = [];
    const repeated = new Set();
    String(elements.manualInput.value)
      .split(/[\n,]/)
      .map(normalizeName)
      .filter(Boolean)
      .forEach((name) => {
        const key = nameKey(name);
        if (seen.has(key)) {
          repeated.add(key);
          return;
        }
        seen.add(key);
        entries.push({ name, key, exists: existing.has(key), repeated: false });
      });
    entries.forEach((entry) => { entry.repeated = repeated.has(entry.key); });
    return entries;
  }

  function renderManualPreview() {
    manualEntries = parseManualEntries();
    elements.manualPreview.replaceChildren();
    if (!manualEntries.length) {
      elements.manualPreview.append(make('p', 'atlas-empty-state', 'Your parsed skill names will preview here.'));
      elements.saveSkills.disabled = true;
      return;
    }
    manualEntries.forEach((entry) => {
      const chip = make('div', `atlas-manual-chip${entry.exists ? ' is-existing' : ''}`);
      const label = make('span', '', entry.name);
      const note = entry.exists ? 'Already saved' : entry.repeated ? 'Repeated input' : 'New entry';
      chip.append(label, make('small', '', note));
      const remove = make('button', 'atlas-remove-entry', `Remove ${entry.name}`);
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${entry.name} from preview`);
      remove.addEventListener('click', () => {
        manualEntries = manualEntries.filter((item) => item.key !== entry.key);
        elements.manualInput.value = manualEntries.map((item) => item.name).join('\n');
        renderManualPreview();
      });
      chip.append(remove);
      elements.manualPreview.append(chip);
    });
    elements.saveSkills.disabled = false;
  }

  elements.manualInput.addEventListener('input', renderManualPreview);
  elements.unlockForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    ownerToken = elements.token.value;
    setStatus(elements.ownerStatus, 'Checking owner access…');
    try {
      await api('/api/atlas/owner/unlock', { method: 'POST', body: {}, owner: true });
      elements.token.value = '';
      elements.ownerControls.hidden = false;
      setStatus(elements.ownerStatus, 'Owner tools are unlocked for this tab.', 'success');
    } catch (error) {
      ownerToken = '';
      setStatus(elements.ownerStatus, error.message, 'error');
    }
  });

  elements.scanButton.addEventListener('click', async () => {
    elements.scanButton.disabled = true;
    elements.scanPreview.hidden = true;
    setStatus(elements.scanStatus, 'Scanning the configured project directory…');
    try {
      const { scan } = await api('/api/atlas/scan/preview', { method: 'POST', owner: true });
      elements.scanSummary.textContent = `Reviewed ${scan.scanned_files} source files (${(scan.scanned_bytes / 1024).toFixed(0)} KB) in “${scan.project}”. Select only technologies you want to save.`;
      elements.scanCandidates.replaceChildren();
      if (!scan.skills.length) {
        elements.scanCandidates.append(make('p', 'atlas-empty-state', 'No supported technologies were detected.'));
      }
      scan.skills.forEach((candidate, index) => {
        const label = make('label', 'atlas-scan-candidate');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox'; checkbox.value = candidate.name; checkbox.checked = true;
        checkbox.id = `atlasScanCandidate${index}`;
        const content = make('span', 'atlas-scan-candidate__content');
        content.append(make('strong', '', candidate.name), make('small', '', `${candidate.category} · repository evidence`));
        const references = candidate.evidence.map((item) => item.reference).join(', ');
        content.append(make('code', '', references));
        label.htmlFor = checkbox.id;
        label.append(checkbox, content);
        elements.scanCandidates.append(label);
      });
      elements.scanPreview.hidden = false;
      setStatus(elements.scanStatus, 'Preview ready. No records have been saved yet.', 'success');
    } catch (error) {
      setStatus(elements.scanStatus, error.message, 'error');
    } finally {
      elements.scanButton.disabled = false;
    }
  });

  elements.importButton.addEventListener('click', async () => {
    const selected = [...elements.scanCandidates.querySelectorAll('input:checked')].map((input) => input.value);
    if (!selected.length) {
      setStatus(elements.scanStatus, 'Select at least one detected technology to import.', 'error');
      return;
    }
    elements.importButton.disabled = true;
    try {
      const projectId = elements.scanProject.value ? Number(elements.scanProject.value) : null;
      const result = await api('/api/atlas/scan/import', {
        method: 'POST', owner: true, body: { skills: selected, project_id: projectId },
      });
      setStatus(elements.scanStatus, `${result.message} ${result.saved.filter((item) => item.created).length} new skill records; existing records were reused.`, 'success');
      await loadAtlasData();
    } catch (error) {
      setStatus(elements.scanStatus, error.message, 'error');
    } finally {
      elements.importButton.disabled = false;
    }
  });

  elements.saveSkills.addEventListener('click', async () => {
    renderManualPreview();
    if (!manualEntries.length) return;
    elements.saveSkills.disabled = true;
    setStatus(elements.manualStatus, 'Saving skills…');
    try {
      const projectId = elements.manualProject.value ? Number(elements.manualProject.value) : null;
      const result = await api('/api/skills', {
        method: 'POST', owner: true,
        body: { skills: manualEntries.map((entry) => entry.name), project_id: projectId },
      });
      setStatus(elements.manualStatus, `${result.message} ${result.saved.length} entries returned; duplicate skills were reused without replacing evidence.`, 'success');
      elements.manualInput.value = '';
      renderManualPreview();
      await loadAtlasData();
    } catch (error) {
      setStatus(elements.manualStatus, error.message, 'error');
    } finally {
      elements.saveSkills.disabled = manualEntries.length === 0;
    }
  });

  elements.projectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(elements.projectFormStatus, 'Saving project…');
    const form = new FormData(elements.projectForm);
    const technologies = String(form.get('skills') || '').split(/[\n,]/).map(normalizeName).filter(Boolean);
    try {
      const result = await api('/api/projects', {
        method: 'POST', owner: true,
        body: {
          name: form.get('name'), description: form.get('description'),
          repository_url: form.get('repository_url') || null, status: form.get('status'), skills: technologies,
        },
      });
      setStatus(elements.projectFormStatus, result.created ? 'Project record saved.' : 'A project with that name already exists; it was reused without overwriting its details.', 'success');
      if (result.created) elements.projectForm.reset();
      await loadAtlasData();
      openProject(result.project.id);
    } catch (error) {
      setStatus(elements.projectFormStatus, error.message, 'error');
    }
  });

  document.querySelectorAll('[data-owner-jump]').forEach((button) => {
    button.addEventListener('click', () => document.querySelector('.atlas-owner-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });
  window.addEventListener('pagehide', () => { ownerToken = ''; });
  renderManualPreview();
  loadAtlasData();
  const requestedProject = new URLSearchParams(window.location.search).get('project');
  if (requestedProject && /^\d+$/.test(requestedProject)) openProject(requestedProject);
})();
