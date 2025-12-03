import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SearchExperience, SEARCH_DEBOUNCE_MS } from "@/app/search/page";

describe("SearchExperience", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("debounces search requests and navigations", async () => {
    const searchFn = jest.fn().mockResolvedValue([]);
    const onNavigate = jest.fn();

    render(
      <SearchExperience
        initialQuery=""
        searchFn={searchFn}
        onNavigate={onNavigate}
      />,
    );

    const input = screen.getByTestId("search-input");

    fireEvent.change(input, { target: { value: "sh" } });
    fireEvent.change(input, { target: { value: "shoes" } });

    expect(searchFn).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50);
    });
    expect(searchFn).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => expect(searchFn).toHaveBeenCalledTimes(1));
    expect(searchFn).toHaveBeenCalledWith("shoes");
    expect(onNavigate).toHaveBeenCalledWith("shoes");
  });
});
