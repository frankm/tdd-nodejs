const range = (start, end) => {
  if (end === undefined) {
    end = start;
    start = 1;
  }
  return [...Array(end - start + 1).keys()].map((i) => start + i);
};

module.exports = { range };
