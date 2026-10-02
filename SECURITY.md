# Seguridad de la demo

El código de este portafolio y sus demos locales no contiene credenciales, certificados, datos de clientes, configuraciones de producción ni historial de repositorios operativos. No se debe incorporar información sensible para probar las demos. La sección Comercio integra el sitio público real de JRS Automation desde su dominio; ese servicio conserva sus propias políticas y operaciones.

Los archivos que el visitante seleccione se procesan en su navegador. La aplicación no implementa subida a un servidor. El alojamiento sí recibe las solicitudes normales de recursos estáticos; consulta la política de privacidad de GitHub para ese servicio.

La escena del universo guarda únicamente el estado de sus coleccionables en localStorage, con claves propias del portafolio. No incluye los recuerdos, archivos personales ni pistas de audio del proyecto original.

Antes de publicar cambios:

1. Ejecutar `pnpm test`, `pnpm check:public` y `pnpm build`.
2. Revisar `git diff --cached` para detectar datos y recursos que no deberían compartirse.
3. Ejecutar Gitleaks sobre el directorio y el historial. El chequeo de patrones incluido es complementario, no una auditoría completa.
4. Conservar las integraciones de proveedores, variables de entorno, sellos digitales y certificados fuera de este repositorio.

Si encuentras una credencial, evita reproducirla en una issue pública. Utiliza el reporte privado de vulnerabilidades del repositorio cuando esté disponible. Una credencial expuesta debe revocarse o rotarse en su proveedor, además de retirar el contenido publicado.
