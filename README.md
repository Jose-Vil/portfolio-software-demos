# Jose Luis · Software & automatización

**Cuatro demos interactivas de desarrollo Full Stack, automatización de procesos y experiencias 3D.**

[Abrir el portafolio](https://Jose-Vil.github.io/portfolio-software-demos/) · [Perfil de GitHub](https://github.com/Jose-Vil)

![Vista del portafolio](docs/portfolio-desktop.jpg)

Soy Jose Luis Rodriguez Villegas, ingeniero en Sistemas Computacionales por el IPN. Este repositorio reúne versiones demostrativas de problemas que he abordado en mis proyectos: convertir documentos en información revisable, modelar procesos de atención por mensajería, administrar un flujo de compra e inventario y desarrollar interfaces interactivas.

## Prueba los proyectos

| Demo                                                                          | Recorrido                                                    | Qué muestra                                                                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [Documentos](https://Jose-Vil.github.io/portfolio-software-demos/#documentos) | Carga el ejemplo, prueba OCR real, corrige y confirma campos | Procesamiento local con Tesseract y PDF.js, revisión humana, validación, prevención de folios duplicados   |
| [Mensajería](https://Jose-Vil.github.io/portfolio-software-demos/#mensajeria) | HOLA → datos ficticios → LISTO → CONFIRMADO                  | Máquina de estados, deduplicación, aislamiento de conversaciones, resolución de evidencias contradictorias |
| [Comercio](https://Jose-Vil.github.io/portfolio-software-demos/#comercio)     | Busca, agrega al carrito, crea un pedido y ajusta inventario | Validación transaccional en memoria, control de existencias y rechazo de escrituras con versión obsoleta   |
| [Interacción 3D](https://Jose-Vil.github.io/portfolio-software-demos/#movil)  | Mantén presionada la pelota, usa varios dedos o el teclado   | Física elástica, geometría y materiales procedurales, WebGL con alternativa Canvas                         |

## Alcance de esta edición pública

Todos los documentos, clientes, identificadores, productos y precios son ficticios. La demo usa memoria de la pestaña y se reinicia al recargar. Los archivos seleccionados se procesan en el navegador; no se envían a un backend. Los recursos OCR se sirven desde el mismo origen del sitio. No hay analítica ni fuentes externas.

El chat simula el transporte que, en una integración real, recibiría eventos de mensajería o de un marketplace como Mercado Libre. No se conecta a Meta, Mercado Libre ni Facturama; no envía mensajes, genera CFDI o realiza cobros. La interfaz móvil es una demostración web adaptable; este repositorio no distribuye una aplicación Android ni solicita permisos del dispositivo.

El sitio demuestra las reglas y la interacción. Las autorizaciones de usuarios, persistencia, concurrencia distribuida y transacciones de base de datos deben resolverse en un backend para uso productivo. El control de versiones del inventario aquí ocurre en memoria. El OCR puede equivocarse: cada registro requiere revisión humana.

## Ejecutar localmente

Requisitos: Node.js 24 y pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile
pnpm prepare:ocr
pnpm dev
```

Abre la URL que indique Vite, con la ruta `/portfolio-software-demos/`.

```sh
pnpm test
pnpm check:public
pnpm build
pnpm preview
```

Los modelos y motores OCR se generan en `public/ocr/` y no se incluyen en Git. La instalación respeta un listado explícito de scripts permitidos. El lockfile fija las dependencias.

## Estructura y decisiones

```text
src/demos/       Interfaces independientes, cargadas bajo demanda
src/core/        Reglas de negocio y lectura de documentos
src/components/ Física y renderizado 3D reutilizable
tests/          Casos de autorización, idempotencia, validación y concurrencia
scripts/        Preparación OCR y revisión del contenido público
docs/           Arquitectura, capturas y límites de la demo
```

Los motores de borradores/conversaciones y la escena 3D se adaptaron de módulos reutilizables de mis proyectos. La interfaz del portafolio y las demos de documentos/comercio se construyeron para esta edición pública. Se creó un historial nuevo y se excluyeron las configuraciones de producción, archivos operativos y recursos personales.

Consulta [la arquitectura](docs/ARCHITECTURE.md) y [la política de seguridad](SECURITY.md). El build verificado se publica en la rama `gh-pages` y GitHub Pages sirve esa edición estática. El código fuente está en `main`.

Se incluye un [ejemplo de GitHub Actions](docs/github-actions.example.yml) para automatizar verificaciones y despliegues en el futuro. Este ejemplo no se ejecuta mientras esté en `docs/`; su activación requiere configurar Pages para Actions y autorización para crear archivos de workflow. La publicación actual utiliza los permisos existentes de la cuenta.
