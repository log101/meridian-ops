import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import WelcomePage from "../page";

describe("WelcomePage", () => {
  it("displays the text 'Welcome to this page'", () => {
    const html = renderToStaticMarkup(<WelcomePage />);
    expect(html).toContain("Welcome to this page");
  });
});
