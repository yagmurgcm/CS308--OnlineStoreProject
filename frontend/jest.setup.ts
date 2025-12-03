import "@testing-library/jest-dom";
import React from "react";

// Provide simple mocks for Next.js components in tests without JSX in setup
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...rest }: any) =>
    React.createElement("img", {
      src: typeof src === "string" ? src : "",
      alt,
      ...rest,
    }),
}));

jest.mock("next/link", () => {
  return ({ children, href, ...rest }: any) =>
    React.createElement("a", { href, ...rest }, children);
});
