let miLista = JSON.parse(localStorage.getItem('animeList')) || [];
let tipoActivo = 'ANIME'; // 'ANIME' o 'MANGA'

renderizarMiLista();

// Cambiar de pestaña entre Anime y Manga/Manhua
function cambiarTab(tipo) {
    tipoActivo = tipo;
    
    // Marcar botón activo
    document.getElementById('tabAnime').classList.toggle('active', tipo === 'ANIME');
    document.getElementById('tabManga').classList.toggle('active', tipo === 'MANGA');

    // Ocultar la lista de búsqueda
    document.getElementById('searchResults').classList.add('hidden');
    
    // Renderizar los elementos correspondientes
    renderizarMiLista();
}

// Búsqueda en AniList según el tipo de la pestaña actual
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
    if (!searchInput) return;

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables: { search: searchInput, type: tipoActivo } })
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
        
        const btnAdd = `<button onclick="agregarAnime('${media.id}', '${media.title.romaji.replace(/'/g, "\\'")}', '${media.coverImage.large}', ${cantidad || 0}, '${media.type}')">+</button>`;
        
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

function agregarAnime(id, titulo, imagen, episodios, tipo) {
    if (!miLista.some(a => a.id === id)) {
        miLista.push({ 
            id, 
            titulo, 
            imagen, 
            episodios, 
            tipo: tipo || tipoActivo, 
            estado: 'Pendiente', 
            episodioActual: 0 
        });
        localStorage.setItem('animeList', JSON.stringify(miLista));
        renderizarMiLista();
        document.getElementById('searchResults').classList.add('hidden');
        document.getElementById('searchInput').value = '';
    } else {
        alert("Ya está en tu lista");
    }
}

function renderizarMiLista() {
    const contenedor = document.getElementById('myList');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    
    const filtroEstado = document.getElementById('filtroEstado')?.value || 'Todos';
    const filtroOrden = document.getElementById('filtroOrden')?.value || 'original';

    // 1. Filtrar solo los elementos de la pestaña activa (ANIME o MANGA) y el estado seleccionado
    let listaFiltrada = miLista.filter(anime => {
        const tipoItem = anime.tipo || 'ANIME';
        const coincideTipo = tipoItem === tipoActivo;
        const coincideEstado = (filtroEstado === 'Todos') || ((anime.estado || 'Pendiente') === filtroEstado);
        return coincideTipo && coincideEstado;
    });

    // 2. Ordenar por A-Z o Z-A
    if (filtroOrden === 'az') {
        listaFiltrada.sort((a, b) => a.titulo.localeCompare(b.titulo));
    } else if (filtroOrden === 'za') {
        listaFiltrada.sort((a, b) => b.titulo.localeCompare(a.titulo));
    }

    // 3. Dibujar elementos
    listaFiltrada.forEach(anime => {
        const estadoActual = anime.estado || 'Pendiente';
        const episodioActual = anime.episodioActual || 0;
        const totalEpisodios = anime.episodios || '?';

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

function crearTarjeta(anime, botonHTML) {
    return `
        <div class="anime-card">
            <img src="${anime.coverImage.large}" alt="${anime.title.romaji}" loading="lazy">
            <div class="anime-info">
                <div class="anime-title">${anime.title.romaji}</div>
                ${botonHTML}
            </div>
        </div>
    `;
}

function cambiarEstado(id, nuevoEstado) {
    const indice = miLista.findIndex(a => a.id === id);
    if (indice !== -1) {
        miLista[indice].estado = nuevoEstado;
        localStorage.setItem('animeList', JSON.stringify(miLista));
        renderizarMiLista();
    }
}

function actualizarEpisodio(id, cap) {
    const indice = miLista.findIndex(a => a.id === id);
    if (indice !== -1) {
        miLista[indice].episodioActual = parseInt(cap) || 0;
        localStorage.setItem('animeList', JSON.stringify(miLista));
    }
}

function cambiarEpisodio(id, incremento) {
    const indice = miLista.findIndex(a => a.id === id);
    if (indice !== -1) {
        let actual = miLista[indice].episodioActual || 0;
        let nuevo = actual + incremento;
        
        if (nuevo < 0) nuevo = 0;
        const maximo = miLista[indice].episodios;
        if (maximo && nuevo > maximo) nuevo = maximo;
        
        miLista[indice].episodioActual = nuevo;
        localStorage.setItem('animeList', JSON.stringify(miLista));
        renderizarMiLista();
    }
}

function eliminarAnime(id) {
    miLista = miLista.filter(a => a.id !== id);
    localStorage.setItem('animeList', JSON.stringify(miLista));
    renderizarMiLista();
}

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