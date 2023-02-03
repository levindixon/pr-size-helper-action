const HANDLED_ACTION_TYPES = ["opened", "synchronize", "reopened", "created"];

const LABEL_COLORS = {
  "size/XS": "3CBF00",
  "size/S": "5D9801",
  "size/M": "7F7203",
  "size/L": "A14C05",
  "size/XL": "C32607",
  "size/XXL": "E50009",
};

const SIZES = {
  0: "XS",
  [Number.parseInt(process.env.S) || 10]: "S",
  [Number.parseInt(process.env.M) || 30]: "M",
  [Number.parseInt(process.env.L) || 100]: "L",
  [Number.parseInt(process.env.XL) || 500]: "XL",
  [Number.parseInt(process.env.XXL) || 1000]: "XXL",
};

const PROMPT_THRESHOLD = process.env.PROMPT_THRESHOLD || 500;

const DIGEST_ISSUE_REPO = process.env.DIGEST_ISSUE_REPO || null;

const ACCESS_TOKEN = process.env.ACCESS_TOKEN || null;

const FEEDBACK_LINK = process.env.FEEDBACK_LINK || null;

const IGNORE_COMMENT_LINES = process.env.IGNORE_COMMENT_LINES || null;

const COMMENT_CHAR_MAP = {
  "rb": "#"
}

const IGNORE_COMMENT_PATTERN_MAP = Object.entries(COMMENT_CHAR_MAP)
  .reduce((map, [ext, commentChar]) => {
    return map.set(ext, new RegExp(`^[+-](?!\\s*${commentChar}).*`))
  }, new Map())

module.exports = {
  SIZES,
  LABEL_COLORS,
  HANDLED_ACTION_TYPES,
  PROMPT_THRESHOLD,
  DIGEST_ISSUE_REPO,
  ACCESS_TOKEN,
  IGNORE_COMMENT_LINES,
  IGNORE_COMMENT_PATTERN_MAP,
  FEEDBACK_LINK
};
