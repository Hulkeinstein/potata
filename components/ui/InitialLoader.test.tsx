import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InitialLoader } from "./InitialLoader";

describe("InitialLoader", () => {
  it("keeps the first client render aligned with SSR before showing a first-visit loader", async () => {
    // Given
    sessionStorage.setItem("potata-visit", "true");
    const serverHtml = renderToString(<InitialLoader />);
    sessionStorage.clear();
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    const hydrationErrors: unknown[] = [];

    // When
    const root = hydrateRoot(container, <InitialLoader />, {
      onRecoverableError: (error) => hydrationErrors.push(error),
    });
    await act(async () => undefined);

    // Then
    expect(hydrationErrors).toEqual([]);
    await waitFor(() => expect(container.textContent).toContain("Seoul to Dubai"));
    root.unmount();
  });
});
