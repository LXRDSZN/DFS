// ============================================
// VARIABLES GLOBALES
// ============================================

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Estructura del grafo
let nodos = [];           // Array de objetos {id, x, y}
let aristas = [];         // Array de objetos {origen, destino}
let grafo = {};           // Objeto {nodoId: [vecinos ordenados]}

// Control de interacción
let nodoSeleccionado = null;
let nodoInicialGlobal = null;

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
// FUNCIÓN: GENERAR GRAFO
// Crea los nodos en posiciones circulares
// ============================================
function generarGrafo() {
    const numNodos = parseInt(document.getElementById('numNodos').value);
    const nodoInicial = parseInt(document.getElementById('nodoInicial').value);
    
    // Validaciones
    if (!numNodos || numNodos < 3 || numNodos > 15) {
        alert('Por favor ingresa un número de nodos entre 3 y 15');
        return;
    }
    
    if (!nodoInicial || nodoInicial < 1 || nodoInicial > numNodos) {
        alert(`El nodo inicial debe estar entre 1 y ${numNodos}`);
        return;
    }
    
    // Reiniciar estado
    nodos = [];
    aristas = [];
    grafo = {};
    nodoSeleccionado = null;
    nodoInicialGlobal = nodoInicial;
    ejecutando = false;
    nodosVisitados.clear();
    aristasRecorridas = [];
    recorrido = [];
    
    // Calcular posiciones en círculo usando coordenadas polares
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radio = Math.min(centerX, centerY) - 80; // Radio del círculo
    
    for (let i = 0; i < numNodos; i++) {
        // Ángulo en radianes (distribuir uniformemente)
        const angulo = (i * 2 * Math.PI / numNodos) - (Math.PI / 2); // -90° para empezar arriba
        
        // Conversión de coordenadas polares a cartesianas
        const x = centerX + radio * Math.cos(angulo);
        const y = centerY + radio * Math.sin(angulo);
        
        nodos.push({
            id: i + 1,
            x: x,
            y: y
        });
        
        grafo[i + 1] = []; // Inicializar lista de adyacencia
    }
    
    // Limpiar displays
    document.getElementById('conjuntoL').innerHTML = 'L = { }';
    document.getElementById('conjuntoA').innerHTML = 'A = { }';
    document.getElementById('pilaVisual').innerHTML = '<div style="text-align: center; color: #999;">Vacía</div>';
    document.getElementById('proceso').innerHTML = 'Haz clic en los nodos para crear conexiones...';
    
    document.getElementById('btnEjecutar').disabled = false;
    
    // Dibujar grafo inicial
    dibujarGrafo();
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
        if (nodo.id === nodoInicialGlobal && !ejecutando) {
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
        alert('Primero genera el grafo');
        return;
    }
    
    if (aristas.length === 0) {
        alert('Crea al menos una conexión entre nodos');
        return;
    }
    
    // Reiniciar estado
    ejecutando = true;
    nodosVisitados.clear();
    aristasRecorridas = [];
    recorrido = [];
    
    document.getElementById('btnEjecutar').disabled = true;
    document.getElementById('proceso').innerHTML = '';
    
    // Inicializar pila con el nodo inicial
    const pila = [nodoInicialGlobal];
    
    agregarPaso(`<strong>INICIO:</strong> Pila = [${nodoInicialGlobal}]`);
    actualizarPilaVisual(pila);
    
    // Algoritmo DFS
    while (pila.length > 0) {
        // Esperar para animación
        await sleep(1000);
        
        // Sacar nodo de la pila (LIFO - Last In First Out)
        const nodoActual = pila.pop();
        actualizarPilaVisual(pila);
        
        // Si ya fue visitado, continuar
        if (nodosVisitados.has(nodoActual)) {
            agregarPaso(`Nodo <span class="highlight">${nodoActual}</span> ya visitado, continuar...`);
            continue;
        }
        
        // Marcar como visitado
        nodosVisitados.add(nodoActual);
        recorrido.push(nodoActual);
        
        agregarPaso(`<strong>Visitando nodo ${nodoActual}</strong>`);
        
        // Actualizar conjunto L
        document.getElementById('conjuntoL').innerHTML = 
            `L = { ${recorrido.join(', ')} }`;
        
        // Dibujar estado actual
        dibujarGrafo(nodoActual);
        await sleep(800);
        
        // Obtener vecinos ordenados de menor a mayor
        const vecinos = grafo[nodoActual] || [];
        
        if (vecinos.length > 0) {
            agregarPaso(`Vecinos de ${nodoActual}: [${vecinos.join(', ')}]`);
            
            // Agregar vecinos no visitados a la pila en orden INVERSO
            // (para que el menor quede arriba de la pila)
            const vecinosNoVisitados = vecinos.filter(v => !nodosVisitados.has(v));
            const vecinosInversos = [...vecinosNoVisitados].reverse();
            
            vecinosInversos.forEach(vecino => {
                if (!pila.includes(vecino)) {
                    pila.push(vecino);
                    
                    // Registrar arista recorrida
                    aristasRecorridas.push({
                        origen: nodoActual,
                        destino: vecino
                    });
                }
            });
            
            if (vecinosNoVisitados.length > 0) {
                agregarPaso(`Agregados a la pila: [${vecinosNoVisitados.join(', ')}]`);
            }
        } else {
            agregarPaso(`Nodo ${nodoActual} no tiene vecinos`);
        }
        
        agregarPaso(`Pila = [${pila.join(', ')}]`);
        actualizarPilaVisual(pila);
        
        // Actualizar conjunto A
        const aristasTexto = aristasRecorridas.map(
            a => `(${a.origen},${a.destino})`
        ).join(', ');
        document.getElementById('conjuntoA').innerHTML = 
            `A = { ${aristasTexto} }`;
        
        dibujarGrafo();
    }
    
    // Finalizar
    agregarPaso('<strong style="color: #4caf50;">✅ DFS COMPLETADO</strong>');
    agregarPaso(`Recorrido final: ${recorrido.join(' → ')}`);
    
    ejecutando = false;
    document.getElementById('btnEjecutar').disabled = false;
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
// Limpia todo y reinicia el estado
// ============================================
function resetear() {
    nodos = [];
    aristas = [];
    grafo = {};
    nodoSeleccionado = null;
    nodoInicialGlobal = null;
    ejecutando = false;
    nodosVisitados.clear();
    aristasRecorridas = [];
    recorrido = [];
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    document.getElementById('numNodos').value = '6';
    document.getElementById('nodoInicial').value = '1';
    document.getElementById('conjuntoL').innerHTML = 'L = { }';
    document.getElementById('conjuntoA').innerHTML = 'A = { }';
    document.getElementById('pilaVisual').innerHTML = '<div style="text-align: center; color: #999;">Vacía</div>';
    document.getElementById('proceso').innerHTML = 'Esperando inicio del algoritmo...';
    document.getElementById('btnEjecutar').disabled = true;
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
