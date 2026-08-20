export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Local Item Swap - Backend Phase 1</h1>
      <p>
        The backend is ready. API endpoints are available at:
      </p>
      <ul>
        <li><code>POST /api/auth/signin</code> - Authentication</li>
        <li><code>GET /api/users/me</code> - Get user profile</li>
        <li><code>PATCH /api/users/me</code> - Update user profile</li>
        <li><code>GET /api/items</code> - List items</li>
        <li><code>POST /api/items</code> - Create item</li>
        <li><code>GET /api/items/:id</code> - Get item details</li>
        <li><code>DELETE /api/items/:id</code> - Delete item</li>
        <li><code>POST /api/swaps</code> - Create swap request</li>
        <li><code>PATCH /api/swaps/:id</code> - Update swap status</li>
        <li><code>GET /api/swaps/my</code> - Get my swaps</li>
      </ul>
      <p style={{ marginTop: '1rem' }}>
        See <code>docs/api.md</code> for full API documentation.
      </p>
    </main>
  );
}
