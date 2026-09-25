# catalogo-sheets-web

## Tecnologías

- HTML5
- CSS3
- JavaScript
- Google Sheets
- Google Apps Script
- Google Drive
- WhatsApp

## Funciones

- Catálogo dinámico de productos.
- Productos nuevos y destacados.
- Imágenes desde Google Drive.
- Carrusel de imágenes.
- Detalle de productos.
- Carrito de compras.
- Control de cantidades.
- Cálculo de subtotales y total.
- Envío de pedidos por WhatsApp.
- Enlaces a redes sociales.
- Diseño responsive.
- Favicon.

## Estructura

```text
mi-catalogo/
├── README.md
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── img/
    ├── instagram.png
    ├── facebook.png
    ├── tiktok.png
    ├── whatsapp.png
    ├── favicon.png
    └── carrito.png
```

## Base de datos

Los productos se administran desde Google Sheets mediante la hoja:

```text
CATALOGO
```

Los campos principales son:

```text
ID | Nombre | Categoria | Precio | Imagen1 | Imagen2 |
Imagen3 | Descripcion | Nuevo | Destacado | Activo
```

Los productos con `Activo = SI` aparecen en el catálogo.

## Iconos

Se utilizan imágenes PNG para algunos logotipos e iconos.

También se utilizan caracteres especiales **Unicode**, compatibles con entornos Debian/Linux.

## Inteligencia Artificial

Se utilizó **Inteligencia Artificial como herramienta de apoyo** durante el desarrollo para ayudar con la configuración, optimizacion de codigo, resolución de problemas y documentación del proyecto.

La implementación y configuración final fueron realizadas para el proyecto de Betarella.

## Autor

**Oscar John Blanco Martinez**
