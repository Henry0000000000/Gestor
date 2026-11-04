// Cargar lista de localStorage al iniciar
let miLista = JSON.parse(localStorage.getItem('animeList')) || [];
renderizarMiLista();

// Búsqueda en AniList (GraphQL)
async function buscarAnime() {
    const query = `
    query ($search: String, $type: MediaType) {
        Page(page: 1, perPage: 6) {
            media(search: $search, type: $type) {
                id
                type
                title { romaji }
                coverImage { large }
                episodes
                chapters
            }
        }
    }`;

    const searchInput = document.getElementById('searchInput').value;
    const searchType = document.getElementById('searchType').value;
    if (!searchInput) return;

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables: { search: searchInput, type: searchType } })
        });

        const data = await response.json();
        mostrarResultados(data.data.Page.media);
    } catch (error) {
        alert("Error de conexión. Verifica tu internet.");
    }
}

function mostrarResultados(medias) {
    const contenedor = document.getElementById('searchResults');
    contenedor.innerHTML = '<h3>Resultados (Haz clic en "+" para agregar)</h3>';
    contenedor.classList.remove('hidden');

    medias.forEach(media => {
        const esAnime = media.type === 'ANIME';
        const cantidad = esAnime ? media.episodes : media.chapters;
        const sufijo = esAnime ? 'eps' : 'caps';
        
        const btnAdd = `<button onclick="agregarAnime('${media.id}', '${media.title.romaji.replace(/'/g, "\\'")}', '${media.coverImage.large}', ${cantidad || 0})">+</button>`;
        
        contenedor.innerHTML += `
            <div class="anime-card">
                <img src="${media.coverImage.large}" alt="${media.title.romaji}" loading="lazy">
                <div class="anime-info">
                    <div class="anime-title">${media.title.romaji} <br><small>(${cantidad || '?'} ${sufijo})</small></div>
                    ${btnAdd}
                </div>
            </div>
        `;
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

// Dibujar mi lista guardada con filtros
function renderizarMiLista() {
    const contenedor = document.getElementById('myList');
    contenedor.innerHTML = '';
    
    const filtroElement = document.getElementById('filtroEstado');
    const filtro = filtroElement ? filtroElement.value : 'Todos';

    miLista.forEach(anime => {
        if (filtro !== 'Todos' && anime.estado !== filtro) return;

        const estadoActual = anime.estado || 'Pendiente';
        const episodioActual = anime.episodioActual || 0;
        const totalEpisodios = anime.episodios || '?';

        // Genera el input numérico solo si está en "Viendo"
        let contadorHTML = '';
        if (estadoActual === 'Viendo') {
            contadorHTML = `
                <div class="episodio-tracker">
                    <span>Cap:</span>
                    <button class="btn-ep" onclick="cambiarEpisodio('${anime.id}', -1)">-</button>
                    <input type="number" min="0" max="${anime.episodios || 9999}" value="${episodioActual}" onchange="actualizarEpisodio('${anime.id}', this.value)">
                    <button class="btn-ep" onclick="cambiarEpisodio('${anime.id}', 1)">+</button>
                    <span>/ ${totalEpisodios}</span>
                </div>
            `;
        }

        const accionesHTML = `
            <div class="anime-actions">
                <select onchange="cambiarEstado('${anime.id}', this.value)">
                    <option value="Pendiente" ${estadoActual === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="Viendo" ${estadoActual === 'Viendo' ? 'selected' : ''}>Viendo</option>
                    <option value="Terminado" ${estadoActual === 'Terminado' ? 'selected' : ''}>Terminado</option>
                </select>
                ${contadorHTML}
                <button style="background: #dc2626;" onclick="eliminarAnime('${anime.id}')">Eliminar</button>
            </div>
        `;
        
        contenedor.innerHTML += crearTarjeta({
            title: { romaji: anime.titulo },
            coverImage: { large: anime.imagen },
            episodes: anime.episodios
        }, accionesHTML);
    });
}

function actualizarEpisodio(id, cap) {
    const indice = miLista.findIndex(a => a.id === id);
    if (indice !== -1) {
        miLista[indice].episodioActual = parseInt(cap) || 0;
        localStorage.setItem('animeList', JSON.stringify(miLista));
    }
}

function cambiarEstado(id, nuevoEstado) {
    const indice = miLista.findIndex(a => a.id === id);
    if (indice !== -1) {
        miLista[indice].estado = nuevoEstado;
        localStorage.setItem('animeList', JSON.stringify(miLista));
        renderizarMiLista();
    }
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

// Sumar o restar un episodio desde los botones
function cambiarEpisodio(id, incremento) {
    const indice = miLista.findIndex(a => a.id === id);
    if (indice !== -1) {
        let actual = miLista[indice].episodioActual || 0;
        let nuevo = actual + incremento;
        
        if (nuevo < 0) nuevo = 0; // No bajar de cero
        
        const maximo = miLista[indice].episodios;
        if (maximo && nuevo > maximo) nuevo = maximo; // No pasar del límite si se conoce
        
        miLista[indice].episodioActual = nuevo;
        localStorage.setItem('animeList', JSON.stringify(miLista));
        renderizarMiLista();
    }
}