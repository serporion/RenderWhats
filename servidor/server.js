/*
const http = require('node:http');

const hostname = '127.0.0.1';
const port = 3200;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end('<p><b>Hello, World!\n</b></p>');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
*/

// Importamos las dependencias necesarias
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const session = require('express-session');

// Configuración básica de express
app.use(express.static('public'));
//app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Configuración de sesión simple
app.use(session({
    secret: 'chatsecreto123',
    resave: false,
    saveUninitialized: true
}));

// Añade esto después de las otras configuraciones de express
app.use(express.json());


// Lista de usuarios conectados
let usuariosConectados = []; // Array con datos de usuarios
let socketUsuarios = {};     // Para mapear usuarios a sockets


app.get('/', (req, res) => {
    if (req.session.usuario) {
        res.redirect('/chat');
    } else {
        // Cambiar esto
        // res.render('login');
        // Por esto
        res.sendFile('index.html', { root: './public' });
    }
});

app.post('/login', (req, res) => {
    // Guardamos los datos del usuario en sesión
    req.session.usuario = {
        nombre: req.body.nombre,
        estado: req.body.estado,
        avatar: req.body.avatar
    };
    //res.redirect('/chat');
    res.json({ success: true });
});

app.get('/chat', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/');
    }
    // Cambiar esto
    // res.render('chat', { usuario: req.session.usuario });
    // Por esto
    res.sendFile('chat.html', { root: './public' });
});

//ruta necesaria para evitar el F5 Northrop
app.post('/check-user-connected', (req, res) => {
    const { nombre } = req.body;
    if (usuariosConectados.some(u => u.nombre === nombre)) {
        // Usuario ya conectado
        req.session.destroy();
        res.status(401).json({ error: 'Usuario ya conectado' });
    } else {
        res.json({ success: true });
    }
});


app.get('/user-data', (req, res) => {
    if (req.session.usuario) {
        res.json(req.session.usuario);
    } else {
        res.status(401).json({ error: 'No autorizado' });
    }
});




// Configuración de Socket.io
io.on('connection', (socket) => {

    // Gestión de salas

    socket.on('crear sala', (roomName) => {
        socket.join(roomName);
        socket.room = roomName;
        io.emit('sala creada', roomName);
    });

    socket.on('unirse sala', ({oldRoom, newRoom}) => {
        socket.leave(oldRoom);
        socket.join(newRoom);
        socket.room = newRoom;
        socket.emit('cambio sala', newRoom);
    });

    
    // Modificar el evento de enviar mensaje para manejar salas
    socket.on('enviar mensaje', (data) => {
        if (data.sala) {
            io.to(data.sala).emit('nuevo mensaje', {
                usuario: socket.usuario,
                mensaje: data.mensaje
            });
        }
    });
    

    socket.on('nuevo usuario', (usuario) => {
        // Verificar si este usuario ya está conectado
        if (!usuariosConectados.some(u => u.nombre === usuario.nombre)) {
            usuariosConectados.push(usuario); // Agregar usuario solo si no está conectado
        }

        // Vinculamos el usuario al socket directamente
        socket.usuario = usuario; // Se asigna para mantener compatibilidad con otras funciones

        // También mapeamos el socket.id con el usuario para consistencia
        socketUsuarios[socket.id] = usuario;

        // Unirse a la sala por defecto ('General') o a otra sala, e introducir lógica para asignar salas
        socket.room = usuario.sala || 'General'; // Si no se especifica sala en `usuario`, por defecto es 'General'
        socket.join(socket.room);

        console.log(`Usuario conectado: ${usuario.nombre} en sala: ${socket.room}`);
        console.log(`Usuarios conectados:`, usuariosConectados);

        // Emitir la lista actualizada de usuarios a todos
        io.emit('usuarios_actualizados', usuariosConectados);

        // Notificar conexión a los demás usuarios
        socket.broadcast.emit('mensaje sistema', `${usuario.nombre} se ha conectado`);
    });


    socket.on('escribiendo', (sala) => {
        if (socket.usuario && sala) {
            socket.to(sala).emit('usuario escribiendo', socket.usuario.nombre);
        } else {
            socket.broadcast.emit('usuario escribiendo', socket.usuario?.nombre);
        }
    });
    


    socket.on('disconnect', () => {
        const usuario = socketUsuarios[socket.id];

        if (usuario) {
            // Eliminar usuario de la lista de conectados
            usuariosConectados = usuariosConectados.filter(u => u.nombre !== usuario.nombre);
            delete socketUsuarios[socket.id];

            // Notificar a todos los clientes
            io.emit('usuarios_actualizados', usuariosConectados);
            io.emit('mensaje sistema', `${usuario.nombre} se ha desconectado`);

            // Limpiar la sesión asociada a este usuario
            Object.values(io.sockets.sockets).forEach(clientSocket => {
                if (clientSocket.request &&
                    clientSocket.request.session &&
                    clientSocket.request.session.usuario &&
                    clientSocket.request.session.usuario.nombre === usuario.nombre) {
                    clientSocket.request.session.destroy();
                }
            });
        }

        console.log(`Usuario desconectado: ${usuario ? usuario.nombre : 'Desconocido'}`);
        console.log(`Usuarios conectados:`, usuariosConectados);
    });



    socket.on('mensaje privado', function(data) {
        const { to, message } = data;
        const targetSocket = socketUsuarios[to];
        if (targetSocket) {
            targetSocket.emit('mensaje privado', { from: socket.usuario.nombre, message });
        } else {
            console.error(`Usuario ${to} no encontrado`);
        }
    });
    


});

// Iniciamos el servidor
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
