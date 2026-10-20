"""GitHub repository discovery and metadata caching for Dear Pip portfolio."""

import json
import logging
import os
import re
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 900  # 15 minutes cache
_cache: Dict[str, Any] = {
    "timestamp": 0.0,
    "username": "",
    "projects": [],
}


def get_configured_github_user() -> str:
    """Resolve configured GitHub username from environment or default to repository owner."""
    user = os.environ.get("GITHUB_USERNAME") or os.environ.get("GITHUB_USER")
    if user and user.strip():
        return user.strip()
    return "zarinroushan"


def normalize_project_key(name: str) -> str:
    """Normalize a project name or slug to alphanumeric lowercase for deduplication."""
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def fetch_github_repositories(username: Optional[str] = None) -> Tuple[List[Dict[str, Any]], bool, bool]:
    """
    Fetch public repositories for the configured GitHub user.
    Returns: (projects, is_cached, is_rate_limited)
    """
    target_user = (username or get_configured_github_user()).strip()
    now = time.time()

    # Check in-memory cache
    if (
        _cache["username"].casefold() == target_user.casefold()
        and _cache["projects"]
        and (now - _cache["timestamp"]) < CACHE_TTL_SECONDS
    ):
        return _cache["projects"], True, False

    url = f"https://api.github.com/users/{target_user}/repos?sort=updated&per_page=100"
    headers = {
        "User-Agent": "Dear-Pip-Observatory/1.0 (+https://github.com/zarinroushan/pips-midnight-observatory)",
        "Accept": "application/vnd.github.v3+json",
    }
    token = os.environ.get("GITHUB_TOKEN")
    if token and token.strip():
        headers["Authorization"] = f"Bearer {token.strip()}"

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            raw = response.read().decode("utf-8")
            repos_data = json.loads(raw)
            if not isinstance(repos_data, list):
                repos_data = []
    except urllib.error.HTTPError as error:
        logger.warning("GitHub API HTTP %d for user %s: %s", error.code, target_user, error.reason)
        is_rate_limited = error.code in (403, 429)
        # If cache exists (even expired), return it safely
        if _cache["username"].casefold() == target_user.casefold() and _cache["projects"]:
            return _cache["projects"], True, is_rate_limited
        return [], False, is_rate_limited
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as error:
        logger.warning("GitHub API request failed for user %s: %s", target_user, error)
        if _cache["username"].casefold() == target_user.casefold() and _cache["projects"]:
            return _cache["projects"], True, False
        return [], False, False

    mapped_projects = []
    for repo in repos_data:
        if not isinstance(repo, dict):
            continue
        repo_name = repo.get("name")
        if not repo_name:
            continue

        language = repo.get("language")
        skills = [language] if language else []
        topics = repo.get("topics") or []
        for topic in topics:
            if topic and isinstance(topic, str) and topic not in skills:
                skills.append(topic)

        description = repo.get("description")
        if not description or not description.strip():
            description = f"Public repository by {target_user} on GitHub."

        mapped = {
            "id": f"gh-{repo.get('id', repo_name)}",
            "name": repo_name,
            "description": description.strip(),
            "repository_url": repo.get("html_url") or f"https://github.com/{target_user}/{repo_name}",
            "homepage": repo.get("homepage") or None,
            "language": language or "Other",
            "skills": skills,
            "topics": topics,
            "stars": repo.get("stargazers_count", 0),
            "forks": repo.get("forks_count", 0),
            "updated_at": repo.get("updated_at"),
            "created_at": repo.get("created_at"),
            "is_fork": repo.get("fork", False),
            "status": "archived" if repo.get("archived") else "active",
            "source": "github",
        }
        mapped_projects.append(mapped)

    _cache["timestamp"] = now
    _cache["username"] = target_user
    _cache["projects"] = mapped_projects
    return mapped_projects, False, False

