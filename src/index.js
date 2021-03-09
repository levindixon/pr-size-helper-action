const process = require("process");

const core = require("@actions/core");
const { Octokit } = require("@octokit/rest");

const handleReasonComment = require("./handleReasonComment");
const handlePR = require("./handlePR");

const { readFile } = require("./utils");
const { HANDLED_ACTION_TYPES } = require("./constants");

const run = async () => {
  try {
    core.info("Running pr-size-helper-action...");

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

    core.debug("Event payload:", eventDataStr);

    if (!HANDLED_ACTION_TYPES.includes(eventData.action)) {
      core.info("Action will be ignored:", eventData.action);

      return;
    }

    const octokit = new Octokit({
      auth: `token ${GITHUB_TOKEN}`,
      userAgent: "levindixon/pr-size-helper-action",
    });

    if (eventData.pull_request) {
      core.info("Handling PR...");

      await handlePR(
        octokit,
        process.env.IGNORED,
        eventData.pull_request.base.repo.owner.login,
        eventData.pull_request.base.repo.name,
        eventData.pull_request.number,
        eventData.pull_request.user.login
      );

      core.info("Success!");

      return;
    }

    if (
      eventData.comment &&
      eventData.action === "created" &&
      eventData.comment.body.includes("!reason")
    ) {
      core.info("Handling reason comment...");

      await handleReasonComment(
        octokit,
        eventData.repository.name,
        eventData.repository.owner.login,
        eventData.issue.html_url,
        eventData.issue.number,
        eventData.issue.labels,
        eventData.issue.user.login,
        eventData.comment.html_url,
        eventData.comment.body,
        eventData.comment.user.login
      );

      core.info("Success!");

      return;
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
