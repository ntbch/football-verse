"""Deterministic, disposable acceptance smoke for the Daily Matchday loop."""

import argparse
import json
import os
import subprocess
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path

from smoke import SmokeFailure, request, require


PASSWORD = "ChangeMe123!"
PASSWORD_HASH = "$2a$10$9T4S.FzAm4swQW1pDEQtXOgEdlz.6NYrMG9jyflK6RASHXrOZ7iDu"


@dataclass(frozen=True)
class DailyLoopData:
    user_id: int
    fixture_id: int
    fixture_key: str
    context_id: int
    article_id: int
    story_slug: str
    story_title: str
    source_id: int
    thread_id: int
    thread_slug: str
    thread_title: str
    email: str
    user_thread_title: str


def postgres(args, sql):
    command = [
        "docker", "compose", "-p", args.compose_project, "exec", "-T", "postgres", "psql",
        "-v", "ON_ERROR_STOP=1", "-U", args.db_user, "-d", args.db_name, "-At", "-c", sql,
    ]
    try:
        result = subprocess.run(command, check=False, text=True, capture_output=True, timeout=30)
    except FileNotFoundError as error:
        raise SmokeFailure("Daily Matchday smoke requires Docker Compose to create its disposable data") from error
    except subprocess.TimeoutExpired as error:
        raise SmokeFailure("Daily Matchday smoke timed out while preparing disposable database data") from error
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip() or "unknown PostgreSQL error"
        raise SmokeFailure(f"Daily Matchday smoke database setup failed: {message}")
    return result.stdout.strip()


def scalar(args, sql):
    value = postgres(args, sql).splitlines()
    require(len(value) == 1 and value[0], f"Expected one disposable smoke database value for: {sql[:80]}")
    return value[0]


def create_data(args):
    suffix = uuid.uuid4().hex[:12]
    fixture_key = f"daily-smoke-{suffix}"
    story_slug = f"daily-matchday-smoke-story-{suffix}"
    story_title = f"Daily Matchday source-backed smoke {suffix}"
    thread_slug = f"daily-matchday-smoke-thread-{suffix}"
    thread_title = f"Daily Matchday discussion {suffix}"
    email = f"daily-smoke-{suffix}@example.test"
    username = f"daily_smoke_{suffix}"
    user_thread_title = f"Daily Matchday browser discussion {suffix}"

    user_id = int(scalar(args, (
        "INSERT INTO users (created_at, updated_at, email, username, password_hash, status, email_verified, email_verified_at) "
        f"VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '{email}', '{username}', '{PASSWORD_HASH}', 'ACTIVE', true, CURRENT_TIMESTAMP) RETURNING id;"
    )))
    postgres(args, (
        "INSERT INTO user_profiles (user_id, display_name) "
        f"VALUES ({user_id}, '{username}') RETURNING id;"
    ))
    source_id = int(scalar(args, (
        "INSERT INTO news_sources (created_at, updated_at, name, feed_url, active) "
        f"VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Daily smoke source {suffix}', 'https://example.test/daily-smoke/{suffix}', true) RETURNING id;"
    )))
    fixture_id = int(scalar(args, (
        "INSERT INTO fixtures (fixture_id, league_slug, round, home_team, away_team, kickoff, status, scored) "
        f"VALUES ('{fixture_key}', 'premier-league', 'Daily smoke', 'Smoke Home {suffix}', 'Smoke Away {suffix}', CURRENT_TIMESTAMP + INTERVAL '1 day', 'upcoming', false) RETURNING id;"
    )))
    context_id = int(scalar(args, (
        "INSERT INTO football_contexts (type, context_key, display_name, fixture_id) "
        f"VALUES ('FIXTURE', '{fixture_key}', 'Smoke Home {suffix} vs Smoke Away {suffix}', {fixture_id}) RETURNING id;"
    )))
    article_id = int(scalar(args, (
        "INSERT INTO news_articles (created_at, updated_at, title, slug, summary, content, content_kind, status, source_id, source_url, content_hash, published_at, source_count_cached, hot_score) "
        f"VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '{story_title}', '{story_slug}', 'Deterministic source-backed story for the Daily Matchday smoke.', '<p>Deterministic Daily Matchday source-backed content.</p>', 'AGGREGATED_STORY', 'PUBLISHED', {source_id}, 'https://example.test/daily-smoke/{suffix}/story', 'daily-smoke-hash-{suffix}', CURRENT_TIMESTAMP, 1, 1.0) RETURNING id;"
    )))
    postgres(args, f"INSERT INTO news_article_contexts (article_id, context_id) VALUES ({article_id}, {context_id});")
    category_id = int(scalar(args, "SELECT id FROM forum_categories ORDER BY id LIMIT 1;"))
    thread_id = int(scalar(args, (
        "INSERT INTO forum_threads (created_at, updated_at, title, slug, category_id, author_id, context_id, pinned, locked, hidden, solved, last_activity_at) "
        f"VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '{thread_title}', '{thread_slug}', {category_id}, {user_id}, {context_id}, false, false, false, false, CURRENT_TIMESTAMP) RETURNING id;"
    )))
    postgres(args, (
        "INSERT INTO forum_posts (created_at, updated_at, thread_id, author_id, content, hidden) "
        f"VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, {thread_id}, {user_id}, 'Deterministic source-linked smoke discussion.', false);"
    ))
    return DailyLoopData(user_id, fixture_id, fixture_key, context_id, article_id, story_slug, story_title, source_id, thread_id, thread_slug, thread_title, email, user_thread_title)


def cleanup(args, data):
    # Every predicate is an ID or value generated by this run; never touch seed/developer data.
    user_thread_id = f"(SELECT id FROM forum_threads WHERE author_id = {data.user_id} AND context_id = {data.context_id} AND title = '{data.user_thread_title}')"
    queries = [
        f"DELETE FROM forum_posts WHERE thread_id IN ({data.thread_id}, {user_thread_id});",
        f"DELETE FROM forum_thread_follows WHERE thread_id IN ({data.thread_id}, {user_thread_id});",
        f"DELETE FROM forum_threads WHERE id IN ({data.thread_id}, {user_thread_id});",
        f"DELETE FROM news_article_contexts WHERE article_id = {data.article_id} AND context_id = {data.context_id};",
        f"DELETE FROM story_items WHERE story_id = {data.article_id};",
        f"DELETE FROM news_articles WHERE id = {data.article_id};",
        f"DELETE FROM football_contexts WHERE id = {data.context_id};",
        f"DELETE FROM fixtures WHERE id = {data.fixture_id};",
        f"DELETE FROM news_sources WHERE id = {data.source_id};",
        f"DELETE FROM refresh_tokens WHERE user_id = {data.user_id};",
        f"DELETE FROM user_profiles WHERE user_id = {data.user_id};",
        f"DELETE FROM users WHERE id = {data.user_id};",
    ]
    for query in queries:
        postgres(args, query)


def verify_context(args, data):
    response = request("GET", f"{args.base.rstrip('/')}/contexts/fixtures/{data.fixture_key}")
    require(response["context"]["id"] == data.context_id, "Daily Matchday context did not return its exact fixture context")
    require(any(item["slug"] == data.story_slug for item in response["news"]), "Daily Matchday context did not return its source-backed story")
    require(any(item["slug"] == data.thread_slug for item in response["threads"]), "Daily Matchday context did not return its exact discussion thread")


def run_browser(args, data):
    environment = os.environ.copy()
    environment.update({
        "DAILY_LOOP_BROWSER_SMOKE": "1",
        "DAILY_LOOP_WEB_URL": args.web.rstrip("/"),
        "DAILY_LOOP_FIXTURE_ID": data.fixture_key,
        "DAILY_LOOP_STORY_TITLE": data.story_title,
        "DAILY_LOOP_THREAD_TITLE": data.thread_title,
        "DAILY_LOOP_USER_THREAD_TITLE": data.user_thread_title,
        "DAILY_LOOP_EMAIL": data.email,
        "DAILY_LOOP_PASSWORD": PASSWORD,
    })
    browser_test = Path(args.browser_test).resolve()
    command = [args.node, "--experimental-strip-types", str(browser_test)]
    try:
        result = subprocess.run(command, check=False, text=True, env=environment, timeout=90)
    except FileNotFoundError as error:
        raise SmokeFailure(f"Daily Matchday browser prerequisite is missing: Node executable '{args.node}'") from error
    except subprocess.TimeoutExpired as error:
        raise SmokeFailure("Daily Matchday browser smoke timed out") from error
    if result.returncode != 0:
        raise SmokeFailure("Daily Matchday browser smoke failed; ensure Playwright Chromium is installed and runnable")


def main():
    parser = argparse.ArgumentParser(description="Deterministic Daily Matchday browser smoke")
    parser.add_argument("--base", default="http://127.0.0.1:18000/api/v1")
    parser.add_argument("--web", default="http://127.0.0.1:13000")
    parser.add_argument("--compose-project", required=True)
    parser.add_argument("--db-name", default=os.environ.get("DB_NAME", "football_verse_smoke"))
    parser.add_argument("--db-user", default=os.environ.get("DB_USERNAME", "football_verse_smoke"))
    parser.add_argument("--node", default="node")
    parser.add_argument("--browser-test", default=str(Path(__file__).resolve().parents[1] / "apps/web/tests/daily-loop.browser.test.ts"))
    args = parser.parse_args()

    data = None
    try:
        data = create_data(args)
        verify_context(args, data)
        run_browser(args, data)
    finally:
        if data is not None:
            cleanup(args, data)
    print(json.dumps({"status": "passed", "checks": ["daily-matchday-context", "daily-matchday-browser", "daily-matchday-cleanup"]}))


if __name__ == "__main__":
    try:
        main()
    except SmokeFailure as error:
        raise SystemExit(f"Daily Matchday smoke failed: {error}") from error
