// ============================================
// VARIABLES GLOBALES
// ============================================

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Estructura del grafo
let nodos = [];           // Array de objetos {id, x, y}
let aristas = [];         // Array de objetos {origen, destino}
let aristasOriginales = []; // Backup de aristas predefinidas
let grafo = {};           // Objeto {nodoId: [vecinos ordenados]}

// Control de interacción
let nodoSeleccionado = null;
let nodoInicialActual = 4;   // Nodo inicial (puede cambiar)

// Control de visualización DFS
let ejecutando = false;
let nodosVisitados = new Set();
let aristasRecorridas = [];
let recorrido = [];

// Constantes de dibujo
const RADIO_NODO = 25;
const COLOR_NODO_NORMAL = '#667eea';
const COLOR_NODO_VISITADO = '#4caf50';
const COLOR_NODO_ACTUAL = '#ffc107';
const COLOR_NODO_INICIAL = '#f44336';
const COLOR_ARISTA_NORMAL = '#999';
const COLOR_ARISTA_RECORRIDA = '#4caf50';

// ============================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// Carga automáticamente el grafo predefinido
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    cargarGrafoPredefinido();
});

// ============================================
// FUNCIÓN: CARGAR GRAFO PREDEFINIDO
// Carga los 9 nodos con posiciones fijas y conexiones predefinidas
// ============================================
function cargarGrafoPredefinido() {
    // Reiniciar estado
    nodos = [];
    aristas = [];
    aristasOriginales = [];
    grafo = {};
    nodoSeleccionado = null;
    ejecutando = false;
    nodosVisitados.clear();
    aristasRecorridas = [];
    recorrido = [];
    
    // Posiciones fijas de los 9 nodos según especificación
    const posiciones = {
        // Zona izquierda
        6: { x: 100, y: 300 },   // extremo izquierdo
        1: { x: 200, y: 150 },   // arriba, centro-izquierda
        5: { x: 200, y: 300 },   // debajo de 1
        7: { x: 250, y: 500 },   // parte inferior central-izquierda
        
        // Zona central
        2: { x: 450, y: 150 },   // parte superior central
        4: { x: 450, y: 300 },   // debajo de 2 (NODO INICIAL)
        
        // Zona derecha
        8: { x: 700, y: 150 },   // parte superior derecha
        3: { x: 700, y: 300 },   // debajo de 8
        9: { x: 850, y: 225 }    // extremo derecho
    };
    
    // Crear nodos
    for (let i = 1; i <= 9; i++) {
        nodos.push({
            id: i,
            x: posiciones[i].x,
            y: posiciones[i].y
        });
        grafo[i] = [];
    }
    
    // Conexiones predefinidas (aristas dirigidas)
    // Formato: nodo_origen → nodo_destino
    const conexionesPredefinidas = [
        [1, 2], [1, 7],           // Nodo 1 → 2, 7
        [2, 8], [2, 3], [2, 6],   // Nodo 2 → 3, 6, 8
        [3, 8],                   // Nodo 3 → 8
        [4, 5], [4, 1], [4, 6], [4, 2], // Nodo 4 → 1, 2, 5, 6
        [6, 1], [6, 5], [6, 7],   // Nodo 6 → 1, 5, 7
        [7, 9],                   // Nodo 7 → 9
        [8, 9]                    // Nodo 8 → 9
    ];
    
    // Crear aristas predefinidas
    conexionesPredefinidas.forEach(([origen, destino]) => {
        aristas.push({ origen, destino });
        grafo[origen].push(destino);
    });
    
    // Ordenar vecinos de cada nodo (menor a mayor) - Importante para DFS
    Object.keys(grafo).forEach(nodo => {
        grafo[nodo].sort((a, b) => a - b);
    });
    
    // Guardar backup de aristas originales
    aristasOriginales = JSON.parse(JSON.stringify(aristas));
    
    // Limpiar displays
    document.getElementById('conjuntoL').innerHTML = 'L = { }';
    document.getElementById('conjuntoA').innerHTML = 'A = { }';
    document.getElementById('pilaVisual').innerHTML = '<div style="text-align: center; color: #999;">Vacía</div>';
    document.getElementById('proceso').innerHTML = `✅ Grafo cargado. Nodo inicial por defecto: <strong>4</strong><br>Haz clic en los nodos para agregar conexiones o ejecuta DFS.`;
    
    document.getElementById('btnEjecutar').disabled = false;
    
    // Dibujar grafo inicial
    dibujarGrafo();
    
    console.log('✅ Grafo predefinido cargado');
    console.log('📊 Nodos:', Object.keys(grafo));
    console.log('🔗 Grafo (lista de adyacencia):', grafo);
    console.log('🎯 Nodo inicial por defecto: 4');
    console.log('📈 Recorrido esperado (nodo 4): 4→1→2→3→8→9→6→5→7');
}

// ============================================
// FUNCIÓN: GENERAR GRAFO (mantener por compatibilidad)
// Esta función ahora carga el grafo predefinido
// ============================================
function generarGrafo() {
    cargarGrafoPredefinido();
}

// ============================================
// FUNCIÓN: DIBUJAR GRAFO
// Renderiza nodos y aristas en el canvas
// ============================================
function dibujarGrafo(nodoActual = null) {
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar aristas primero (debajo de los nodos)
    aristas.forEach(arista => {
        const origen = nodos.find(n => n.id === arista.origen);
        const destino = nodos.find(n => n.id === arista.destino);
        
        if (origen && destino) {
            // Verificar si esta arista fue recorrida
            const recorrida = aristasRecorridas.some(
                a => a.origen === arista.origen && a.destino === arista.destino
            );
            
            dibujarFlecha(
                origen.x, origen.y,
                destino.x, destino.y,
                recorrida ? COLOR_ARISTA_RECORRIDA : COLOR_ARISTA_NORMAL,
                recorrida ? 3 : 2
            );
        }
    });
    
    // Dibujar nodos
    nodos.forEach(nodo => {
        let color = COLOR_NODO_NORMAL;
        
        // Determinar color del nodo
        if (nodo.id === nodoInicialActual && !ejecutando) {
            color = COLOR_NODO_INICIAL;
        } else if (nodo.id === nodoActual && ejecutando) {
            color = COLOR_NODO_ACTUAL;
        } else if (nodosVisitados.has(nodo.id)) {
            color = COLOR_NODO_VISITADO;
        } else if (nodo.id === nodoSeleccionado) {
            color = COLOR_NODO_ACTUAL;
        }
        
        dibujarNodo(nodo.x, nodo.y, nodo.id, color);
    });
}

// ============================================
// FUNCIÓN: DIBUJAR NODO
// Dibuja un círculo con el número del nodo
// ============================================
function dibujarNodo(x, y, id, color) {
    // Círculo exterior
    ctx.beginPath();
    ctx.arc(x, y, RADIO_NODO, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Texto (número del nodo)
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(id, x, y);
}

// ============================================
// FUNCIÓN: DIBUJAR FLECHA
// Dibuja una línea con punta de flecha
// ============================================
function dibujarFlecha(x1, y1, x2, y2, color, grosor) {
    // Calcular ángulo de la línea
    const angulo = Math.atan2(y2 - y1, x2 - x1);
    
    // Ajustar puntos para que la flecha termine en el borde del nodo
    const x1Ajustado = x1 + RADIO_NODO * Math.cos(angulo);
    const y1Ajustado = y1 + RADIO_NODO * Math.sin(angulo);
    const x2Ajustado = x2 - RADIO_NODO * Math.cos(angulo);
    const y2Ajustado = y2 - RADIO_NODO * Math.sin(angulo);
    
    // Dibujar línea
    ctx.beginPath();
    ctx.moveTo(x1Ajustado, y1Ajustado);
    ctx.lineTo(x2Ajustado, y2Ajustado);
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    ctx.stroke();
    
    // Dibujar punta de flecha
    const tamañoFlecha = 15;
    ctx.beginPath();
    ctx.moveTo(x2Ajustado, y2Ajustado);
    ctx.lineTo(
        x2Ajustado - tamañoFlecha * Math.cos(angulo - Math.PI / 6),
        y2Ajustado - tamañoFlecha * Math.sin(angulo - Math.PI / 6)
    );
    ctx.lineTo(
        x2Ajustado - tamañoFlecha * Math.cos(angulo + Math.PI / 6),
        y2Ajustado - tamañoFlecha * Math.sin(angulo + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

// ============================================
// FUNCIÓN: DETECTAR CLIC EN NODO
// Maneja la interacción del usuario
// ============================================
canvas.addEventListener('click', (event) => {
    if (ejecutando) return; // No permitir clics durante la ejecución
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Buscar nodo clickeado
    const nodoClickeado = nodos.find(nodo => {
        const distancia = Math.sqrt(
            Math.pow(x - nodo.x, 2) + Math.pow(y - nodo.y, 2)
        );
        return distancia <= RADIO_NODO;
    });
    
    if (nodoClickeado) {
        if (nodoSeleccionado === null) {
            // Primer nodo seleccionado
            nodoSeleccionado = nodoClickeado.id;
        } else if (nodoSeleccionado === nodoClickeado.id) {
            // Deseleccionar si es el mismo nodo
            nodoSeleccionado = null;
        } else {
            // Crear arista entre nodoSeleccionado y nodoClickeado
            crearArista(nodoSeleccionado, nodoClickeado.id);
            nodoSeleccionado = null;
        }
        
        dibujarGrafo();
    }
});

// ============================================
// FUNCIÓN: CREAR ARISTA
// Agrega una conexión dirigida entre dos nodos
// ============================================
function crearArista(origen, destino) {
    // Verificar que no exista ya la arista
    const existe = aristas.some(
        a => a.origen === origen && a.destino === destino
    );
    
    if (!existe) {
        aristas.push({ origen, destino });
        
        // Agregar a la lista de adyacencia
        if (!grafo[origen].includes(destino)) {
            grafo[origen].push(destino);
            // Ordenar vecinos de menor a mayor
            grafo[origen].sort((a, b) => a - b);
        }
        
        console.log(`Arista creada: ${origen} -> ${destino}`);
    }
}

// ============================================
// FUNCIÓN: EJECUTAR DFS
// Implementación del algoritmo DFS con pila
// ============================================
async function ejecutarDFS() {
    if (nodos.length === 0) {
        alert('Primero carga el grafo');
        return;
    }
    
    if (aristas.length === 0) {
        alert('El grafo no tiene conexiones');
        return;
    }
    
    // Obtener nodo inicial del input
    const nodoInicialInput = parseInt(document.getElementById('nodoInicial').value);
    
    if (!nodoInicialInput || nodoInicialInput < 1 || nodoInicialInput > 9) {
        alert('El nodo inicial debe estar entre 1 y 9');
        return;
    }
    
    nodoInicialActual = nodoInicialInput;
    
    // Reiniciar estado
    ejecutando = true;
    nodosVisitados.clear();
    aristasRecorridas = [];
    recorrido = [];
    
    document.getElementById('btnEjecutar').disabled = true;
    document.getElementById('proceso').innerHTML = '';
    
    // Inicializar pila con el nodo inicial
    const pila = [nodoInicialActual];
    
    agregarPaso(`<strong>🚀 INICIO DFS desde nodo ${nodoInicialActual}:</strong> Pila = [${nodoInicialActual}]`);
    actualizarPilaVisual(pila);
    
    // Algoritmo DFS - visita siempre el vecino menor y retrocede cuando no hay más caminos
    const caminoActual = []; // Mantiene el camino actual para retroceder
    let ultimoNodoValido = null; // Track del nodo desde donde venimos
    
    while (pila.length > 0) {
        await sleep(1000);
        
        const nodoActual = pila.pop();
        actualizarPilaVisual(pila);
        
        agregarPaso(`<strong>POP:</strong> Sacando nodo ${nodoActual} de la pila`);
        
        if (nodosVisitados.has(nodoActual)) {
            agregarPaso(`❌ Nodo <span class="highlight">${nodoActual}</span> ya visitado, descartado`);
            await sleep(800);
            continue;
        }
        
        // Marcar como visitado
        nodosVisitados.add(nodoActual);
        recorrido.push(nodoActual);
        caminoActual.push(nodoActual);
        
        // Registrar arista: buscar desde qué nodo del camino actual llegamos
        if (recorrido.length > 1 && ultimoNodoValido !== null) {
            aristasRecorridas.push({
                origen: ultimoNodoValido,
                destino: nodoActual
            });
        }
        
        agregarPaso(`✅ <strong>Visitando nodo ${nodoActual}</strong>`);
        
        // Actualizar conjuntos
        document.getElementById('conjuntoL').innerHTML = 
            `L = { ${recorrido.join(', ')} }`;
        
        const aristasTexto = aristasRecorridas.map(
            a => `(${a.origen},${a.destino})`
        ).join(', ');
        document.getElementById('conjuntoA').innerHTML = 
            `A = { ${aristasTexto} }`;
        
        dibujarGrafo(nodoActual);
        await sleep(800);
        
        // Obtener vecinos no visitados
        const vecinos = grafo[nodoActual] || [];
        const vecinosNoVisitados = vecinos.filter(v => !nodosVisitados.has(v));
        
        if (vecinos.length > 0) {
            agregarPaso(`🔍 Vecinos de ${nodoActual}: [${vecinos.join(', ')}]`);
        }
        
        if (vecinosNoVisitados.length > 0) {
            // Hay vecinos no visitados: ir al menor
            const vecinoMenor = Math.min(...vecinosNoVisitados);
            agregarPaso(`➡️ Siguiente: nodo <span class="highlight">${vecinoMenor}</span> (menor no visitado)`);
            
            pila.push(vecinoMenor);
            ultimoNodoValido = nodoActual; // Este nodo es el origen del siguiente
            agregarPaso(`<strong>PUSH:</strong> Agregando nodo ${vecinoMenor} a la pila`);
        } else {
            // No hay vecinos no visitados: retroceder
            agregarPaso(`⚠️ No hay vecinos no visitados - Retrocediendo...`);
            
            // Eliminar el nodo actual del camino
            caminoActual.pop();
            
            // Retroceder hasta encontrar un nodo con vecinos no visitados
            let encontrado = false;
            for (let i = caminoActual.length - 1; i >= 0 && !encontrado; i--) {
                const nodoRetroceso = caminoActual[i];
                const vecinosRetroceso = grafo[nodoRetroceso] || [];
                const vecinosDisponibles = vecinosRetroceso.filter(v => !nodosVisitados.has(v));
                
                if (vecinosDisponibles.length > 0) {
                    // Encontramos un nodo con vecinos disponibles
                    const siguienteVecino = Math.min(...vecinosDisponibles);
                    agregarPaso(`🔙 Retrocediendo al nodo ${nodoRetroceso}, siguiente: ${siguienteVecino}`);
                    
                    pila.push(siguienteVecino);
                    ultimoNodoValido = nodoRetroceso; // El nodo al que retrocedimos es el origen
                    agregarPaso(`<strong>PUSH:</strong> Agregando nodo ${siguienteVecino} a la pila`);
                    encontrado = true;
                }
            }
            
            if (!encontrado && recorrido.length < nodos.length) {
                agregarPaso(`⚠️ No se encontraron más caminos desde el recorrido actual`);
            }
        }
        
        agregarPaso(`📚 Pila actual = [${pila.join(', ') || 'vacía'}]`);
        actualizarPilaVisual(pila);
        dibujarGrafo();
    }
    
    // Finalizar
    agregarPaso('<strong style="color: #4caf50;">✅ DFS COMPLETADO - Pila vacía</strong>');
    agregarPaso(`<strong>📊 Recorrido final:</strong> ${recorrido.join(' → ')}`);
    agregarPaso(`<strong>📈 Nodos visitados:</strong> ${recorrido.length} de ${nodos.length}`);
    
    // Mostrar resumen final
    const resumen = `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 10px;">
            <strong>📊 RESUMEN DEL RECORRIDO DFS</strong><br><br>
            <strong>Nodo inicial:</strong> ${nodoInicialActual}<br>
            <strong>L =</strong> {${recorrido.join(', ')}}<br>
            <strong>A =</strong> {${aristasRecorridas.map(a => `(${a.origen},${a.destino})`).join(', ')}}<br>
            <strong>Total nodos visitados:</strong> ${recorrido.length}/${nodos.length}<br>
            <strong>Total aristas recorridas:</strong> ${aristasRecorridas.length}
        </div>
    `;
    agregarPaso(resumen);
    
    ejecutando = false;
    document.getElementById('btnEjecutar').disabled = false;
    
    // Mantener el grafo con las aristas recorridas resaltadas
    dibujarGrafo();
    
    console.log('✅ DFS completado');
    console.log('L =', recorrido);
    console.log('A =', aristasRecorridas.map(a => `(${a.origen},${a.destino})`));
}

// ============================================
// FUNCIÓN: AGREGAR PASO AL PROCESO
// Muestra cada paso del algoritmo
// ============================================
function agregarPaso(mensaje) {
    const procesoDiv = document.getElementById('proceso');
    const step = document.createElement('div');
    step.className = 'step current';
    step.innerHTML = mensaje;
    procesoDiv.appendChild(step);
    
    // Remover clase current de pasos anteriores
    setTimeout(() => {
        step.classList.remove('current');
    }, 1000);
    
    // Auto-scroll
    procesoDiv.scrollTop = procesoDiv.scrollHeight;
}

// ============================================
// FUNCIÓN: ACTUALIZAR PILA VISUAL
// Muestra el estado de la pila gráficamente
// ============================================
function actualizarPilaVisual(pila) {
    const pilaDiv = document.getElementById('pilaVisual');
    
    if (pila.length === 0) {
        pilaDiv.innerHTML = '<div style="text-align: center; color: #999;">Vacía</div>';
        return;
    }
    
    pilaDiv.innerHTML = '';
    pila.forEach(nodo => {
        const item = document.createElement('div');
        item.className = 'pila-item';
        item.textContent = nodo;
        pilaDiv.appendChild(item);
    });
}

// ============================================
// FUNCIÓN: RESETEAR
// Elimina aristas agregadas manualmente y restaura el grafo original
// ============================================
function resetear() {
    if (nodos.length === 0) {
        cargarGrafoPredefinido();
        return;
    }
    
    ejecutando = false;
    nodoSeleccionado = null;
    nodosVisitados.clear();
    aristasRecorridas = [];
    recorrido = [];
    
    // Restaurar aristas originales
    aristas = JSON.parse(JSON.stringify(aristasOriginales));
    
    // Reconstruir grafo desde aristas originales
    grafo = {};
    for (let i = 1; i <= 9; i++) {
        grafo[i] = [];
    }
    
    aristas.forEach(arista => {
        grafo[arista.origen].push(arista.destino);
    });
    
    // Ordenar vecinos
    Object.keys(grafo).forEach(nodo => {
        grafo[nodo].sort((a, b) => a - b);
    });
    
    // Limpiar displays
    document.getElementById('conjuntoL').innerHTML = 'L = { }';
    document.getElementById('conjuntoA').innerHTML = 'A = { }';
    document.getElementById('pilaVisual').innerHTML = '<div style="text-align: center; color: #999;">Vacía</div>';
    document.getElementById('proceso').innerHTML = `🔄 Grafo reseteado. Nodo inicial actual: <strong>${nodoInicialActual}</strong><br>Listo para ejecutar DFS.`;
    document.getElementById('btnEjecutar').disabled = false;
    
    dibujarGrafo();
    
    console.log('🔄 Grafo reseteado a configuración original');
}

// ============================================
// FUNCIÓN AUXILIAR: SLEEP
// Pausa la ejecución para animaciones
// ============================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// INICIALIZACIÓN
// ============================================
console.log('✅ Sistema DFS cargado correctamente');
console.log('📌 Genera un grafo para comenzar');
