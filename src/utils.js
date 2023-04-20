const fs = require("fs");
const process = require("process");
const globrex = require("globrex");
const Diff = require("diff");

const { SIZES, IGNORE_COMMENT_LINES, IGNORE_COMMENT_PATTERN_MAP, TEST_MATCH_MAP, GITHUB_ACTIONS } = require("./constants");

const debug = GITHUB_ACTIONS === 'true' ? 
  require("@actions/core").debug : 
  console.log 

const globrexOptions = { extended: true, globstar: true };

const defaultTest = line => {
  return /^[+-]\s*\S+/.test(line);
}

const singleWordTest = line => {
  return /^[+-]\s*(["'`]?)\b\w+\b\1\S?$/.test(line);
}

const matchLine = (line, fileName) => {
  if (IGNORE_COMMENT_LINES) {
    debug("Ignore comment lines set to true.")
    const ext = fileName.split('.').pop();
    const pattern = IGNORE_COMMENT_PATTERN_MAP.get(ext)
    if (pattern) {
      debug("Found ignore comment pattern for file extension: " + ext)
      const result = pattern.test(line)
      debug("Ignore comment pattern result: " + result + ", line: " + line)
      return pattern.test(line) && defaultTest(line)
    }
  }
  // Return any lines that start with +/- that have any non-whitespace characters (i.e. whitespace changes are ignored)
  return defaultTest(line);
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

const isTestFile = (fileName) => {
  const ext = fileName.split('.').pop()
  const testMatch = TEST_MATCH_MAP[ext];
  if (testMatch) {
    return testMatch.test(fileName);
  }
  return false;
}

const singleWordDeduction = 0.5;
const testFileDeduction = 0.5

const scoreFile = (file) => (
  file.hunks
    .flatMap(hunk => hunk.lines)
    .reduce((score, line) => {
      let points = 0;
      const matched = matchLine(line, file.newFileName)
      if (matched) {
        points++
        if (singleWordTest(line)) {
          debug(`Single word change detected: ${line} -- deducting ${singleWordDeduction} from score.`)
          points -= singleWordDeduction;
        }
        if (isTestFile(file.newFileName)) {
          debug(`Test file change detected: ${file.newFileName}: ${line} -- deducting ${testFileDeduction} from score.`)
          points -= testFileDeduction;
        }
      }
      return score + points
    }, 0)
)

const scoreChanges = (isIgnored, diff) => (
  Diff.parsePatch(diff)
    .filter(file => !(isIgnored(file.oldFileName) && isIgnored(file.newFileName)))
    .reduce((score, file) => score + scoreFile(file), 0)
)

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
  scoreChanges,
  getSizeLabel,
  getLabelChanges,
  ensureLabelExists,
  readFile
};
