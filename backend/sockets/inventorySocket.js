/**
 * Registers Socket.io connection handling.
 * Clients join an "outlet room" so stock events are scoped efficiently,
 * plus a global room for cross-outlet dashboards.
 */
function registerInventorySocket(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('outlet:join', (outlet) => {
      socket.join(outlet);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = registerInventorySocket;
