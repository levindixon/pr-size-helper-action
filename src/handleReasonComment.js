const handleReasonComment = async (
  octokit,
  repo,
  owner,
  prUrl,
  prNumber,
  prLabels,
  prAuthorLogin,
  reasonCommentUrl,
  reasonCommentBody
) => {
  const existingIssues = await octokit.search.issuesAndPullRequests({
    q: `is:open is:issue repo:${owner}/${repo} in:title [ PR Size Helper ]: Digest`,
  });

  const existingIssue = existingIssues.data.items.find(
    (issue) => issue.title === "[ PR Size Helper ]: Digest"
  );

  let newIssue;

  if (!existingIssue) {
    newIssue = await octokit.issues.create({
      owner,
      repo,
      title: "[ PR Size Helper ]: Digest",
      body: `Welcome to your PR Size Helper Digest!

This issue collects and indexes all of the \`!reason\` prefixed comments left in pull requests.

Here are some helpful links:

All **open** PRs labelled [\`size/XXL\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FXXL) [\`size/XL\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FXL) [\`size/L\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FL) [\`size/M\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FM) [\`size/S\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FS) [\`size/XS\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aopen+label%3Asize%2FXS)
All **closed** PRs labelled [\`size/XXL\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FXXL) [\`size/XL\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FXL) [\`size/L\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FL) [\`size/M\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FM) [\`size/S\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FS) [\`size/XS\`](https://github.com/${owner}/${repo}/pulls?q=is%3Apr+is%3Aclosed+label%3Asize%2FXS)

_Note: The title of this issue is important. If you decide to change it, the PR Size Helper action will create a new "[ PR Size Helper ]: Digest" issue the next time someone creates a \`!reason\` prefixed PR comment._`,
    });
  }

  const comment = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: existingIssue ? existingIssue.number : newIssue.data.number,
    body: `## ${prUrl}

  \`${
    prLabels.find((label) => label.name.startsWith("size/")).name
  }\` created by @${prAuthorLogin}

  ## [Reason](${reasonCommentUrl})
  >  ${reasonCommentBody.replace("!reason", "")}`,
  });

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: `Thanks! I've added that reason here: ${comment.data.html_url} 📝`,
  });
};

module.exports = handleReasonComment;
