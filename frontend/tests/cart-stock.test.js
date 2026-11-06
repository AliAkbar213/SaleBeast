import test from 'node:test';
import assert from 'node:assert/strict';
import { addCartItem, getAvailableStock, limitCartQuantity, setCartItemQuantity } from '../src/utils/cartStock.js';

test('repeated additions stop at stock and keep other cart items intact', () => {
  const other = { id: 2, stock: 8, quantity: 3 };
  const product = { id: 1, stock: 2 };
  let items = [other];
  for (let i = 0; i < 10; i++) items = addCartItem(items, product);
  assert.deepEqual(items, [other, { ...product, quantity: 2 }]);
  items = setCartItemQuantity(items, 1, 1);
  assert.equal(addCartItem(items, product)[1].quantity, 2);
});

test('zero, null, negative, missing and invalid stock cannot be added', () => {
  for (const stock of [0, '0', null, undefined, -1, 'invalid', Infinity]) {
    assert.equal(getAvailableStock({ stock }), 0);
    assert.deepEqual(addCartItem([], { id: 1, stock }), []);
  }
  assert.equal(getAvailableStock({ stock: '3' }), 3);
});

test('quantity updates clamp to stock and remove items below one', () => {
  const items = [{ id: 1, stock: 3, quantity: 1 }];
  assert.equal(setCartItemQuantity(items, 1, 100)[0].quantity, 3);
  assert.equal(setCartItemQuantity(items, 1, 2.8)[0].quantity, 2);
  assert.deepEqual(setCartItemQuantity(items, 1, 0), []);
  assert.deepEqual(setCartItemQuantity(items, 1, -1), []);
});

test('saved quantities and additions respect reduced stock', () => {
  assert.equal(limitCartQuantity({ stock: 2 }, 8), 2);
  assert.equal(limitCartQuantity({ stock: null }, 8), 0);
  assert.deepEqual(addCartItem([{ id: 1, stock: 8, quantity: 8 }], { id: 1, stock: 2 }),
    [{ id: 1, stock: 2, quantity: 2 }]);
});
