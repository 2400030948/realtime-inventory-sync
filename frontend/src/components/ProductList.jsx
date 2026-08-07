export default function ProductList({ products, onAdjust }) {
  return (
    <table className="product-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>SKU</th>
          <th>Outlet</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p._id} className={p.quantity <= p.lowStockThreshold ? 'low-stock' : ''}>
            <td>{p.name}</td>
            <td>{p.sku}</td>
            <td>{p.outlet}</td>
            <td>{p.quantity}</td>
            <td>${p.price.toFixed(2)}</td>
            <td>
              <button onClick={() => onAdjust(p._id, -1)}>-1</button>
              <button onClick={() => onAdjust(p._id, 1)}>+1</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
