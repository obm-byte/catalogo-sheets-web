const URL_CATALOGO = "COLOCA_AQUI_LA_URL_DE_TU_APPS_SCRIPT";
const NUMERO_WHATSAPP = "COLOCA_AQUI_EL_NUMERO_DE_WHATSAPP";

/* VARIABLES GLOBALES */
let productosCatalogo = [];
let descuentosCatalogo = [];
let carrito = [];
let productoActual = null;
let indiceProductoActual = -1;
let imagenesModal = [];
let indiceImagenModal = 0;

/* OBTENER ELEMENTOS DEL HTML */
const contenedorNuevos = document.getElementById("productos-nuevos");
const contenedorDestacados = document.getElementById("productos-destacados");
const contenedorResto = document.getElementById("productos-resto");
const modalProducto = document.getElementById("modal-producto");
const modalCarrito = document.getElementById("modal-carrito");

/* FUNCIONES AUXILIARES */
/* Permite obtener un campo del producto sin que el programa se rompa si no existe. */
function obtenerCampo(producto, campo, valorDefault = ""){
    if (producto && Object.prototype.hasOwnProperty.call(
            producto, campo
        )
    ) {
        return producto[campo];
    }
    return valorDefault;
}
/* Convierte el precio recibido desde Google Sheets en un número. */

function obtenerPrecio(valor) {

    if (typeof valor === "number" && !isNaN(valor)
    ) {
        return valor;
    }

    const texto = String(valor || "")
            .replace(",", ".")
            .replace(/[^\d.-]/g, "");

    const numero = parseFloat(texto);

    return isNaN(numero) ? 0 : numero;
}

/* Comprueba si un valor es SI. */
function esSi(valor) {
    return String(valor || "")
        .trim()
        .toUpperCase() === "SI";
}

/* Evita que texto proveniente de Google Sheets pueda romper el HTML. */
function escaparHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* Convierte enlaces de Google Drive en enlaces que el navegador puede mostrar directamente como imagen. */

function obtenerImagen(valor) {
    const imagen = String(valor || "").trim();

    if (!imagen) {
        return "";
    }

    /* Google Drive */

    if (imagen.includes("drive.google.com")
    ) {
        /* Formato: https://drive.google.com/file/d/ID/view */
        const coincidencia = imagen.match(/\/file\/d\/([^/]+)/);

        if (coincidencia){
            const idArchivo =
                coincidencia[1];
            return `https://lh3.googleusercontent.com/d/${idArchivo}=w1000?authuser=0`;
        }

        /* Formato: https://drive.google.com/open?id=ID */

        try {
            const url = new URL(imagen);
            const idArchivo = url.searchParams.get("id");

            if (idArchivo){
                return `https://lh3.googleusercontent.com/d/${idArchivo}=w1000?authuser=0`;

            }

        } catch (error) {
            console.warn(
                "No se pudo procesar el enlace de Drive:",
                imagen
            );
        }
    }

    /* Si ya es una URL normal, la devolvemos directamente. */
    return imagen;

}

/* Formatea el precio. La moneda se puede cambiar desde el HTML si se necesita utilizar otra moneda. */

function formatearPrecio(precio) {

    return new Intl.NumberFormat(
        "es-BO",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(obtenerPrecio(precio)
    );
}


/* Imagen alternativa cuando el enlace no funciona. */

function imagenFallback() {
    return `
        data:image/svg+xml;charset=UTF-8,
        ${encodeURIComponent(`
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="600"
                height="600"
                viewBox="0 0 600 600"
            >

                <rect
                    width="600"
                    height="600"
                    fill="#F1F1F1"
                />

                <text
                    x="300"
                    y="285"
                    text-anchor="middle"
                    fill="#555555"
                    font-family="Arial"
                    font-size="30"
                    font-weight="bold"
                >
                    Imagen no disponible
                </text>

            </svg>
        `)}
    `;
}


/* Si una imagen falla, mostramos una imagen alternativa. */
function manejarErrorImagen(imagen) {
    imagen.onerror = null;
    imagen.src = imagenFallback();
}

/* DESCUENTOS */

/* Obtiene el porcentaje de descuento correspondiente al total de la compra.
    Ejemplo: 100 → 2% 200 → 5% 300 → 10% */

function obtenerDescuento(total) {
    const montoTotal = obtenerPrecio(total);

    let porcentaje = 0;
    if (!Array.isArray(
            descuentosCatalogo
        )
    ) {
        return 0;
    }

    descuentosCatalogo.forEach(
        descuento => {

            const montoMinimo = obtenerPrecio(
                    descuento.MontoMinimo
                );

            const valorDescuento = obtenerPrecio(
                    descuento.Descuento
                );

            if (montoTotal >= montoMinimo && valorDescuento >= 0){
                porcentaje = valorDescuento;
            }
        }
    );
    return porcentaje;
}

/* Calcula toda la información del descuento. */
function calcularDescuento(total) {
    const subtotal = obtenerPrecio(total);
    const porcentaje = obtenerDescuento(subtotal);
    const montoDescuento = subtotal * (porcentaje / 100);
    const totalFinal = subtotal - montoDescuento;

    return {
        subtotal: subtotal,
        porcentaje: porcentaje,
        montoDescuento: montoDescuento,
        totalFinal: totalFinal
    };
}

/* CARGAR PRODUCTOS Y DESCUENTOS */

async function cargarProductos() {
    mostrarCarga();
    try {const respuesta = await fetch(URL_CATALOGO);
        if (!respuesta.ok){
            throw new Error( "No se pudo conectar con el catálogo.");
        }
        const datos = await respuesta.json();
        
        /* El Apps Script devuelve:
            {
                productos: [...],
                descuentos: [...]
            }*/

        if ( !datos || typeof datos !== "object"){
            throw new Error(
                "El catálogo recibido no tiene un formato válido."
            );
        }

        /* Productos */

        if (!Array.isArray(
                datos.productos
            )
        ) {
            throw new Error(
                "No se encontraron productos."
            );
        }

        productosCatalogo =
            datos.productos.filter(
                producto =>
                    esSi(
                        obtenerCampo(
                            producto,
                            "Activo"
                        )
                    )
            );


        /*
            Descuentos
        */

        if (
            Array.isArray(
                datos.descuentos
            )
        ) {

            descuentosCatalogo =
                datos.descuentos
                    .filter(
                        descuento => {

                            const monto =
                                obtenerPrecio(
                                    descuento.MontoMinimo
                                );

                            const porcentaje =
                                obtenerPrecio(
                                    descuento.Descuento
                                );

                            return (
                                monto >= 0 &&
                                porcentaje >= 0
                            );

                        }
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            obtenerPrecio(
                                a.MontoMinimo
                            ) -
                            obtenerPrecio(
                                b.MontoMinimo
                            )
                    );

        } else {

            descuentosCatalogo = [];

        }


        /*
            Mostrar productos
        */

        mostrarCatalogo();


        /*
            Actualizar carrito
        */

        actualizarCarrito();


    } catch (error) {

        console.error(
            "Error al cargar el catálogo:",
            error
        );

        mostrarError();

    }

}


/* =========================================================
   ESTADOS DEL CATÁLOGO
   ========================================================= */

function mostrarCarga() {

    const mensaje = `
        <div class="cargando">
            Cargando productos...
        </div>
    `;


    if (contenedorNuevos) {

        contenedorNuevos.innerHTML =
            mensaje;

    }


    if (contenedorDestacados) {

        contenedorDestacados.innerHTML =
            "";

    }


    if (contenedorResto) {

        contenedorResto.innerHTML =
            "";

    }

}


function mostrarError() {

    const mensaje = `
        <div class="error">

            <strong>
                No pudimos cargar el catálogo.
            </strong>

            <p>
                Verifica la conexión con la fuente
                de productos e intenta nuevamente.
            </p>

        </div>
    `;


    if (contenedorNuevos) {

        contenedorNuevos.innerHTML =
            mensaje;

    }


    if (contenedorDestacados) {

        contenedorDestacados.innerHTML =
            "";

    }


    if (contenedorResto) {

        contenedorResto.innerHTML =
            "";

    }

}


/* =========================================================
   MOSTRAR CATÁLOGO
   ========================================================= */

function mostrarCatalogo() {

    if (contenedorNuevos) {

        contenedorNuevos.innerHTML =
            "";

    }


    if (contenedorDestacados) {

        contenedorDestacados.innerHTML =
            "";

    }


    if (contenedorResto) {

        contenedorResto.innerHTML =
            "";

    }


    /*
        Separar productos
    */

    const nuevos =
        productosCatalogo.filter(
            producto =>
                esSi(
                    obtenerCampo(
                        producto,
                        "Nuevo"
                    )
                )
        );


    const destacados =
        productosCatalogo.filter(
            producto =>
                esSi(
                    obtenerCampo(
                        producto,
                        "Destacado"
                    )
                )
        );


    /*
        Productos que no son nuevos
        ni destacados.
    */

    const resto =
        productosCatalogo.filter(
            producto =>
                !esSi(
                    obtenerCampo(
                        producto,
                        "Nuevo"
                    )
                ) &&
                !esSi(
                    obtenerCampo(
                        producto,
                        "Destacado"
                    )
                )
        );


    /*
        Mostrar cada grupo
    */

    mostrarProductos(
        nuevos,
        contenedorNuevos
    );


    mostrarProductos(
        destacados,
        contenedorDestacados
    );


    mostrarProductos(
        resto,
        contenedorResto
    );


    /*
        Ocultar secciones vacías
    */

    controlarSeccion(
        "seccion-nuevos",
        nuevos.length
    );


    controlarSeccion(
        "seccion-destacados",
        destacados.length
    );


    controlarSeccion(
        "seccion-resto",
        resto.length
    );

}


/* =========================================================
   CONTROLAR SECCIONES
   ========================================================= */

function controlarSeccion(
    idSeccion,
    cantidad
) {

    const seccion =
        document.getElementById(
            idSeccion
        );


    if (!seccion) {

        return;

    }


    if (cantidad === 0) {

        seccion.style.display =
            "none";

    } else {

        seccion.style.display =
            "";

    }

}


/* =========================================================
   MOSTRAR PRODUCTOS
   ========================================================= */

function mostrarProductos(
    productos,
    contenedor
) {

    if (!contenedor) {

        return;

    }


    if (!productos.length) {

        contenedor.innerHTML = `
            <div class="sin-productos">
                No hay productos disponibles
                en esta sección.
            </div>
        `;

        return;

    }


    /*
        Buscar el índice original
        de cada producto.
    */

    productos.forEach(
        producto => {

            const indice =
                productosCatalogo.indexOf(
                    producto
                );


            mostrarProducto(
                producto,
                indice,
                contenedor
            );

        }
    );

}


/* =========================================================
   CREAR TARJETA DE PRODUCTO
   ========================================================= */

function mostrarProducto(
    producto,
    indice,
    contenedor
) {

    const nombre =
        obtenerCampo(
            producto,
            "Nombre",
            "Producto"
        );


    const categoria =
        obtenerCampo(
            producto,
            "Categoria",
            "Sin categoría"
        );


    const precio =
        obtenerPrecio(
            obtenerCampo(
                producto,
                "Precio",
                0
            )
        );


    const descripcion =
        obtenerCampo(
            producto,
            "Descripcion",
            ""
        );


    const imagen =
        obtenerImagen(
            obtenerCampo(
                producto,
                "Imagen1"
            )
        );


    const imagenFinal =
        imagen ||
        imagenFallback();


    const tarjeta =
        document.createElement(
            "article"
        );


    tarjeta.className =
        "card";


    tarjeta.innerHTML = `
        <img
            src="${escaparHTML(imagenFinal)}"
            alt="${escaparHTML(nombre)}"
            loading="lazy"
            onerror="manejarErrorImagen(this)"
        >

        <div class="card-content">

            <h3>
                ${escaparHTML(nombre)}
            </h3>

            <p>
                ${
                    escaparHTML(
                        descripcion ||
                        categoria
                    )
                }
            </p>

            <div class="precio">
                Bs ${formatearPrecio(precio)}
            </div>

            <button
                type="button"
                class="btn"
                onclick="verProducto(${indice})"
            >
                Ver detalles
            </button>

        </div>
    `;


    contenedor.appendChild(
        tarjeta
    );

}


/* =========================================================
   ACTUALIZAR TOTAL DEL PRODUCTO EN EL MODAL
   ========================================================= */

function actualizarTotalProductoModal() {

    const input =
        document.getElementById(
            "cantidad-producto"
        );


    const totalElemento =
        document.getElementById(
            "total-producto-modal"
        );


    if (
        !input ||
        !totalElemento ||
        !productoActual
    ) {

        return;

    }


    /*
        Obtener cantidad
    */

    let cantidad =
        parseInt(
            input.value,
            10
        );


    /*
        Asegurar mínimo 1
    */

    if (
        isNaN(cantidad) ||
        cantidad < 1
    ) {

        cantidad = 1;

        input.value = 1;

    }


    /*
        Obtener precio
    */

    const precio =
        obtenerPrecio(
            obtenerCampo(
                productoActual,
                "Precio",
                0
            )
        );


    /*
        Calcular subtotal
    */

    const subtotal =
        precio *
        cantidad;


    /*
        Mostrar resultado
    */

    totalElemento.innerHTML = `
        Total:

        <strong>
            Bs ${formatearPrecio(subtotal)}
        </strong>
    `;

}


/* =========================================================
   ABRIR PRODUCTO
   ========================================================= */

function verProducto(indice) {

    if (
        indice < 0 ||
        indice >= productosCatalogo.length
    ) {

        return;

    }


    const producto =
        productosCatalogo[indice];


    productoActual =
        producto;


    indiceProductoActual =
        indice;


    /*
        Información
    */

    const nombre =
        obtenerCampo(
            producto,
            "Nombre",
            "Producto"
        );


    const categoria =
        obtenerCampo(
            producto,
            "Categoria",
            "Sin categoría"
        );


    const precio =
        obtenerPrecio(
            obtenerCampo(
                producto,
                "Precio",
                0
            )
        );


    const descripcion =
        obtenerCampo(
            producto,
            "Descripcion",
            ""
        );


    /*
        Colocar información
        en el modal
    */

    const modalNombre =
        document.getElementById(
            "modal-nombre"
        );


    const modalCategoria =
        document.getElementById(
            "modal-categoria"
        );


    const modalPrecio =
        document.getElementById(
            "modal-precio"
        );


    const modalDescripcion =
        document.getElementById(
            "modal-descripcion"
        );


    if (modalNombre) {

        modalNombre.textContent =
            nombre;

    }


    if (modalCategoria) {

        modalCategoria.textContent =
            categoria;

    }


    if (modalPrecio) {

        modalPrecio.textContent =
            `Bs ${formatearPrecio(precio)}`;

    }


    if (modalDescripcion) {

        modalDescripcion.textContent =
            descripcion ||
            "Información del producto.";

    }


    /*
        Reiniciar cantidad
    */

    const inputCantidad =
        document.getElementById(
            "cantidad-producto"
        );


    if (inputCantidad) {

        inputCantidad.value = 1;

    }


    /*
        Actualizar total
    */

    actualizarTotalProductoModal();


    /*
        Obtener las imágenes
    */

    imagenesModal = [

        obtenerImagen(
            obtenerCampo(
                producto,
                "Imagen1"
            )
        ),

        obtenerImagen(
            obtenerCampo(
                producto,
                "Imagen2"
            )
        ),

        obtenerImagen(
            obtenerCampo(
                producto,
                "Imagen3"
            )
        )

    ].filter(
        imagen => imagen !== ""
    );


    /*
        Reiniciar carrusel
    */

    indiceImagenModal = 0;

    mostrarImagenCarrusel();


    /*
        Abrir modal
    */

    if (modalProducto) {

        modalProducto.classList.add(
            "activo"
        );

    }


    document.body.classList.add(
        "modal-abierto"
    );

}


/* =========================================================
   CARRUSEL
   ========================================================= */

function mostrarImagenCarrusel() {

    const imagen =
        document.getElementById(
            "modal-imagen"
        );


    const indicadores =
        document.getElementById(
            "indicadores-carrusel"
        );


    const anterior =
        document.getElementById(
            "carrusel-anterior"
        );


    const siguiente =
        document.getElementById(
            "carrusel-siguiente"
        );


    if (
        !imagen ||
        !indicadores ||
        !anterior ||
        !siguiente
    ) {

        return;

    }


    /*
        Si no hay imágenes
    */

    if (!imagenesModal.length) {

        imagen.src =
            imagenFallback();

        imagen.alt =
            "Imagen no disponible";

        indicadores.innerHTML =
            "";

        anterior.style.display =
            "none";

        siguiente.style.display =
            "none";

        return;

    }


    /*
        Evitar índices incorrectos
    */

    if (
        indiceImagenModal < 0
    ) {

        indiceImagenModal = 0;

    }


    if (
        indiceImagenModal >=
        imagenesModal.length
    ) {

        indiceImagenModal =
            imagenesModal.length - 1;

    }


    /*
        Mostrar imagen actual
    */

    imagen.src =
        imagenesModal[
            indiceImagenModal
        ];


    imagen.alt =
        obtenerCampo(
            productoActual,
            "Nombre",
            "Producto"
        );


    imagen.onerror =
        function () {

            manejarErrorImagen(
                this
            );

        };


    /*
        Mostrar u ocultar flechas
    */

    const hayVariasImagenes =
        imagenesModal.length > 1;


    anterior.style.display =
        hayVariasImagenes
            ? "flex"
            : "none";


    siguiente.style.display =
        hayVariasImagenes
            ? "flex"
            : "none";


    /*
        Indicadores
    */

    indicadores.innerHTML =
        imagenesModal
            .map(
                (
                    _,
                    indice
                ) => {

                    return `
                        <button
                            type="button"
                            class="indicador-carrusel ${
                                indice ===
                                indiceImagenModal
                                    ? "activo"
                                    : ""
                            }"
                            onclick="irAImagen(${indice})"
                            aria-label="Ir a imagen ${indice + 1}"
                        ></button>
                    `;

                }
            )
            .join("");

}


/*
    Imagen anterior
*/

function imagenAnterior() {

    if (
        imagenesModal.length <= 1
    ) {

        return;

    }


    indiceImagenModal--;


    if (
        indiceImagenModal < 0
    ) {

        indiceImagenModal =
            imagenesModal.length - 1;

    }


    mostrarImagenCarrusel();

}


/*
    Imagen siguiente
*/

function imagenSiguiente() {

    if (
        imagenesModal.length <= 1
    ) {

        return;

    }


    indiceImagenModal++;


    if (
        indiceImagenModal >=
        imagenesModal.length
    ) {

        indiceImagenModal = 0;

    }


    mostrarImagenCarrusel();

}


/*
    Ir directamente a una imagen
*/

function irAImagen(indice) {

    if (
        indice < 0 ||
        indice >= imagenesModal.length
    ) {

        return;

    }


    indiceImagenModal =
        indice;


    mostrarImagenCarrusel();

}


/* =========================================================
   CANTIDAD DEL PRODUCTO
   ========================================================= */

function cambiarCantidad(cambio) {

    const input =
        document.getElementById(
            "cantidad-producto"
        );


    if (!input) {

        return;

    }


    let cantidad =
        parseInt(
            input.value,
            10
        );


    if (
        isNaN(cantidad) ||
        cantidad < 1
    ) {

        cantidad = 1;

    }


    cantidad += cambio;


    if (
        cantidad < 1
    ) {

        cantidad = 1;

    }


    input.value =
        cantidad;


    actualizarTotalProductoModal();

}


/*
    Evitar cantidades menores a 1
    y actualizar el total cuando
    el usuario escribe directamente.
*/

document.addEventListener(
    "input",
    function (evento) {

        if (
            evento.target.id !==
            "cantidad-producto"
        ) {

            return;

        }


        let cantidad =
            parseInt(
                evento.target.value,
                10
            );


        if (
            isNaN(cantidad) ||
            cantidad < 1
        ) {

            cantidad = 1;

        }


        evento.target.value =
            cantidad;


        actualizarTotalProductoModal();

    }
);


/* =========================================================
   CARRITO
   ========================================================= */

function agregarAlCarrito() {

    if (!productoActual) {

        return;

    }


    const input =
        document.getElementById(
            "cantidad-producto"
        );


    let cantidad =
        parseInt(
            input?.value,
            10
        );


    if (
        isNaN(cantidad) ||
        cantidad < 1
    ) {

        cantidad = 1;

    }


    const idProducto =
        obtenerCampo(
            productoActual,
            "ID",
            indiceProductoActual
        );


    /*
        Buscar si ya existe
        en el carrito.
    */

    const productoExistente =
        carrito.find(
            item =>
                String(item.id) ===
                String(idProducto)
        );


    if (productoExistente) {

        productoExistente.cantidad +=
            cantidad;

    } else {

        carrito.push({

            id:
                idProducto,

            producto:
                productoActual,

            cantidad:
                cantidad

        });

    }


    actualizarCarrito();

    mostrarMensajeCarrito();


    /*
        Cerramos el modal
        del producto.
    */

    cerrarModal();

}


/* =========================================================
   ACTUALIZAR CARRITO
   ========================================================= */

function actualizarCarrito() {

    const contador =
        document.getElementById(
            "contador-carrito"
        );


    /*
        Cantidad total de unidades
    */

    const cantidadTotal =
        carrito.reduce(
            (
                total,
                item
            ) => {

                return total +
                    item.cantidad;

            },
            0
        );


    if (contador) {

        contador.textContent =
            cantidadTotal;

    }


    /*
        Renderizar productos
    */

    renderizarCarrito();

}


/* =========================================================
   RENDERIZAR CARRITO
   ========================================================= */

function renderizarCarrito() {

    const lista =
        document.getElementById(
            "lista-carrito"
        );


    const totalElemento =
        document.getElementById(
            "total-carrito"
        );


    if (!lista) {

        return;

    }


    /*
        Carrito vacío
    */

    if (!carrito.length) {

        lista.innerHTML = `
            <div class="carrito-vacio">

                <strong>
                    Tu carrito está vacío
                </strong>

                <p>
                    Agrega productos para comenzar tu pedido.
                </p>

            </div>
        `;


        if (totalElemento) {

            totalElemento.innerHTML =
                "Bs 0.00";

        }

        return;

    }


    /*
        Dibujar productos
    */

    lista.innerHTML =
        carrito
            .map(
                (
                    item,
                    indice
                ) => {

                    const producto =
                        item.producto;


                    const nombre =
                        obtenerCampo(
                            producto,
                            "Nombre",
                            "Producto"
                        );


                    const precio =
                        obtenerPrecio(
                            obtenerCampo(
                                producto,
                                "Precio",
                                0
                            )
                        );


                    const imagen =
                        obtenerImagen(
                            obtenerCampo(
                                producto,
                                "Imagen1"
                            )
                        ) ||
                        imagenFallback();


                    const subtotal =
                        precio *
                        item.cantidad;


                    return `
                        <div
                            class="item-carrito"
                        >

                            <img
                                src="${escaparHTML(imagen)}"
                                alt="${escaparHTML(nombre)}"
                                onerror="manejarErrorImagen(this)"
                            >


                            <div>

                                <h3>
                                    ${escaparHTML(nombre)}
                                </h3>


                                <p>
                                    Bs ${formatearPrecio(precio)}
                                    ×
                                    ${item.cantidad}
                                </p>


                                <p>
                                    Subtotal:

                                    <strong>
                                        Bs ${formatearPrecio(subtotal)}
                                    </strong>
                                </p>


                                <div
                                    class="cantidad-controles"
                                    style="margin-top: 8px;"
                                >

                                    <button
                                        type="button"
                                        onclick="cambiarCantidadCarrito(${indice}, -1)"
                                    >
                                        −
                                    </button>


                                    <input
                                        type="number"
                                        value="${item.cantidad}"
                                        min="1"
                                        readonly
                                    >


                                    <button
                                        type="button"
                                        onclick="cambiarCantidadCarrito(${indice}, 1)"
                                    >
                                        +
                                    </button>

                                </div>

                            </div>


                            <button
                                type="button"
                                onclick="eliminarDelCarrito(${indice})"
                                aria-label="Eliminar producto"
                                class="btn-eliminar-carrito"
                            >
                                ×
                            </button>

                        </div>
                    `;

                }
            )
            .join("");


    /*
        Calcular subtotal
    */

    const subtotal =
        carrito.reduce(
            (
                suma,
                item
            ) => {

                const precio =
                    obtenerPrecio(
                        obtenerCampo(
                            item.producto,
                            "Precio",
                            0
                        )
                    );


                return suma +
                    (
                        precio *
                        item.cantidad
                    );

            },
            0
        );


    /*
        Calcular descuento
    */

    const informacionDescuento =
        calcularDescuento(
            subtotal
        );


    /*
        Mostrar resumen
    */

    let resumenHTML = `
        <div class="resumen-carrito">

            <div>
                Subtotal:

                <strong>
                    Bs ${formatearPrecio(
                        informacionDescuento.subtotal
                    )}
                </strong>
            </div>
    `;


    if (
        informacionDescuento.porcentaje > 0
    ) {

        resumenHTML += `
            <div class="descuento-carrito">

                Descuento:

                <strong>
                    ${formatearPrecio(
                        informacionDescuento.porcentaje
                    )}%
                </strong>

                <span>
                    (-Bs ${formatearPrecio(
                        informacionDescuento.montoDescuento
                    )})
                </span>

            </div>
        `;

    }


    resumenHTML += `
            <div class="total-final-carrito">

                Total:

                <strong>
                    Bs ${formatearPrecio(
                        informacionDescuento.totalFinal
                    )}
                </strong>

            </div>

        </div>
    `;


    if (totalElemento) {

        totalElemento.innerHTML =
            resumenHTML;

    }

}


/* =========================================================
   CAMBIAR CANTIDAD DEL CARRITO
   ========================================================= */

function cambiarCantidadCarrito(indice, cambio) {
    
    if (indice < 0 || indice >= carrito.length) {
        return;
    }
    carrito[indice].cantidad += cambio;

    /* Mínimo 1 */
    if (carrito[indice].cantidad < 1) {
        carrito[indice].cantidad = 1;
    }
    actualizarCarrito();
}

/* ELIMINAR DEL CARRITO */
function eliminarDelCarrito(indice) {

    if ( indice < 0 || indice >= carrito.length) {
        return;
    }

    carrito.splice(indice, 1);
    actualizarCarrito();
}

/* ABRIR CARRITO */
function abrirCarrito() {

    renderizarCarrito();

    if (modalCarrito) {
        modalCarrito.classList.add("activo");
    }

    document.body.classList.add("modal-abierto");
}

/* CERRAR CARRITO */
function cerrarCarrito() {

    if (modalCarrito){
        modalCarrito.classList.remove("activo");
    }

    /* Si el modal del producto tampoco está abierto, permitimos volver a hacer scroll. */
    if (!modalProducto || !modalProducto.classList.contains("activo")){
        document.body.classList.remove("modal-abierto");
    }
}

/* CERRAR MODAL DE PRODUCTO */
function cerrarModal() {
    if (modalProducto) {
        modalProducto.classList.remove(
            "activo"
        );
    }

    if (!modalCarrito || !modalCarrito.classList.contains(
            "activo"
        )
    ) {
        document.body.classList.remove("modal-abierto");
    }
}

/* MENSAJE "AGREGADO AL CARRITO" */

function mostrarMensajeCarrito() {

    const mensaje = document.getElementById("mensaje-carrito");

    if (!mensaje) {
        return;
    }

    mensaje.classList.add("mostrar");

    setTimeout(
        function () {
            mensaje.classList.remove("mostrar");
        },
        2200
    );
}

/* ENVIAR PEDIDO POR WHATSAPP */
function enviarWhatsApp() {

    if (!carrito.length) {
    alert("Tu carrito está vacío.");
        return;
    }

    /* Mensaje genérico. No contiene nombre de marca, número ni información específica. */
    let mensaje = "Hola.\n\n";
    
    mensaje += "Quiero realizar el siguiente pedido:\n\n";

    let subtotalGeneral = 0;

    /* Productos */
    carrito.forEach((item, indice) => {
            
            const producto = item.producto;
            const nombre = obtenerCampo(producto, "Nombre", "Producto");
            const precio = obtenerPrecio(obtenerCampo(producto, "Precio", 0));

            const subtotal = precio * item.cantidad;
            subtotalGeneral += subtotal;
            mensaje += `${indice + 1}. ${nombre}\n`;
            mensaje += `Cantidad: ${item.cantidad}\n`;
            mensaje += `Precio unitario: Bs ${formatearPrecio(precio)}\n`;
            mensaje += `Subtotal: Bs ${formatearPrecio(subtotal)}\n\n`;
        }
    );

    /* Calcular descuento */
    const informacionDescuento = calcularDescuento(subtotalGeneral);

    /* Resumen final */
    mensaje +="--------------------------\n";
    mensaje += `SUBTOTAL: Bs ${formatearPrecio(
        informacionDescuento.subtotal
    )}\n`;


    if (informacionDescuento.porcentaje > 0){
        mensaje +=`DESCUENTO: ${formatearPrecio(
            informacionDescuento.porcentaje
        )}%\n`;

        mensaje += `AHORRO: Bs ${formatearPrecio(informacionDescuento.montoDescuento)}\n`;
    }

    mensaje += `TOTAL: Bs ${formatearPrecio(informacionDescuento.totalFinal)}\n`;

    mensaje += "--------------------------\n\n";

    mensaje += "Quedo atento/a para confirmar el pedido.";

    /* Codificar mensaje */
    const mensajeCodificado =encodeURIComponent(mensaje);

    /* Crear URL de WhatsApp */
    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${mensajeCodificado}`;

    /* Abrir WhatsApp */
    window.open(url, "_blank");
}

/* CERRAR MODALES AL HACER CLICK FUERA */
if (modalProducto) {
    modalProducto.addEventListener(
        "click",
        function (evento) {
            if (evento.target === modalProducto){
                cerrarModal();
            }
        }
    );
}

if (modalCarrito){
    modalCarrito.addEventListener(
        "click",
        function (evento) {
            if (evento.target === modalCarrito){
                cerrarCarrito();
            }
        }
    );
}

/* TECLA ESCAPE */
document.addEventListener(
    "keydown",
    function (evento){

        if (evento.key !== "Escape"){
            return;
        }

        if (modalProducto && modalProducto.classList.contains("activo")){
            cerrarModal();
        }

        if (modalCarrito && modalCarrito.classList.contains("activo")){
            cerrarCarrito();
        }
    }
);

/* INICIALIZAR */
cargarProductos();

actualizarCarrito();