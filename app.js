// Cargar lista de localStorage al iniciar
let miLista = JSON.parse(localStorage.getItem('animeList')) || [];
renderizarMiLista();

// Búsqueda en AniList (GraphQL)
async function buscarAnime() {
    const query = `
    query ($search: String) {
        Page(page: 1, perPage: 6) {
            media(search: $search, type: ANIME) {
                id
                title { romaji }
                coverImage { large }
                episodes
            }
        }
    }`;

    const searchInput = document.getElementById('searchInput').value;
    if (!searchInput) return;

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables: { search: searchInput } })
        });

        const data = await response.json();
        mostrarResultados(data.data.Page.media);
    } catch (error) {
        alert("Error de conexión. Verifica tu internet.");
    }
}

// Dibujar resultados de búsqueda
function mostrarResultados(animes) {
    const contenedor = document.getElementById('searchResults');
    contenedor.innerHTML = '<h3>Resultados (Haz clic en "+" para agregar)</h3>';
    contenedor.classList.remove('hidden');

    animes.forEach(anime => {
        const btnAdd = `<button onclick="agregarAnime('${anime.id}', '${anime.title.romaji.replace(/'/g, "\\'")}', '${anime.coverImage.large}', ${anime.episodes || 0})">+</button>`;
        contenedor.innerHTML += crearTarjeta(anime, btnAdd);
    });
}

// Agregar a localStorage
function agregarAnime(id, titulo, imagen, episodios) {
    if (!miLista.some(a => a.id === id)) {
        miLista.push({ id, titulo, imagen, episodios, estado: 'Pendiente' });
        localStorage.setItem('animeList', JSON.stringify(miLista));
        renderizarMiLista();
        document.getElementById('searchResults').classList.add('hidden');
        document.getElementById('searchInput').value = '';
    } else {
        alert("Ya está en tu lista");
    }
}

// Dibujar mi lista guardada
function renderizarMiLista() {
    const contenedor = document.getElementById('myList');
    contenedor.innerHTML = '';
    miLista.forEach(anime => {
        const btnEliminar = `<button style="background: #dc2626;" onclick="eliminarAnime('${anime.id}')">Eliminar</button>`;
        contenedor.innerHTML += crearTarjeta({
            title: { romaji: anime.titulo },
            coverImage: { large: anime.imagen },
            episodes: anime.episodios
        }, btnEliminar);
    });
}

// Eliminar de localStorage
function eliminarAnime(id) {
    miLista = miLista.filter(a => a.id !== id);
    localStorage.setItem('animeList', JSON.stringify(miLista));
    renderizarMiLista();
}

// Plantilla de la tarjeta HTML. El "alt" muestra el nombre si no hay internet.
function crearTarjeta(anime, botonHTML) {
    return `
        <div class="anime-card">
            <img src="${anime.coverImage.large}" alt="${anime.title.romaji}" loading="lazy">
            <div class="anime-info">
                <div class="anime-title">${anime.title.romaji} <br><small>(${anime.episodes || '?'} eps)</small></div>
                ${botonHTML}
            </div>
        </div>
    `;
}

// ================= FUNCIONES DE SINCRONIZACIÓN =================

// Exportar a JSON
function exportarDatos() {
    const dataStr = JSON.stringify(miLista, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mi_lista_anime.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Importar de JSON
function importarDatos(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const datosImportados = JSON.parse(e.target.result);
            miLista = datosImportados;
            localStorage.setItem('animeList', JSON.stringify(miLista));
            renderizarMiLista();
            alert("Lista importada con éxito");
        } catch (error) {
            alert("Error al leer el archivo JSON");
        }
    };
    reader.readAsText(file);
}