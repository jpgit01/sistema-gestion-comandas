const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Sirve archivos estáticos desde la carpeta 'public'

let orders = {}; // Almacena los pedidos actuales en formato { id: { commandNumber, burger, status, itemStatuses, observations } }
let orderHistory = []; // Almacena el historial de pedidos

// Maneja nuevas conexiones de clientes
io.on('connection', (socket) => {
    console.log('Cliente conectado');

    // Envía la lista de pedidos y el historial al nuevo cliente
    socket.emit('orderUpdate', { orders, orderHistory });

    // Recibe un nuevo pedido del cajero
    socket.on('placeOrder', ({ commandNumber, burger, itemStatuses, status, observations }) => {
        if (!commandNumber || !burger || !status) {
            return socket.emit('error', 'Faltan datos en el pedido.');
        }
        const id = generateUniqueId(); // Genera un ID único para cada pedido
        orders[id] = { commandNumber, burger, itemStatuses, status, observations };
        io.emit('orderUpdate', { orders, orderHistory }); // Envía la actualización a todos los clientes
    });

    // Recibe la actualización del estado del pedido desde la cocina
    socket.on('updateOrderStatus', ({ id, status, observations }) => {
        if (!orders[id]) {
            return socket.emit('error', 'El pedido no existe.');
        }
        if (!['SOLICITADO', 'PREPARANDO', 'TERMINADO'].includes(status)) {
            return socket.emit('error', 'Estado inválido.');
        }
        orders[id].status = status;
        if (observations) {
            orders[id].observations = observations; // Actualiza las observaciones si se proporcionan
        }
        if (status === 'TERMINADO') {
            orderHistory.push({ id, ...orders[id] });
            delete orders[id];
        }
        io.emit('orderUpdate', { orders, orderHistory });
    });

    // Maneja la desconexión de clientes
    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Función para generar un ID único para cada pedido
function generateUniqueId() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
}

server.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});
