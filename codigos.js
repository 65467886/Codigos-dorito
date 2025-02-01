const { chromium } = require('playwright');
const fs = require('fs'); // Para manejo de archivos
const { exec } = require('child_process');

// Rutas de los archivos
const filePathCodigos = './codigos.txt'; // Archivo con códigos
const filePathPremios = './premios.txt'; // Archivo para guardar premios
const filePathTodos = './todos.txt'; 

// Constantes
const MAX_PREMIOS = 5; // Máximo de premios por ciclo

(async () => {
    while (true) {
        // Leer los códigos desde el archivo
        let codigosDesdeArchivo;
        try {
            const contenidoArchivo = fs.readFileSync(filePathCodigos, 'utf-8');
            codigosDesdeArchivo = contenidoArchivo.split(',').map(codigo => codigo.trim()).filter(Boolean);
        } catch (error) {
            console.error('Error leyendo el archivo de códigos:', error);
            return;
        }

        // Verificar si quedan códigos en el archivo
        if (codigosDesdeArchivo.length === 0) {
            console.log('No quedan códigos en el archivo. Programa finalizado.');
            break; // Salimos del bucle principal
        }

        // Tomar hasta 5 códigos para procesar en este ciclo
        const codigosParaProcesar = codigosDesdeArchivo.slice(0, MAX_PREMIOS);
        const codigosRestantes = codigosDesdeArchivo.slice(MAX_PREMIOS);

        console.log('Códigos para procesar en este ciclo:', codigosParaProcesar);

        // Abrir el navegador
        const browser = await chromium.launch({ headless: false });

        const context = await browser.newContext({
            // Limpiar cookies, almacenamiento local y caché
            ignoreHTTPSErrors: true,
            viewport: { width: 1280, height: 800 },
        });

        const pageCorreo = await context.newPage();
        const pageDoritos = await context.newPage();
        try {
            // Navega a ambas páginas
            await Promise.all([
                pageCorreo.goto('https://correotemporal.org/'),
                pageDoritos.goto('https://www.joy-pepsico.eu/es-es/consumer/register'),
            ]);
            function getRandomDelay(min, max) {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
            const delay = getRandomDelay(2000, 4000);
            const codigosGenerados = new Set();
            // Página de Doritos: Haz clic en "Rechazar todo"


            const botonRechazar = await pageDoritos.waitForSelector('#truste-consent-required');
            await botonRechazar.click();


            // Página de Doritos: Haz clic en el botón con el ícono SVG
            const botonSvg = await pageDoritos.waitForSelector('svg path[fill="#1443FF"]');
            await botonSvg.click();


            // Página de correo temporal: Haz clic en el botón de consentimiento
            const botonConsentir = await pageCorreo.waitForSelector('button.fc-button.fc-cta-consent.fc-primary-button');
            await botonConsentir.click();


            // Página de correo temporal: Haz clic en el botón de copiar al portapapeles
            const botonCopiar = await pageCorreo.waitForSelector('svg > use[href="#bi-clipboard"]');
            await botonCopiar.click();


            // Obtén el contenido del correo directamente desde la página
            const clipboardContent = await pageCorreo.evaluate(() => {
                return document.querySelector('#email').textContent; // Obtener el texto del correo desde el div
            });


            // Página de Doritos: Completa el campo de email
            const emailField = await pageDoritos.waitForSelector('input#edit-email');
            await emailField.fill(clipboardContent);

            const allFrames = pageDoritos.frames();
            const iframeElement = allFrames[1]; // El primer iframe es generalmente el frame principal, seleccionamos el siguiente (índice 1).

            if (iframeElement) {
                // Busca el botón dentro del iframe
                const button = await iframeElement.$('.rc-anchor.rc-anchor-invisible');

                if (button) {
                    // Obtén la posición del botón
                    const boundingBox = await button.boundingBox();

                    if (boundingBox) {
                        // Simula mover el cursor al centro del botón
                        await pageDoritos.mouse.move(
                            boundingBox.x + boundingBox.width / 2,
                            boundingBox.y + boundingBox.height / 2
                        );

                        // Haz clic en el botón
                        await button.click();
                        console.log('Clic simulado en el botón dentro del iframe.');

                        // Sal del iframe y realiza otras interacciones si es necesario
                    } else {
                        console.log('No se pudo obtener el bounding box del botón.');
                    }
                } else {
                    console.log('Botón no encontrado dentro del iframe.');
                }
            } else {
                console.log('Iframe no encontrado.');
            }
            // Página de Doritos: Completa el campo de nombre
            const firstNameField = await pageDoritos.waitForSelector('input#edit-first-name');
            await firstNameField.fill('juanasdfasdf');


            // Página de Doritos: Completa el campo de apellido
            const lastNameField = await pageDoritos.waitForSelector('input#edit-last-name');
            await lastNameField.fill('joseqwe');


            // Página de Doritos: Haz clic en el checkbox de privacidad
            const checkboxPrivacy = await pageDoritos.waitForSelector('input#edit-privacy');
            await checkboxPrivacy.check();  // Marca el checkbox

     
            const botonGuardarCambios = await pageDoritos.waitForSelector('input#edit-actions-submit');
            await botonGuardarCambios.click();
            

            // Verificar si aparece inicialmente el mensaje de error "Antibot verification failed"
            await pageDoritos.waitForTimeout(2000); // Esperar 2 segundos después de hacer clic
            const mensajeAntibotInicial = await pageDoritos.locator('div.alert.alert-danger:has-text("Antibot verification failed")').isVisible().catch(() => false);

            if (mensajeAntibotInicial) {
                console.log('Error "Antibot verification failed" detectado. Iniciando bucle de reintentos...');

                let intentos = 0;
                const maxIntentos = 100; // Máximo número de reintentos permitidos

                while (intentos < maxIntentos) {
                    // Buscar y hacer clic en el botón "GUARDAR CAMBIOS"
                    const botonGuardarCambios = await pageDoritos.waitForSelector('input#edit-actions-submit');
                    await botonGuardarCambios.click();


                    // Esperar brevemente antes de verificar el mensaje
                    await pageDoritos.waitForTimeout(2000);

                    // Verificar si el mensaje de error sigue apareciendo
                    const mensajeAntibot = await pageDoritos.locator('div.alert.alert-danger:has-text("Antibot verification failed")').isVisible().catch(() => false);

                    if (mensajeAntibot) {

                        intentos++; // Incrementar el contador de intentos
                    } else {

                        break; // Salir del bucle si no aparece el mensaje
                    }
                }

                if (intentos === maxIntentos) {
                    console.error('Se alcanzó el número máximo de intentos. Algo salió mal.');
                    // Aquí puedes decidir qué hacer: salir del programa o registrar el error
                }
            } else {
            }



            // Página de Doritos: Haz clic en el botón "Log in (Entrar)"
            const botonLogin = await pageDoritos.waitForSelector('a.btn.btn-primary[href^="/es-es/consumer-okta/login/passwordless"]');
            await botonLogin.click();

            // Ahora en la página del correo temporal, buscamos el mensaje de "Joy by Pepsico"
            await pageCorreo.waitForSelector('div.msjrecibido'); // Esperamos a que los correos aparezcan en la lista

            // Buscar el correo con el remitente específico
            const correo = await pageCorreo.locator('div.msjrecibido .sender');
            const textoRemitente = await correo.textContent();

            if (textoRemitente.includes('Joy by Pepsico')) {
                // Encontramos el correo de "Joy by Pepsico", ahora hacemos clic en el botón "Abrir"
                const botonAbrir = await pageCorreo.locator('div.msjrecibido button.open-message');
                await botonAbrir.click();

                await pageCorreo.waitForTimeout(2000);

                // Accedemos a todos los iframes en la página
                const iframes = await pageCorreo.locator('iframe');
                const iframeCount = await iframes.count();

                const iframeLocator = pageCorreo.frameLocator('iframe').nth(1);  // Localiza el segundo iframe

                // Esperamos a que el iframe esté cargado
        const iframeElement = await pageCorreo.waitForSelector('iframe[src^="blob:"]');

        // Accedemos al iframe
        const iframe = await iframeElement.contentFrame();

        // Ahora que tenemos el iframe, buscamos la tabla dentro de él
        const table = await iframe.$('table');
        const tableHtml = await table.innerHTML(); // Extraemos el HTML de la tabla

        // Extraemos el código de verificación de la tabla
        const codigoVerificacion = await iframe.$eval('td:has-text("Introduce un código en su lugar:") b', (element) => {
            return element.textContent.trim(); // Extraemos el código que está dentro de la etiqueta <b>
        });


            if (codigoVerificacion) {
                // Hacemos clic en el botón "Introduzca un código de verificación en su lugar"
                const botonCodigoEnLugar = await pageDoritos.locator('button.enter-auth-code-instead-link');
                await botonCodigoEnLugar.click();



                // Introducimos el código de verificación en el campo correspondiente
                const inputCodigoVerificacion = await pageDoritos.locator('input[name="credentials.passcode"]');

                await inputCodigoVerificacion.fill(codigoVerificacion);


                // Hacemos clic en el botón "Verificar"
                const botonVerificar = await pageDoritos.locator('input.button-primary[type="submit"]');
                await botonVerificar.click();
            } else {
                console.log('No se pudo encontrar el código de verificación en el correo.');
            }
        } else {
            console.log('No se encontró el segundo iframe adecuado.');
        }

        const botonVerMas = await pageDoritos.locator('a[data-event="brand_hero"]').nth(1);
        await botonVerMas.click();

        let exitosTotales = 0;
        // Procesar cada código en este ciclo
for (const codigo of codigosParaProcesar){

    // En la nueva página, seleccionamos la opción de radio
    const parti = await pageDoritos.locator('a[data-event="participation_start"]').nth(1).click();
    await parti.check(); // Marca la opción de radio


    // En la nueva página, seleccionamos la opción de radio
    const radioButton = await pageDoritos.locator('input#answer-input-0-1');
    await radioButton.check(); // Marca la opción de radio

    // Aceptamos los términos y condiciones marcando el checkbox
    const checkboxTerms = await pageDoritos.locator('input#terms_conditions');
    await checkboxTerms.check(); // Marca el checkbox de términos y condiciones


    // Introducir el código en la página Doritos
    await pageDoritos.fill('input[name="code"]', codigo);
    await pageDoritos.locator('input[type="submit"][value="Enviar"]').click();
    console.log(`Código ${codigo} enviado.`);

    // Esperar unos segundos para verificar la respuesta
    await pageDoritos.waitForTimeout(1000);

    // Verificar si aparece el mensaje "Código no encontrado"
    const mensajeNoEncontrado = await pageDoritos.locator('div.pweu-confirmation-feedback > p:has-text("Código no encontrado")').isVisible().catch(() => false);
    if (mensajeNoEncontrado) {
        console.log(`El código ${codigo} no es válido. Pasando al siguiente...`);
        // Hacer clic en el botón "Vuelve a intentarlo"
        const botonIntentarDeNuevo = await pageDoritos.locator('div.pweu-confirmation-feedback .btn-wrapper input.btn.btn-primary-text[value="Vuelve a intentarlo"]');
        codigosDesdeArchivo.shift(); // Quitamos el código actual de la lista
        fs.writeFileSync(filePathCodigos, codigosDesdeArchivo.join(','), 'utf-8');
        await botonIntentarDeNuevo.click();
        // Continuar con el siguiente código
        continue;
    }

    // Verificar si aparece el mensaje "Código ya introducido por otro usuario"
    const mensajeNoEncontrado2 = await pageDoritos.locator('div.pweu-confirmation-feedback > p:has-text("Código ya introducido por otro usuario")').isVisible().catch(() => false);
    if (mensajeNoEncontrado2) {
        console.log(`El código ${codigo} ya utilizado. Pasando al siguiente...`);
        // Hacer clic en el botón "Vuelve a intentarlo"
        const botonIntentarDeNuevo = await pageDoritos.locator('div.pweu-confirmation-feedback .btn-wrapper input.btn.btn-primary-text[value="Vuelve a intentarlo"]');
        codigosDesdeArchivo.shift(); // Quitamos el código actual de la lista
        fs.writeFileSync(filePathCodigos, codigosDesdeArchivo.join(','), 'utf-8');
        await botonIntentarDeNuevo.click();
        // Continuar con el siguiente código
        continue;
    }
    await pageDoritos.waitForSelector('div.response > h3:has-text("¡Felicidades!")', { timeout: 20000 }); // 20 segundos de espera como máximo
    // Si el código es válido o se procesa, lo eliminamos del archivo
    try {
        codigosDesdeArchivo.shift(); // Quitamos el código actual de la lista
        fs.writeFileSync(filePathCodigos, codigosDesdeArchivo.join(','), 'utf-8');
    } catch (error) {
        console.error('Error actualizando el archivo de códigos:', error);
    }

    // Obtener todos los iframes de la página
    const iframes = pageDoritos.frames(); // `page.frames()` devuelve todos los iframes

    await pageCorreo.waitForTimeout(1500);
    let codeFound = false;

    for (const frame of iframes) {
        try {
            // Buscar el elemento con id="codigo" dentro del iframe
            const code = await frame.evaluate(() => {
                const element = document.querySelector('#codigo'); // Buscar el elemento con id="codigo"
                return element ? element.textContent.trim() : null;
            });

            if (code) {
                console.log(`¡Código encontrado: ${code}`);
                exitosTotales++;
                codeFound = true;
                // Guardar el código en un archivo
                fs.appendFileSync('premios.txt', `${code}\n`, 'utf-8');
                fs.appendFileSync('todos.txt', `${code}\n`, 'utf-8');
                await pageDoritos.goBack();
                break; // Detener el bucle si ya encontramos un código
            } else {
                console.log('No se encontró un elemento con id="codigo" en este iframe.');
            }
        } catch (error) {
            console.error('Error al procesar un iframe:', error.message);
        }
    }
    if (!codeFound) {
        const ahora = new Date(); // Obtener la fecha y hora actual
        const horaExacta = ahora.toLocaleTimeString(); // Formatear la hora (HH:mm:ss)
        console.log(`${horaExacta}: Esperando 30 minutos antes de intentar el siguiente...`);
        await pageDoritos.goBack();
        await pageDoritos.waitForTimeout(2 * 60 * 1000);
    }
        // Verifica si todos los códigos del ciclo tienen premio
    
}



        } catch (error) {
            console.error('Error durante el procesamiento:', error);
        } finally {
            // Cerrar el navegador después de cada ciclo
            await browser.close();
        }
    }
})();
