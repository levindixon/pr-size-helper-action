const core = require("@actions/core");

const { LABEL_COLORS } = require("./constants");
const {
  parseIgnored,
  getChangedLines,
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
      accept: "application/vnd.github.v3.diff",
    },
  });

  const changedLines = getChangedLines(isIgnored, pullRequestDiff.data);

  core.info("Changed lines:", changedLines);

  const sizeLabel = getSizeLabel(changedLines);

  core.info("Matching label:", sizeLabel);

  const sizeLabelColor = LABEL_COLORS[sizeLabel];

  await ensureLabelExists(octokit, repo, owner, sizeLabel, sizeLabelColor);

  const { add, remove } = getLabelChanges(sizeLabel, prLabels);

  if (add.length === 0 && remove.length === 0) {
    core.info("Correct label already assigned");

    return false;
  }

  if (add.length > 0) {
    core.info("Adding labels:", add);

    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: add,
    });

    if (sizeLabel === "size/XL" || sizeLabel === "size/XXL") {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: `👋 @${prAuthorLogin} this pull request is a bit large 😮

If you have time, please leave a comment prefixed with \`!reason\` explaining why, thanks!`,
      });
    }
  }

  for (const label of remove) {
    core.info("Removing label:", label);

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
