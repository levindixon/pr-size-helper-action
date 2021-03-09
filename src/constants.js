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

module.exports = {
  SIZES,
  LABEL_COLORS,
  HANDLED_ACTION_TYPES,
  PROMPT_THRESHOLD,
};
