const fs = require("fs");
const globrex = require("globrex");
const Diff = require("diff");
const core = require("@actions/core");

const { SIZES, IGNORE_COMMENT_LINES, IGNORE_COMMENT_PATTERN_MAP } = require("./constants");

const globrexOptions = { extended: true, globstar: true };

const matchLine = (line, fileName) => {
  if (IGNORE_COMMENT_LINES) {
    core.debug("Ignore comment lines set to true.")
    const ext = fileName.split('.').pop();
    const pattern = IGNORE_COMMENT_PATTERN_MAP.get(ext)
    if (pattern) {
      core.debug("Found ignore comment pattern for file extension: " + ext)
      const result = pattern.test(line)
      core.debug("Ignore comment pattern result: " + result + ", line: " + line)
      return pattern.test(line)
    }
  }
  return line.startsWith("+") || line.startsWith("-");
}

const parseIgnored = (str = "") => {
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
};

const getChangedLines = (isIgnored, diff) => {
  return Diff.parsePatch(diff)
    .flatMap(file => {
      if (isIgnored(file.oldFileName) && isIgnored(file.newFileName)) {
        return [];
      }
      return file.hunks
        .flatMap(hunk => hunk.lines)
        .filter(line => matchLine(line, file.newFileName))
    }).length
};

const getSizeLabel = (changedLines) => {
  let label = null;

  for (const lines of Object.keys(SIZES).sort((a, b) => a - b)) {
    if (changedLines >= lines) {
      label = `size/${SIZES[lines]}`;
    }
  }

  return label;
};

const getLabelChanges = (newLabel, existingLabels) => {
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
};

const ensureLabelExists = async (octokit, repo, owner, name, color) => {
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
};

const readFile = async (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, { encoding: "utf8" }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

module.exports = {
  parseIgnored,
  getChangedLines,
  getSizeLabel,
  getLabelChanges,
  ensureLabelExists,
  readFile,
};
