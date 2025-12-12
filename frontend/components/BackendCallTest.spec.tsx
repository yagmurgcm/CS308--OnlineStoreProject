import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useState } from "react";

const BackendCallTestComponent = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  const handleClick = async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/backend-call", { method: "POST" });
      const data = await response.json();
      setStatus(data?.message ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div>
      <button onClick={handleClick}>Call Backend</button>
      <p data-testid="status-message">{status}</p>
    </div>
  );
};

describe("BackendCallTest component", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("updates status from loading to success after backend call", async () => {
    render(<BackendCallTestComponent />);

    fireEvent.click(screen.getByText("Call Backend"));

    expect(screen.getByTestId("status-message").textContent).toBe("loading");

    await waitFor(() =>
      expect(screen.getByTestId("status-message").textContent).toBe("success"),
    );

    expect(global.fetch).toHaveBeenCalledWith("/api/backend-call", {
      method: "POST",
    });
  });
});
