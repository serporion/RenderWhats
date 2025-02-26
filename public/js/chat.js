
/*
// Inicializar variables
const socket = io();
const userData = JSON.parse(localStorage.getItem('userData'));

// Si no hay datos de usuario, volver al login
if (!userData) {
    window.location.href = '/index.html';
}

// Elementos del DOM
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messagesContainer = document.getElementById('messagesContainer');
const usersList = document.getElementById('usersList');
const typingIndicator = document.getElementById('typing-indicator');

// Mostrar datos del usuario actual
document.getElementById('userAvatar').src = `avatars/${userData.avatar}`;
document.getElementById('userName').textContent = userData.nombre;

// Conectar al chat
socket.emit('nuevo usuario', userData);

*/

let socket;
let userData;

/*
window.onload = async () => {
    // Obtener datos del usuario desde la sesión del servidor
    try {
        const response = await fetch('/user-data');
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        userData = await response.json();
        
        // Inicializar el chat con los datos del usuario
        initializeChat(userData);
    } catch (error) {
        console.error('Error:', error);
        window.location.href = '/';
    }
};
*/

window.onload = async () => {
    try {
        const response = await fetch('/user-data');
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        userData = await response.json();

        // Verificar si este usuario ya está en la lista de conectados
        const checkResponse = await fetch('/check-user-connected', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre: userData.nombre })
        });

        if (!checkResponse.ok) {
            // Si el usuario ya está conectado, redirigir al login
            window.location.href = '/';
            return;
        }

        // Inicializar el chat con los datos del usuario con su socket
        initializeChat(userData);
    } catch (error) {
        console.error('Error:', error);
        window.location.href = '/';
    }
};




function initializeChat(userData) {
    socket = io();

    // Elementos del DOM
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const messagesContainer = document.getElementById('messagesContainer');
    const usersList = document.getElementById('usersList');
    const typingIndicator = document.getElementById('typing-indicator');
    document.getElementById('sala-general').addEventListener('click', () => joinRoom('General'));


    // Mostrar datos del usuario actual
    document.getElementById('userAvatar').src = `../img/${userData.avatar}`;
    document.getElementById('userName').textContent = userData.nombre;

    // Conectar al chat
    socket.emit('nuevo usuario', userData);


    // Manejar cierre de chat
    document.getElementById('closeChatBtn').addEventListener('click', ()=> {
        socket.disconnect();
        window.location.href = '/';
    });

    // Manejar click en perfil. Aun no terminado
    document.getElementById('profileBtn').addEventListener('click', ()=> {
        alert('Función de perfil en desarrollo');
    });


    // Escuchar nuevos mensajes
    socket.on('nuevo mensaje', function(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${data.usuario.nombre === userData.nombre ? 'sent' : 'received'}`;
        messageDiv.innerHTML = `
            <strong>${data.usuario.nombre}:</strong>
            <p>${data.mensaje}</p>
        `;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });



    socket.on('usuarios_actualizados', function(usuarios) {
        usersList.innerHTML = '';
        usuarios.forEach(user => {
            // No mostrar al usuario actual en la lista
            if (user.nombre !== userData.nombre) {
                const userDiv = document.createElement('div');
                userDiv.className = 'user-item';
                userDiv.innerHTML = `
                <img src="../img/${user.avatar}" alt="${user.nombre}">
                <div>
                    <strong>${user.nombre}</strong>
                    <p>${user.estado || ''}</p>
                </div>
            `;
                userDiv.onclick = () => createPrivateChat(user.nombre);
                usersList.appendChild(userDiv);
            }
        });
    });


    // Enviar mensaje sin gestión de salas
    /*
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (messageInput.value.trim()) {
            socket.emit('enviar mensaje', messageInput.value);
            messageInput.value = '';
        }
    });
    */

    // Enviar mensaje con salas
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (messageInput.value.trim()) {
            socket.emit('enviar mensaje', {
                mensaje: messageInput.value,
                sala: currentRoom
            });
            messageInput.value = '';
        }
    });



    // Indicador de "escribiendo"
    let typingTimeout;

    //messageInput.addEventListener('input', function() { Parte de "sin salas"
    //    socket.emit('escribiendo');

    messageInput.addEventListener('input', function() { //Escribiendo dependiendo de la sala.
        socket.emit('escribiendo', currentRoom);
    
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('dejar de escribir');
        }, 1000);
    });


    // Mostrar quién está escribiendo
    socket.on('usuario escribiendo', function(nombre) {
        typingIndicator.textContent = `${nombre} está escribiendo...`;
        setTimeout(() => {
            typingIndicator.textContent = '';
        }, 1000);
    });


    // Mensajes del sistema
    socket.on('mensaje sistema', function(mensaje) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.textContent = mensaje;
        messagesContainer.appendChild(messageDiv);
    });


    // Objeto para almacenar las ventanas de chat privado
    let privateChats = {};

    // Cuando se hace clic en un usuario de la lista
    document.getElementById('usersList').addEventListener('click', function(e) {
        const userItem = e.target.closest('.user-item');
        if (userItem) {
            const userName = userItem.querySelector('strong').textContent;
            if (userName !== userData.nombre) {
                createPrivateChat(userName);
            }
        }
    });

    // Función para crear ventana de chat privado
    function createPrivateChat(targetUser) {
        if (!privateChats[targetUser]) {
            // Crear ventana de chat
            const chatWindow = document.createElement('div');
            chatWindow.className = 'private-chat-window';
            chatWindow.innerHTML = `
                <div class="chat-header">
                    <span>${targetUser}</span>
                    <button class="close-chat">X</button>
                </div>
                <div class="messages"></div>
                <form class="private-message-form">
                    <input type="text" placeholder="Escribe un mensaje...">
                    <button type="submit">Enviar</button>
                </form>
            `;
            
            document.body.appendChild(chatWindow);
            
            // Guardar referencia
            privateChats[targetUser] = {
                window: chatWindow,
                messages: chatWindow.querySelector('.messages')
            };

            // Manejar envío de mensajes privados
            chatWindow.querySelector('form').addEventListener('submit', function(e) {
                e.preventDefault();
                const input = this.querySelector('input');
                const message = input.value.trim();
                
                if (message) {
                    socket.emit('mensaje privado', {
                        to: targetUser,
                        message: message
                    });
                    
                    // Mostrar mensaje en la ventana
                    showPrivateMessage(targetUser, userData.nombre, message);
                    input.value = '';
                }
            });

            // Botón para cerrar chat
            chatWindow.querySelector('.close-chat').addEventListener('click', function() {
                chatWindow.remove();
                delete privateChats[targetUser];
            });

            // Nuevo
        } else {
            // Si ya existe, simplemente mostrarla
            privateChats[targetUser].window.style.display = 'block';
        }
    }

    // Función para mostrar mensaje privado
    function showPrivateMessage(chatUser, from, message) {
        if (privateChats[chatUser]) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${from === userData.nombre ? 'sent' : 'received'}`;
            messageDiv.innerHTML = `
                <strong>${from}:</strong>
                <p>${message}</p>
            `;
            privateChats[chatUser].messages.appendChild(messageDiv);
        }
    }

    // Escuchar mensajes privados
    socket.on('mensaje privado', function(data) {
        const { from, message } = data;
        if (!privateChats[from]) {
            createPrivateChat(from);
        }
        showPrivateMessage(from, from, message);
    });



    // Variables para las salas
    let currentRoom = 'General';
    const rooms = new Set(['General']);

    // Alert para Crear una nueva sala
    document.getElementById('createRoomBtn').addEventListener('click', function() {
        const roomName = prompt('Nombre de la nueva sala:');
        if (roomName && !rooms.has(roomName)) {
            socket.emit('crear sala', roomName);
            rooms.add(roomName);
            addRoomToList(roomName);
        }
    });

    
    // Función para añadir sala a la lista
    function addRoomToList(roomName) {
        const roomDiv = document.createElement('div');
        roomDiv.className = 'room-item';
        roomDiv.textContent = roomName;
        roomDiv.addEventListener('click', () => joinRoom(roomName));
        document.getElementById('roomsList').appendChild(roomDiv);
    }
    
    // Escuchar la creación de salas
    socket.on('sala creada', (roomName) => {
        // Lógica para actualizar la interfaz de usuario y mostrar la nueva sala
        if (!rooms.has(roomName)) { // Verificar si ya existe
            rooms.add(roomName); // Añadir a la lista local
            addRoomToList(roomName); // Añadir a la interfaz
        }
    });
    

    // Unirse a una sala
    function joinRoom(roomName) {
        socket.emit('unirse sala', {oldRoom: currentRoom, newRoom: roomName});
        currentRoom = roomName;
        
        // Actualizar UI
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
            if(item.textContent === roomName) {
                item.classList.add('active');
            }
        });
        
        // Limpiar mensajes anteriores
        messagesContainer.innerHTML = '';
        document.querySelector('.chat-header h3').textContent = `Chat - ${roomName}`;
    }


}