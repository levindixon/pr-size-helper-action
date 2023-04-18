const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");

const handleReasonComment = async (
  octokit,
  issueRepo,
  issueOwner,
  repo,
  owner,
  prUrl,
  prNumber,
  prLabels,
  prAuthorLogin,
  reasonCommentUrl,
  reasonCommentBody,
  reasonCommentAuthorLogin,
  githubPAT
) => {
  let patOctokit;

  if (githubPAT) {
    core.info("Initializing Octokit with ACCESS_TOKEN...");

    patOctokit = new Octokit({
      auth: `token ${githubPAT}`,
      userAgent: "levindixon/pr-size-helper-action",
    });
  }

  core.info(
    `${
      patOctokit
        ? "Using ACCESS_TOKEN to search"
        : "Using GITHUB_TOKEN to search"
    }`
  );

  const existingIssues = await (
    patOctokit || octokit
  ).search.issuesAndPullRequests({
    q: `is:open is:issue repo:${issueOwner}/${issueRepo} in:title [ PR Size Helper ]: Digest`,
  });

  const existingIssue = existingIssues.data.items.find(
    (issue) => issue.title === "[ PR Size Helper ]: Digest"
  );

  core.info(
    existingIssue
      ? "Existing digest issue found!"
      : "No existing digest issue found."
  );

  let newIssue;

  if (!existingIssue) {
    core.info("Creating new digest issue...");

    newIssue = await (patOctokit || octokit).issues.create({
      owner: issueOwner,
      repo: issueRepo,
      title: "[ PR Size Helper ]: Digest",
      body: `Welcome to your PR Size Helper Digest!

This issue collects and indexes all of the \`!reason\` prefixed comments left in pull requests.
${
  issueRepo !== repo
    ? ``
    : `Here are some helpful links:

- All **open** PRs labelled [\`size/XXL\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FXXL) [\`size/XL\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FXL) [\`size/L\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FL) [\`size/M\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FM) [\`size/S\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FS) [\`size/XS\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FXS)
- All **closed** PRs labelled [\`size/XXL\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FXXL) [\`size/XL\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FXL) [\`size/L\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FL) [\`size/M\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FM) [\`size/S\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FS) [\`size/XS\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FXS)`
}

_Note: The title of this issue is important. If you decide to change it, the PR Size Helper action will create a new "[ PR Size Helper ]: Digest" issue the next time someone creates a \`!reason\` prefixed PR comment._`,
    });
  }

  core.info("Leaving reason comment...");

  const comment = await (patOctokit || octokit).issues.createComment({
    owner: issueOwner,
    repo: issueRepo,
    issue_number: existingIssue ? existingIssue.number : newIssue.data.number,
    body: `## ${prUrl}

  \`${
    prLabels.find((label) => label.name.startsWith("size/")).name
  }\` created by @${prAuthorLogin}

  ## [Reason](${reasonCommentUrl})
  >  ${reasonCommentBody.replace("!reason", "")}`,
  });

  core.info("Thanking reason author and linking to digest issue...");

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: `Thanks @${reasonCommentAuthorLogin}! I've added your reason here: ${comment.data.html_url} 📝`,
  });
};

module.exports = handleReasonComment;
