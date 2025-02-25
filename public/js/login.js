window.onload = () => {
    console.log('ENTRAAAAA!!!'); // Para debug

    // Manejar clic en el logo para redirigir a la página principal
    document.getElementById('logo').addEventListener('click', function() {
        window.location.href = 'index.html'; // Redirige a la página principal
    });


    // Manejar subida de imagen
    document.getElementById('avatarUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Comprobar que sea una imagen
            if (!file.type.startsWith('image/')) {
                alert('Por favor, sube solo imágenes');
                return;
            }

            // Comprobar tamaño (máximo 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('La imagen es demasiado grande. Máximo 2MB');
                return;
            }

            // Mostrar vista previa
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('avatarPreview').src = e.target.result;
                // Desmarcar avatares predeterminados y quitar required
                document.querySelectorAll('input[name="avatar"]').forEach(radio => {
                    radio.checked = false;
                    radio.required = false; // Quitar required cuando hay imagen personalizada
                });
            };
            reader.readAsDataURL(file);
        }
    });

    // Manejar selección de avatares predeterminados según si se ha seleccionado otra que no es la predefinida.
    document.querySelectorAll('input[name="avatar"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                document.getElementById('avatarPreview').src = this.value;
            }
        });
    });

    // Un solo evento submit
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Formulario enviado'); // Para debug
        
        const userData = {
            nombre: document.getElementById('nombre').value,
            estado: document.getElementById('estado').value,
            // Comprobar si hay imagen personalizada o avatar predefinido
            avatar: document.getElementById('avatarPreview').src !== 'mio.jpg' 
                ? document.getElementById('avatarPreview').src.split('/').pop()
                : document.querySelector('input[name="avatar"]:checked')?.value
        };

        // Validar que haya un avatar seleccionado
        if (!userData.avatar) {
            alert('Por favor, selecciona un avatar o sube una imagen');
            return;
        }

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                window.location.href = '/chat.html';
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
}
