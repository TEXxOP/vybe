import { ordersAPI } from '../services/api';
import { useResource, selectOrders } from './useResource';

/**
 * The signed-in customer's own orders.
 *
 * /orders lists them; /track-order matches a reference against them. Both need
 * the same fetch, the same abort, the same three states and the same retry.
 *
 * This was written out longhand twice before becoming a hook, and then a third
 * time in the admin pages, which is what made it obvious the generic version
 * belonged in useResource. What's left here is just the naming: `data` is
 * `orders`, `setData` is `setOrders`. Callers read better for it, and the two
 * pages can't drift apart.
 *
 * `ordersAPI.getMyOrders` is passed by reference, not wrapped in an arrow —
 * useResource puts the fetcher in its dependency array, so an inline arrow would
 * refetch on every render. Same for `selectOrders`, which is a module constant.
 *
 * `setOrders` is exposed because cancelling an order patches one record in place
 * from the server's own response. Refetching the whole list to learn something
 * the response already told us would be wasteful and would make the card flicker.
 */
export function useMyOrders() {
    const { data, setData, status, error, retry } = useResource(
        ordersAPI.getMyOrders,
        selectOrders
    );

    return { orders: data || [], setOrders: setData, status, error, retry };
}
