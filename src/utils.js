const fs = require("fs");
const globrex = require("globrex");
const Diff = require("diff");

const { SIZES } = require("./constants");

const globrexOptions = { extended: true, globstar: true };

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
    .flatMap((file) =>
      isIgnored(file.oldFileName) && isIgnored(file.newFileName)
        ? []
        : file.hunks
    )
    .flatMap((hunk) => hunk.lines)
    .filter((line) => line[0] === "+" || line[0] === "-").length;
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
