// Build docs/stats.json from the GitHub GraphQL API.
//
// Node 20+, no dependencies (uses built-in fetch). Authenticates as the
// authenticated viewer with a classic PAT (scopes: repo + read:user) so that
// PRIVATE repositories and restricted (private) contributions are included.
//
// Usage: STATS_TOKEN=<pat> node scripts/build-stats.mjs
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOKEN = process.env.STATS_TOKEN;
if (!TOKEN) {
  console.error("Missing STATS_TOKEN env var.");
  process.exit(1);
}

const TOP_N_LANGUAGES = 8;
const ENDPOINT = "https://api.github.com/graphql";
const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "docs",
  "stats.json"
);

// Queried as `viewer` so restrictedContributionsCount (private contributions)
// and private repositories resolve with the owner's own token.
const PAGE_QUERY = `
query ($after: String) {
  rateLimit { cost remaining resetAt }
  viewer {
    login
    name
    followers { totalCount }
    following { totalCount }
    allRepos: repositories(ownerAffiliations: OWNER) { totalCount }
    repositories(
      ownerAffiliations: OWNER
      isFork: false
      first: 100
      after: $after
      orderBy: { field: STARGAZERS, direction: DESC }
    ) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        nameWithOwner
        isPrivate
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      restrictedContributionsCount
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      totalRepositoryContributions
      contributionCalendar { totalContributions }
    }
  }
}`;

async function gql(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "eschgi-stats-builder",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error("GraphQL errors: " + JSON.stringify(json.errors));
  return json.data;
}

async function main() {
  const langTotals = new Map(); // name -> { size, color }
  let totalStars = 0;
  let nonForkRepoCount = 0;
  let viewer = null;
  let after = null;
  let hasNext = true;
  let pages = 0;

  while (hasNext) {
    const data = await gql(PAGE_QUERY, { after });
    pages++;
    viewer = data.viewer; // scalar fields are stable across pages
    const repos = data.viewer.repositories;
    nonForkRepoCount = repos.totalCount;

    for (const repo of repos.nodes) {
      totalStars += repo.stargazerCount || 0;
      for (const edge of repo.languages.edges) {
        const key = edge.node.name;
        const prev = langTotals.get(key) || { size: 0, color: edge.node.color };
        prev.size += edge.size || 0;
        if (!prev.color && edge.node.color) prev.color = edge.node.color;
        langTotals.set(key, prev);
      }
    }

    hasNext = repos.pageInfo.hasNextPage;
    after = repos.pageInfo.endCursor;
    console.log(
      `page ${pages}: ${repos.nodes.length} repos, rateLimit.remaining=${data.rateLimit.remaining}`
    );
  }

  const totalLangSize =
    [...langTotals.values()].reduce((a, l) => a + l.size, 0) || 1;
  const languages = [...langTotals.entries()]
    .map(([name, v]) => ({ name, size: v.size, color: v.color || null }))
    .sort((a, b) => b.size - a.size)
    .slice(0, TOP_N_LANGUAGES)
    .map((l) => ({
      name: l.name,
      color: l.color,
      percent: Math.round((l.size / totalLangSize) * 1000) / 10,
    }));

  const c = viewer.contributionsCollection;

  const stats = {
    generatedAt: new Date().toISOString(),
    login: viewer.login,
    name: viewer.name,
    followers: viewer.followers.totalCount,
    following: viewer.following.totalCount,
    repos: {
      total: viewer.allRepos.totalCount, // incl. forks + private
      nonFork: nonForkRepoCount, // incl. private, excl. forks
    },
    stars: totalStars, // summed across owned non-fork repos (private incl.)
    contributions: {
      // Rolling last 365 days; calendar total already includes private.
      lastYearTotal: c.contributionCalendar.totalContributions,
      commits: c.totalCommitContributions,
      restrictedPrivate: c.restrictedContributionsCount,
      pullRequests: c.totalPullRequestContributions,
      reviews: c.totalPullRequestReviewContributions,
      issues: c.totalIssueContributions,
      repositories: c.totalRepositoryContributions,
    },
    languages, // [{ name, color, percent }]
    schemaVersion: 1,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(stats, null, 2) + "\n", "utf8");
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
