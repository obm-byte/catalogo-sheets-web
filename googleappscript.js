/* Este codigo se debe copiar en google sheets */

function doGet() {

    const hoja =
        SpreadsheetApp
            .getActiveSpreadsheet()
            .getSheetByName("CATALOGO");

    if (!hoja) {
        return ContentService
            .createTextOutput(
                JSON.stringify({
                    error: 'No existe la hoja "CATALOGO".'
                })
            )
            .setMimeType(
                ContentService.MimeType.JSON
            );
    }

    const datos =
        hoja
            .getDataRange()
            .getValues();

    const encabezados =
        datos.shift();

    const productos =
        datos
            .filter(fila => fila[0] !== "")
            .map(fila => {

                const producto = {};

                encabezados.forEach(
                    (encabezado, indice) => {

                        const nombreCampo =
                            String(encabezado).trim();

                        if (nombreCampo) {

                            producto[nombreCampo] =
                                fila[indice];

                        }

                    }
                );

                return producto;

            });

    /*
     * Hoja DESCUENTOS
     */

    const hojaDescuentos =
        SpreadsheetApp
            .getActiveSpreadsheet()
            .getSheetByName("DESCUENTOS");

    let descuentos = [];

    if (hojaDescuentos) {

        const datosDescuentos =
            hojaDescuentos
                .getDataRange()
                .getValues();

        const encabezadosDescuentos =
            datosDescuentos.shift();

        descuentos =
            datosDescuentos
                .filter(fila => fila[0] !== "")
                .map(fila => {

                    const descuento = {};

                    encabezadosDescuentos.forEach(
                        (encabezado, indice) => {

                            const nombreCampo =
                                String(encabezado).trim();

                            if (nombreCampo) {

                                descuento[nombreCampo] =
                                    fila[indice];

                            }

                        }
                    );

                    return descuento;

                });

    }

    /*
     * RESPUESTA
     */

    const respuesta = {

        productos: productos,

        descuentos: descuentos

    };

    return ContentService
        .createTextOutput(
            JSON.stringify(respuesta)
        )
        .setMimeType(
            ContentService.MimeType.JSON
        );
}