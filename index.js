const fs = require("fs");
const process = require("process");

const core = require("@actions/core");
const { Octokit } = require("@octokit/rest");
const globrex = require("globrex");
const Diff = require("diff");

const sizes = {
  0: "XS",
  10: "S",
  30: "M",
  100: "L",
  500: "XL",
  1000: "XXL",
};

const colors = {
  "size/XS": "3CBF00",
  "size/S": "5D9801",
  "size/M": "7F7203",
  "size/L": "A14C05",
  "size/XL": "C32607",
  "size/XXL": "E50009",
};

const PullRequestActions = ["opened", "synchronize", "reopened", "created"];

const globrexOptions = { extended: true, globstar: true };

function parseIgnored(str = "") {
  const ignored = str
    .split(/\r|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("#"))
    .map((s) =>
      s.length > 1 && s[0] === "!"
        ? { not: globrex(s.substr(1), globrexOptions) }
        : globrex(s, globrexOptions)
    );

  function isIgnored(path) {
    if (path == null || path === "/dev/null") {
      return true;
    }
    const pathname = path.substr(2);
    let ignore = false;
    for (const entry of ignored) {
      if (entry.not) {
        if (pathname.match(entry.not.regex)) {
          return false;
        }
      } else if (!ignore && pathname.match(entry.regex)) {
        ignore = true;
      }
    }
    return ignore;
  }

  return isIgnored;
}

async function readFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, { encoding: "utf8" }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function getChangedLines(isIgnored, diff) {
  return Diff.parsePatch(diff)
    .flatMap((file) =>
      isIgnored(file.oldFileName) && isIgnored(file.newFileName)
        ? []
        : file.hunks
    )
    .flatMap((hunk) => hunk.lines)
    .filter((line) => line[0] === "+" || line[0] === "-").length;
}

function getSizeLabel(changedLines) {
  let label = null;

  for (const lines of Object.keys(sizes).sort((a, b) => a - b)) {
    if (changedLines >= lines) {
      label = `size/${sizes[lines]}`;
    }
  }

  return label;
}

function getLabelChanges(newLabel, existingLabels) {
  const add = [newLabel];
  const remove = [];

  for (const existingLabel of existingLabels) {
    const { name } = existingLabel;
    if (name.startsWith("size/")) {
      if (name === newLabel) {
        add.pop();
      } else {
        remove.push(name);
      }
    }
  }

  return { add, remove };
}

async function ensureLabelExists(octokit, repo, owner, name, color) {
  try {
    return await octokit.issues.getLabel({
      owner,
      repo,
      name,
    });
  } catch (e) {
    return octokit.issues.createLabel({
      owner,
      repo,
      name,
      color,
    });
  }
}

async function run() {
  try {
    core.info("Running size-label-action...");

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_TOKEN) {
      throw new Error("Environment variable GITHUB_TOKEN not set!");
    }

    const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH;

    if (!GITHUB_EVENT_PATH) {
      throw new Error("Environment variable GITHUB_EVENT_PATH not set!");
    }

    const eventDataStr = await readFile(GITHUB_EVENT_PATH);
    const eventData = JSON.parse(eventDataStr);

    if (!eventData) {
      throw new Error(`Invalid GITHUB_EVENT_PATH contents: ${eventDataStr}`);
    }

    core.info("Event payload:", eventDataStr);

    if (!PullRequestActions.includes(eventData.action)) {
      console.log("Action will be ignored:", eventData.action);

      return false;
    }

    if (
      eventData.comment &&
      eventData.action === "created" &&
      eventData.comment.body.includes("!reason")
    ) {
      const octokit = new Octokit({
        auth: `token ${GITHUB_TOKEN}`,
        userAgent: "pascalgn/size-label-action",
      });

      const existingIssues = await octokit.search.issuesAndPullRequests({
        q: `is:open is:issue repo:${process.env.GITHUB_REPOSITORY} in:title [PR Size Helper]: Digest`,
      });

      const existingIssue = existingIssues.data.items.find(
        (issue) => issue.title === "[PR Size Helper]: Digest"
      );

      let newIssue;

      if (!existingIssue) {
        newIssue = await octokit.issues.create({
          owner: eventData.repository.owner.login,
          repo: eventData.repository.name,
          title: "[PR Size Helper]: Digest",
        });
      }

      const comment = await octokit.issues.createComment({
        owner: eventData.repository.owner.login,
        repo: eventData.repository.name,
        issue_number: existingIssue
          ? existingIssue.number
          : newIssue.data.number,
        body: `## ${eventData.issue.html_url}

\`${
          eventData.issue.labels.find((label) => label.name.startsWith("size/"))
            .name
        }\` created by @${eventData.issue.user.login}

## [Reason](${eventData.comment.html_url})
>  ${eventData.comment.body.replace("!reason", "")}`,
      });

      await octokit.issues.createComment({
        owner: eventData.repository.owner.login,
        repo: eventData.repository.name,
        issue_number: eventData.issue.number,
        body: `Thanks! I've added that reason here: ${comment.data.html_url} 📝`,
      });

      return true;
    }

    const isIgnored = parseIgnored(process.env.IGNORED);

    const pullRequestHome = {
      owner: eventData.pull_request.base.repo.owner.login,
      repo: eventData.pull_request.base.repo.name,
    };

    const pull_number = eventData.pull_request.number;

    const octokit = new Octokit({
      auth: `token ${GITHUB_TOKEN}`,
      userAgent: "pascalgn/size-label-action",
    });

    const pullRequestDiff = await octokit.pulls.get({
      ...pullRequestHome,
      pull_number,
      headers: {
        accept: "application/vnd.github.v3.diff",
      },
    });

    const changedLines = getChangedLines(isIgnored, pullRequestDiff.data);

    console.log("Changed lines:", changedLines);

    const sizeLabel = getSizeLabel(changedLines);

    console.log("Matching label:", sizeLabel);

    const sizeLabelColor = colors[sizeLabel];

    await ensureLabelExists(
      octokit,
      pullRequestHome.repo,
      pullRequestHome.owner,
      sizeLabel,
      sizeLabelColor
    );

    const { add, remove } = getLabelChanges(
      sizeLabel,
      eventData.pull_request.labels
    );

    if (add.length === 0 && remove.length === 0) {
      console.log("Correct label already assigned");
      return false;
    }

    if (add.length > 0) {
      core.info("Adding labels:", add);

      await octokit.issues.addLabels({
        ...pullRequestHome,
        issue_number: pull_number,
        labels: add,
      });

      if (sizeLabel === "size/XL" || sizeLabel === "size/XXL") {
        await octokit.issues.createComment({
          ...pullRequestHome,
          issue_number: pull_number,
          body: `👋 @${eventData.pull_request.user.login} this pull request is a bit large 😮

If you have time, please leave a comment prefixed with \`!reason\` explaining why, thanks!`,
        });
      }
    }

    for (const label of remove) {
      core.info("Removing label:", label);

      try {
        await octokit.issues.removeLabel({
          ...pullRequestHome,
          issue_number: pull_number,
          name: label,
        });
      } catch (error) {
        core.warning("Ignoring removing label error:", error);
      }
    }

    core.info("Success!");
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
