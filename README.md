# Marvel Watchlist

Checklist de películas y series de Marvel con una sección «Camino a Doomsday», imágenes de cómics y progreso guardado en el navegador. Funciona como sitio estático y como aplicación instalable. No necesita cuentas, base de datos ni variables de entorno.

## Publicar en GitHub y Vercel

1. Sube los archivos de este proyecto a un repositorio de GitHub. La carpeta `dist/` debe permanecer en el repositorio.
2. Importa ese repositorio en Vercel. Selecciona **Other** como framework y deja vacío el comando de compilación. `vercel.json` indica que Vercel debe servir `dist/`.
3. Publica el proyecto. El sitio estará en la raíz del dominio; `#doomsday` abre directamente la sección verde.

También puedes servir `dist/` con cualquier alojamiento estático. Para verlo localmente, abre `dist/index.html` o inicia un servidor local desde `dist/`.

## Datos y copias de seguridad

- Los checks se guardan en `localStorage` del navegador y dominio actual. Al cambiar de dominio, usa **Exportar progreso** e **Importar progreso** para trasladarlos.
- Los archivos de progreso antiguos se migran a identificadores estables para que agregar títulos no desplace checks existentes.
- La descarga `dist/marvel-watchlist-offline.zip` contiene una copia que funciona sin conexión. Descomprímela y abre `index.html`.
- El contador usa la fecha de estreno del **18 de diciembre de 2026** anunciada por [Disney](https://movies.disney.com/avengers-doomsday). Muestra días de calendario según la fecha local del dispositivo.
- La selección «Camino a Doomsday» sigue la [guía de Disney+](https://www.disneyplus.com/explore/articles/countdown-to-avengers-doomsday).

## Recursos gráficos

Las imágenes y personajes de Marvel pertenecen a sus titulares. Los enlaces de origen y créditos aparecen en la app. Este proyecto no es oficial de Marvel ni Disney. Antes de publicar una copia pública del repositorio o la app, revisa los permisos necesarios para redistribuir las imágenes incluidas.
