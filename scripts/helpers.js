import faker from "k6/x/faker";
export function generateLogBody(minSize = 256, maxSize = 2048) {
  const targetLength =
    Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
  let text = "";

  while (text.length < targetLength) {
    text += faker.language.language() + " ";
  }

  return text.slice(0, targetLength);
}
