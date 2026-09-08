# El Mate del 10 — Web V1

Primera versión funcional del catálogo de El Mate del 10.

## Incluye

- Home de marca
- Catálogo conectado a Supabase
- Filtros por categoría
- Secciones "Titulares" y "Recién convocados"
- Stock Disponible / Último / Agotado
- "Mi Pedido" persistente en el navegador
- Envío del pedido a WhatsApp
- Panel privado `/admin`
- Login con Supabase Auth
- Alta/edición de productos
- Carga de foto principal a Supabase Storage
- Cambios rápidos de stock

## Variables de entorno

Crear estas variables en Cloudflare Pages:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_WHATSAPP_NUMBER`
- `VITE_INSTAGRAM_URL`

No subir secretos ni `.env` a GitHub.

## Cloudflare Pages

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`

## Pendientes para la siguiente iteración

- Registrar pedidos y analytics en Supabase
- Ficha individual de producto
- Características "La Ficha del 10"
- Dashboard de pedidos/ventas/estadísticas
- Logo oficial como asset
- Ajuste fino de identidad visual a partir de piezas oficiales
deploy refresh 1
