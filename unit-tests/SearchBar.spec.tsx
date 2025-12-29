import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SearchExperience, SEARCH_DEBOUNCE_MS } from "@/app/search/page";

describe("Search Bar component", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderSearch = (overrides: Partial<React.ComponentProps<typeof SearchExperience>> = {}) => {
    const searchFn = jest.fn().mockResolvedValue([]);
    const onNavigate = jest.fn();
    render(
      <SearchExperience
        initialQuery=""
        searchFn={overrides.searchFn ?? searchFn}
        onNavigate={overrides.onNavigate ?? onNavigate}
      />,
    );
    return {
      input: screen.getByTestId("search-input") as HTMLInputElement,
      searchFn: overrides.searchFn ?? searchFn,
      onNavigate: overrides.onNavigate ?? onNavigate,
    };
  };

  it("renders the search input", () => {
    const { input } = renderSearch();
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toContain("Search products");
  });

  it("typing triggers onChange and debounced search", async () => {
    const { input, searchFn } = renderSearch();

    fireEvent.change(input, { target: { value: "boots" } });

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() => expect(searchFn).toHaveBeenCalledWith("boots"));
  });

  it("pressing Enter submits the form immediately", async () => {
    const { input, searchFn } = renderSearch();
    const form = screen.getByRole("form", { name: /search products/i });

    fireEvent.change(input, { target: { value: "coat" } });
    fireEvent.submit(form);

    await waitFor(() => expect(searchFn).toHaveBeenCalledWith("coat"));
  });

  it("clicking the search button triggers the callback", async () => {
    const { input, searchFn } = renderSearch();

    fireEvent.change(input, { target: { value: "denim" } });
    fireEvent.click(screen.getByRole("button", { name: /run search/i }));

    await waitFor(() => expect(searchFn).toHaveBeenCalledWith("denim"));
  });

  it("clearing the field resets navigation state", async () => {
    const { input, searchFn, onNavigate } = renderSearch();

    fireEvent.change(input, { target: { value: "hat" } });

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    await waitFor(() => expect(searchFn).toHaveBeenCalledWith("hat"));

    fireEvent.change(input, { target: { value: "" } });

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(""));
    expect(searchFn).toHaveBeenCalledTimes(1);
  });
});
