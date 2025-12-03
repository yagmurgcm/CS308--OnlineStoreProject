import { act, render, screen, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';

import { CartProvider, useCart } from '../lib/cart-context';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

jest.mock('../lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseAuth = useAuth as jest.Mock;

let latestContext: ReturnType<typeof useCart> | null = null;

const CaptureCart = () => {
  const ctx = useCart();
  useEffect(() => {
    latestContext = ctx;
  }, [ctx]);
  return <span data-testid="total">{ctx.totalItems}</span>;
};

const guestCartResponse = (token: string, items = []) => ({
  id: 1,
  userId: null,
  guestToken: token,
  items,
});

const makeServerItem = (id: number, quantity: number, name: string) => ({
  id,
  quantity,
  variant: {
    id,
    color: 'Red',
    size: 'M',
    price: 100,
    product: {
      id: id * 10,
      name,
      price: 100,
      image: null,
    },
  },
});

describe('Cart retention (frontend)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    latestContext = null;
    mockedUseAuth.mockReturnValue({ user: null });
    mockedApi.post.mockResolvedValue(guestCartResponse('bootstrap-token'));
    mockedApi.get.mockResolvedValue(guestCartResponse('bootstrap-token'));
    mockedApi.delete.mockResolvedValue(undefined);
  });

  it('restores guest cart from localStorage token', async () => {
    localStorage.setItem('guestCartToken', 'guest-token');
    mockedApi.post.mockResolvedValue(guestCartResponse('guest-token'));
    mockedApi.get.mockImplementation((path: string) => {
      if (path === '/cart/guest/guest-token') {
        return Promise.resolve(
          guestCartResponse('guest-token', [makeServerItem(1, 2, 'Cap')]),
        );
      }
      throw new Error(`Unexpected GET ${path}`);
    });

    render(
      <CartProvider>
        <CaptureCart />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('2'));
  });

  it('loads server cart for authenticated users', async () => {
    mockedUseAuth.mockReturnValue({ user: { id: 77 } });
    mockedApi.get.mockImplementation((path: string) => {
      if (path === '/cart/77') {
        return Promise.resolve({
          id: 10,
          userId: 77,
          guestToken: null,
          items: [makeServerItem(2, 3, 'Sneaker')],
        });
      }
      throw new Error(`Unexpected GET ${path}`);
    });

    render(
      <CartProvider>
        <CaptureCart />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('3'));
  });

  it('clears guest cart after invoking clearCart', async () => {
    localStorage.setItem('guestCartToken', 'guest-clear');
    mockedApi.post.mockResolvedValue(guestCartResponse('guest-clear'));
    mockedApi.get
      .mockResolvedValueOnce(
        guestCartResponse('guest-clear', [makeServerItem(1, 2, 'Hat')]),
      )
      .mockResolvedValueOnce(guestCartResponse('guest-clear', []));

    render(
      <CartProvider>
        <CaptureCart />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('2'));
    expect(latestContext).not.toBeNull();

    await act(async () => {
      await latestContext!.clearCart();
    });

    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('0'));
    expect(mockedApi.delete).toHaveBeenCalledWith('/cart/guest/guest-clear/clear');
  });

  it('creates a new guest cart when no token exists', async () => {
    mockedApi.post.mockResolvedValue(
      guestCartResponse('new-token', [makeServerItem(5, 1, 'Scarf')]),
    );

    render(
      <CartProvider>
        <CaptureCart />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('1'));
    expect(mockedApi.post).toHaveBeenCalledWith('/cart/guest');
    expect(localStorage.getItem('guestCartToken')).toBe('new-token');
  });

  it('handles empty carts without errors', async () => {
    localStorage.setItem('guestCartToken', 'guest-empty');
    mockedApi.get.mockResolvedValue(guestCartResponse('guest-empty'));

    render(
      <CartProvider>
        <CaptureCart />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('0'));
  });
});
