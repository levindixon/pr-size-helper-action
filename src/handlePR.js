const core = require("@actions/core");

const { LABEL_COLORS, PROMPT_THRESHOLD, FEEDBACK_LINK } = require("./constants");
const {
  parseIgnored,
  scoreChanges,
  getSizeLabel,
  getLabelChanges,
  ensureLabelExists,
} = require("./utils");

const handlePR = async (
  octokit,
  ignored,
  owner,
  repo,
  prNumber,
  prLabels,
  prAuthorLogin
) => {
  const isIgnored = parseIgnored(ignored);

  const pullRequestDiff = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    headers: {
      accept: "application/vnd.github.diff",
    },
  });

  const score = scoreChanges(isIgnored, pullRequestDiff.data);

  core.info(`Change score: ${score}`);

  const sizeLabel = getSizeLabel(score);

  core.info(`Matching label: ${sizeLabel}`);

  const sizeLabelColor = LABEL_COLORS[sizeLabel];

  await ensureLabelExists(octokit, repo, owner, sizeLabel, sizeLabelColor);

  const { add, remove } = getLabelChanges(sizeLabel, prLabels);

  if (add.length === 0 && remove.length === 0) {
    core.info("Correct label already assigned");

    return false;
  }

  if (add.length > 0) {
    core.info(`Adding labels: ${add}`);

    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: add,
    });

    if (score >= PROMPT_THRESHOLD) {
      let body = `👋 @${prAuthorLogin} this pull request exceeds ${PROMPT_THRESHOLD} significant lines of code.

[Research](https://www.cabird.com/static/93aba3256c80506d3948983db34d3ba3/rigby2013convergent.pdf) has shown that this makes it harder for reviewers to provide quality feedback.

We recommend that you reduce the size of this PR by separating commits into stacked PRs. If that is not possible, please add a comment starting with "!reason" to describe why this PR is necessarily large.`

      if (FEEDBACK_LINK) {
        body += `\n\nFor more information and to provide feedback, please visit ${FEEDBACK_LINK}`
      }

      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: body
      });
    }
  }

  for (const label of remove) {
    core.info(`Removing label: ${label}`);

    try {
      await octokit.issues.removeLabel({
        owner,
        repo,
        issue_number: prNumber,
        name: label,
      });
    } catch (error) {
      core.warning("Ignoring removing label error:", error);
    }
  }
};

module.exports = handlePR;
