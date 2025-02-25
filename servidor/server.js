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
    const usuario = {
        nombre: req.body.nombre,
        estado: req.body.estado,
        avatar: req.body.avatar
    };
    req.session.usuario = usuario;
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

// Añadir esta ruta después de las otras rutas
app.get('/user-data', (req, res) => {
    if (req.session.usuario) {
        res.json(req.session.usuario);
    } else {
        res.status(401).json({ error: 'No autorizado' });
    }
});

// Configuración de Socket.io
io.on('connection', (socket) => {

    // Se desconecta al cerrar la ventana
    /*
    window.addEventListener('beforeunload', function() {
        socket.disconnect();
    });
    */

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
    

    /*
    socket.on('enviar mensaje', (data) => {
        if (typeof data === 'string') {
            io.emit('nuevo mensaje', {
                usuario: socket.usuario,
                mensaje: data
            });
        } else if (data.sala) {
            // Mensaje con sala específica
            io.to(data.sala).emit('nuevo mensaje', {
                usuario: socket.usuario,
                mensaje: data.mensaje
            });
        }
    });
    */

   
    socket.on('nuevo usuario', (usuario) => {
        socket.usuario = usuario;
        socketUsuarios[usuario.nombre] = socket;
        usuariosConectados.push(usuario);

        socket.join('General');
        socket.room = 'General';
        
        // Enviar lista filtrada a TODOS los usuarios
        io.sockets.sockets.forEach(clientSocket => {
            const clientUser = clientSocket.usuario;
            if (clientUser) {
                clientSocket.emit('lista usuarios', 
                    usuariosConectados.filter(u => u.nombre !== clientUser.nombre)
                );
            }
        });
        
        // Notificar conexión a todos menos al usuario actual
        socket.broadcast.emit('mensaje sistema', `${usuario.nombre} se ha conectado`);
    });
    
    
    /*

    // Cuando se recibe un mensaje
    socket.on('enviar mensaje', (mensaje) => {
        io.emit('nuevo mensaje', {
            usuario: socket.usuario,
            mensaje: mensaje
        });
    });
*/
    /*

    // Cuando un usuario está escribiendo pero para un manejar donde solo hay una sala.
    socket.on('escribiendo', () => {
        socket.broadcast.emit('usuario escribiendo', socket.usuario.nombre);
    });
    */



    /*
    // Manejar el evento 'escribiendo' para manejar en salas diferentes.
    socket.on('escribiendo', (sala) => {
        socket.to(sala).emit('usuario escribiendo', socket.usuario.nombre);
    });
    */

    socket.on('escribiendo', (sala) => {
        if (socket.usuario && sala) {
            socket.to(sala).emit('usuario escribiendo', socket.usuario.nombre);
        } else {
            socket.broadcast.emit('usuario escribiendo', socket.usuario?.nombre);
        }
    });
    






    // Cuando un usuario se desconecta
    /*
    socket.on('disconnect', () => {
        if (socket.usuario) {
            usuariosConectados = usuariosConectados.filter(u => u.nombre !== socket.usuario.nombre);
            io.emit('lista usuarios', usuariosConectados);
            io.emit('mensaje sistema', `${socket.usuario.nombre} se ha desconectado`);
        }
    });
    */

    socket.on('disconnect', () => {
        if (socket.usuario) {
            delete socketUsuarios[socket.usuario.nombre];
            usuariosConectados = usuariosConectados.filter(u => u.nombre !== socket.usuario.nombre);
            io.emit('lista usuarios', usuariosConectados);
            io.emit('mensaje sistema', `${socket.usuario.nombre} se ha desconectado`);
        }
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
