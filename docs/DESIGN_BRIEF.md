# Brief de diseño — Copiloto Fuxion
### Dirección mínima para que Fable 5 no construya con estilos por defecto. El diseño pulido es un paso posterior con Claude Design.

## Cómo usar este documento

Esto NO es un mockup ni un diseño final. Es lo mínimo para que la Fase A-C se vea coherente y no
como un scaffold genérico de Tailwind sin pensar. El objetivo de esta etapa es "funciona y se ve
intencional", no "se ve terminado".

## Paleta de marca (ya usada en los documentos PDF entregados)

```
Púrpura oscuro   #241033   — fondos, headers
Púrpura          #4a1d6e   — elementos primarios, botones
Púrpura medio    #6b2f8f   — acentos secundarios
Magenta          #c92a7a   — acciones destacadas, alertas positivas
Magenta claro    #e8478f   — hover states, highlights
Oro/Amarillo     #f0b429   — datos clave, cifras destacadas (usar con moderación)
Crema            #faf6f0   — fondo claro alternativo (si se usa tema claro)
Lila claro       #f1e9f7   — fondos de tarjeta sobre blanco
```

Tipografía: sans-serif estándar del sistema o Helvetica/Inter — sin necesidad de fuente custom en
esta etapa.

## Referencia de la competencia interna (Fuxion Avatar) — para diferenciarse, no copiar

Fuxion Avatar (la app interna de Fuxion) usa: fondo oscuro casi negro, barra superior con
degradado púrpura-azul, tarjetas de video en lista con miniatura + badge de categoría (ej.
"Promover", "Educa", "Demuestra"), temporizador visible en la esquina superior. Es un estilo
oscuro, tipo "estudio de producción".

**Decisión de dirección:** el Copiloto Fuxion puede compartir la familia de color púrpura/magenta
(coherencia de marca Fuxion, y ya está en los documentos que Alejandro le mostró a su madre), pero
NO debe verse como un clon de Fuxion Avatar. Diferénciate con:
- Tema más claro/neutro en las pantallas de trabajo diario (generador de objeciones, CRM) — es una
  herramienta de productividad de uso frecuente, no una app de producción de video ocasional.
  Reservar el fondo oscuro dramático para el dashboard admin ("El Cerebro"), donde sí tiene sentido
  una estética más "centro de control".
- Sin barra de temporizador ni lenguaje de "producción de contenido" (eso es el terreno de Fuxion
  Avatar). El lenguaje de este producto es de venta y seguimiento, no de creación audiovisual.

## Tono de contenido/copy

- Directo, sin jerga corporativa. El usuario final es un distribuidor ocupado, no un early adopter
  técnico.
- Nunca usar lenguaje que suene a promesa de ingresos o resultado garantizado (alineado con el
  Skill de cumplimiento) — ni siquiera en microcopy o mensajes de error/éxito.
- Mensajes de error y estados vacíos deben ser específicos y humanos ("Todavía no tienes
  prospectos guardados — agrega el primero" en vez de "No data available").

## Componentes base a construir en Fase A (feo está bien, inconsistente no)

- Botón primario / secundario
- Tarjeta (card) para listas (objeciones, prospectos)
- Badge de estado (caliente/tibio/frío — usar color, no solo texto, para lectura rápida)
- Input de texto simple + selector (dropdown) — reutilizado en el formulario de objeciones
- Layout de dashboard con navegación (lateral o inferior, decidir en Fase A y mantenerlo
  consistente en todas las pantallas siguientes)

## Qué se deja explícitamente para después (Claude Design / fase visual pulida)

- Dashboard admin 3D/interactivo tipo "red neuronal" (Idea 5 del documento de funcionalidades).
- Landing page de los cursos — se construye por separado, no es parte de este roadmap de app.
- Ilustraciones, iconografía custom, animaciones de transición.
- Cualquier ajuste de espaciado/tipografía fino — la Fase A-C prioriza que cada pantalla del PRD
  exista y funcione, no que esté pixel-perfect.
