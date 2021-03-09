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
  10: "S",
  30: "M",
  100: "L",
  500: "XL",
  1000: "XXL",
};

module.exports = {
  SIZES,
  LABEL_COLORS,
  HANDLED_ACTION_TYPES,
};
