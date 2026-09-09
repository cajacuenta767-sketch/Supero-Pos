# OBSIDIANA — Plan Maestro de Rediseño del Frontend
### Sistema de diseño para Supero POS · Terminal de Punto de Venta

> **Versión:** 1.0 · **Alcance:** `frontend/` completo (23 vistas, 9.725 líneas)
> **Estado:** Propuesta ejecutable — lista para implementar por olas

---

## 0. La pregunta antes del pixel

**¿Qué problema real tienen millones de personas que nadie está resolviendo con elegancia?**

Un cajero de minimarket pasa **8 a 12 horas de pie**, frente a la misma pantalla, atendiendo una cola que
lo mira. No *lee* la interfaz: la **reconoce con la visión periférica** mientras sus ojos están en el
producto, en el cliente, en el billete. Toca la pantalla sin mirarla. Trabaja con las manos grasosas, con
luz de tubo fluorescente o a las 6 AM con el local a media luz.

Todo el software POS del mercado ignora esto. Se diseña como si fuera un **dashboard de oficina**:
tipografía de 10px, catorce colores compitiendo, tarjetas decorativas, densidad de ERP. Está optimizado
para la demo comercial, no para la hora número nueve del turno.

**La oportunidad de 1 en 1.000.000:**
> Un POS diseñado para **no ser mirado**. Donde la forma, la posición y el peso visual comunican antes
> que el texto. Donde el precio total es lo más grande de la pantalla porque es lo único que importa en
> ese segundo. Donde nada se mueve sin motivo y todo lo que se toca responde en menos de 100ms.

**Nicho:** retail físico de alta rotación (minimarket / bodega / electrónica) en LATAM.
**Ángulo ganador:** *"El primer POS que se opera con la memoria muscular, no con la vista."*
**Formato:** design system tokenizado + biblioteca de primitivas + migración por olas.
**Gancho de producto:** un turno completo sin buscar un solo botón.

---

## 1. Diagnóstico del código actual

Medido sobre el árbol real (`frontend/src`, 9.725 líneas):

| Síntoma | Medición | Consecuencia |
|---|---|---|
| Hex hardcodeados repetidos en JSX | **773** literales (`#1F2833`×381, `#0B0C10`×185, `#121212`×172) | Cambiar un color = 381 ediciones. Rediseño imposible. |
| Radios de esquina compitiendo | `rounded-xl`×252, `rounded-lg`×131, `rounded-2xl`×111, `rounded-3xl`×1 | No hay lenguaje de forma. Cada vista se ve de otro producto. |
| Micro-tipografía arbitraria | `text-[10px]`×78, `text-[11px]`×56, `text-[9px]`×8 | **Ilegible a 60cm bajo fluorescente.** Fatiga visual al final del turno. |
| Escala tipográfica | `text-xs`×305 domina toda la app | Jerarquía plana: el total de la venta pesa lo mismo que un SKU. |
| Números financieros | Fuente proporcional | Los dígitos "bailan" al actualizarse. Un `1` ocupa menos que un `8`. |
| Tema | `useThemeStore` sin persistencia; `index.html` fuerza `class="light"` | El cajero re-elige su tema en cada arranque de la terminal. |
| Duplicación de UI | Modal, botón, badge y tabla reescritos a mano en cada una de las 23 vistas | ~40% del JSX es repetición. |
| Foco / accesibilidad | Sin `:focus-visible` consistente, sin `prefers-reduced-motion` | Operación por teclado (F1–F12) invisible. |

**Veredicto:** el problema no es estético, es **arquitectónico**. No hay capa de diseño — hay 23 vistas
que reimplementan el mismo diseño 23 veces con ligeras diferencias. Cualquier rediseño hecho a mano se
degrada en dos sprints. Por eso el plan empieza por los **tokens**, no por las pantallas.

---

## 2. Principios de OBSIDIANA

Cinco reglas. Si una decisión viola una regla, la decisión está mal.

1. **La cifra manda.** En cualquier pantalla, el número que decide la acción es el elemento más grande.
   En el POS, el `TOTAL` no baja de 56px. Nunca.
2. **Un solo acento.** Azul `--accent` para lo interactivo. El color solo aparece cuando *significa algo*:
   verde = confirmado, ámbar = requiere atención, rojo = destructivo. Nada decorativo.
3. **Negro real, no gris.** El modo oscuro es `#000000` puro: en pantallas OLED de terminal apaga el
   píxel — menos fatiga a las 6 AM, y contraste absoluto para la visión periférica.
4. **El dedo antes que el cursor.** Objetivo táctil mínimo **44×44px** en POS, 36px en administración.
   Nada crítico bajo 44.
5. **Movimiento que informa.** 120–180ms, solo para explicar de dónde viene algo. Cero animación
   decorativa. `prefers-reduced-motion` respetado siempre.

---

## 3. Capa 1 — Tokens (la fundación)

**Archivos:** `src/styles/tokens.css` (nuevo) · `tailwind.config.js` (reescrito) · `src/index.css`

Se abandonan los hex en JSX. Todo pasa por variables CSS semánticas, redefinidas bajo `.dark`.
Un solo archivo controla la identidad completa del producto.

### 3.1 Color — semántico, no literal

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--bg-canvas` | `#F6F7F9` | `#000000` | Fondo de la aplicación |
| `--bg-surface` | `#FFFFFF` | `#0B0C10` | Paneles, sidebar, header |
| `--bg-raised` | `#FFFFFF` | `#121316` | Tarjetas, filas, inputs |
| `--bg-sunken` | `#EFF1F4` | `#08090B` | Pozos, tracks, áreas vacías |
| `--border-subtle` | `#E7E9EE` | `#1A1C22` | Separadores |
| `--border-strong` | `#D4D8E0` | `#282C36` | Bordes de control, foco en reposo |
| `--text-primary` | `#12141A` | `#F4F5F7` | Contenido principal |
| `--text-secondary` | `#5A6272` | `#A0A6B4` | Etiquetas, metadatos |
| `--text-tertiary` | `#8A92A3` | `#6B7280` | Placeholders, deshabilitado |
| `--accent` | `#0D5BF0` | `#3B82F6` | Acción primaria |
| `--accent-soft` | `#E8F0FE` | `#0F1E3D` | Fondo de estado activo |
| `--success` / `--warning` / `--danger` | `#0E9F6E` / `#D97706` / `#DC2626` | `#34D399` / `#FBBF24` / `#F87171` | Solo semántica de estado |

**Contraste garantizado:** todo par texto/fondo ≥ **4.5:1** (WCAG AA); cifras críticas ≥ **7:1** (AAA).

### 3.2 Forma — tres radios, no siete

`--r-sm: 8px` (badges, chips) · `--r-md: 12px` (botones, inputs, filas) · `--r-lg: 16px` (paneles, modales).
`rounded-full` solo para avatares e indicadores de estado. **Se eliminan `rounded-2xl` y `rounded-3xl`.**

### 3.3 Tipografía — una escala, cero arbitrariedad

Se elimina todo `text-[Npx]`. Escala fija:

| Token | Tamaño / Interlínea | Uso |
|---|---|---|
| `text-micro` | 11px / 16 — peso 600, `tracking-wide`, mayúsculas | Etiquetas de campo. **Piso absoluto.** |
| `text-body` | 13px / 18 | Metadatos, tablas densas |
| `text-base` | 15px / 22 | Contenido por defecto |
| `text-title` | 18px / 24 — peso 600 | Títulos de panel |
| `text-display` | 28px / 32 — peso 700 | KPIs de dashboard |
| `text-hero` | 56px / 56 — peso 700, `tabular-nums` | **TOTAL del POS** |

**Fuentes:** `Inter` (variable, con `system-ui` de respaldo) para interfaz · `JetBrains Mono` para SKU,
código de barras, IMEI y toda cifra monetaria. **`font-variant-numeric: tabular-nums` obligatorio en
dinero**: los dígitos dejan de saltar cuando el total se actualiza.

### 3.4 Espaciado, elevación, movimiento

- **Ritmo de 4px.** Espaciados permitidos: 4, 8, 12, 16, 24, 32, 48.
- **Elevación:** 3 niveles. `--e-1` fila hover · `--e-2` tarjeta/dropdown · `--e-3` modal.
  En dark, la elevación se expresa con **borde + fondo más claro**, no con sombra (la sombra no existe sobre negro).
- **Movimiento:** `--t-fast 120ms` (hover/press) · `--t-base 180ms` (paneles) · `--t-slow 280ms` (modales).
  Curva única: `cubic-bezier(0.2, 0, 0, 1)`.

---

## 4. Capa 2 — Primitivas (`src/ui/`)

Trece componentes eliminan ~40% del JSX repetido. Nada nuevo se escribe a mano después de esta capa.

| Componente | API esencial | Reemplaza |
|---|---|---|
| `Button` | `variant: primary\|secondary\|ghost\|danger` · `size: sm\|md\|lg\|pos` · `loading` · `icon` | ~90 botones ad-hoc |
| `IconButton` | `label` obligatorio (accesibilidad) · `tone` | ~30 botones de icono |
| `Card` | `title` · `action` · `padding` · `tone` | ~60 divs de tarjeta |
| `Input` / `Select` / `Textarea` | `label` · `hint` · `error` · `prefix` · `suffix` | ~80 campos |
| `Modal` | `size` · `title` · `footer` · foco atrapado · cierre con `Esc` | 7 modales duplicados |
| `Badge` | `tone: neutral\|accent\|success\|warning\|danger` · `size` | ~70 píldoras |
| `DataTable` | `columns` · `rows` · `empty` · `dense` · encabezado fijo | ~12 tablas manuales |
| `StatTile` | `label` · `value` · `delta` · `icon` · `tone` | KPIs del dashboard |
| `EmptyState` | `icon` · `title` · `hint` · `action` | ~15 estados vacíos |
| `Money` | `value` · `size` — `tabular-nums` + moneda + signo | Todo `.toFixed(2)` suelto |
| `Kbd` | `keys: ['F2']` | Píldoras de atajos |
| `Toast` | `useToast()` — cola, auto-descarte, live-region ARIA | *(no existe hoy)* |
| `Skeleton` | `variant: text\|row\|tile` | *(no existe hoy)* |

**Regla de oro post-migración:** si una vista importa `lucide-react` y escribe `className="bg-..."` para
un control, es un bug. Los colores viven en `src/ui/`.

---

## 5. Capa 3 — El armazón

### 5.1 Sidebar — de lista a riel

Hoy: 14 ítems con numeración `"1. Hogar (Dashboard)"`, 256px fijos, truncados.
Después:

- **Riel de 72px** por defecto: solo icono + indicador de activo. **Expande a 248px al hover** (180ms).
- Se elimina la numeración del rótulo — es ruido de especificación, no de producto. El orden ya la comunica.
- **Tres grupos separados:** `OPERACIÓN` (POS, Compras, Transferencias) · `CATÁLOGO` (Productos,
  Contactos, Stock) · `GESTIÓN` (Informes, Gastos, Cuentas, Usuarios, RRHH, Notificaciones, Ajustes).
- Barra de acento de 3px a la izquierda del ítem activo, en lugar del bloque azul sólido.
- Estado plegado/expandido persistido en `localStorage`.
- **Gana ~184px de ancho para el catálogo del POS** — la pantalla donde ese espacio vale dinero.

### 5.2 Header — barra de comando

- Búsqueda global centrada, `⌘K` / `F2`, con `Kbd` visible.
- **Cápsula de estado unificada:** sincronización + cola + reloj colapsados en un solo indicador que se
  expande al tocarlo. Hoy son cuatro islas compitiendo por atención.
- Estado `OFFLINE`: hoy `animate-pulse` (parpadeo ansioso). Se reemplaza por un **borde ámbar sólido
  permanente**. La ansiedad no es información; la persistencia sí.
- Sucursal y usuario agrupados a la derecha, tipografía secundaria.

### 5.3 Tema

- `useThemeStore` con persistencia en `localStorage` + respeto de `prefers-color-scheme` en el primer arranque.
- Script anti-parpadeo inline en `index.html` (aplica la clase antes del primer pintado).
- Se elimina `class="light"` hardcodeado en `<html>`.

---

## 6. Capa 4 — POS: la pantalla insignia

Es el 80% del tiempo de uso. Recibe el 80% del cuidado.

**Diagnóstico actual:** división 50/50 rígida, carrito con `text-xs`, total sin dominancia visual,
la píldora de atajos compite con la acción de cobro.

**Rediseño:**

1. **División 44 / 56** a favor del catálogo. El carrito necesita claridad, no ancho.
2. **Zona del total:** bloque fijo al pie del carrito, `text-hero` (56px, tabular). Sobre superficie
   `--bg-sunken` para separarlo del scroll. **Es el único elemento de 56px de toda la aplicación.**
3. **Botón COBRAR:** ancho completo, 64px de alto, verde `--success`, con `Kbd F8` embebido.
   Deshabilitado y visualmente apagado si el carrito está vacío o el turno cerrado.
4. **Filas del carrito:** altura 64px, nombre en `text-base`, controles `−` / `+` de 44×44px.
   Cantidad en mono tabular. Badges de tipo (`IMEI`, `Granel`, `Mayorista`) a la derecha, tamaño `sm`.
5. **Retroalimentación al escanear:** al añadir un ítem, la fila entra con un *flash* de acento de 180ms
   y la lista hace scroll hasta ella. El cajero **confirma con la periferia** que el escaneo entró —
   sin mirar la pantalla. *(Este es el detalle que define el producto.)*
6. **Grilla de catálogo:** tarjetas de 132px mínimo, imagen/inicial + nombre a 2 líneas + precio mono.
   Stock crítico marcado con borde ámbar, no con texto.
7. **Categorías:** chips horizontales con scroll, estado activo con `--accent-soft`.
8. **Modales críticos** (`ImeiModal`, `DecimalQuantityModal`): campo de entrada a `text-display`,
   teclado numérico táctil de 44px, `Enter` confirma, `Esc` cancela. Foco automático al abrir.

---

## 7. Ejecución — cinco olas

Cada ola es entregable, verificable y no rompe la anterior.

| Ola | Alcance | Archivos | Resultado observable |
|---|---|---|---|
| **1 — Fundación** | `tokens.css`, `tailwind.config.js`, `index.css`, fuentes, script anti-parpadeo, `useThemeStore` persistente | 5 | Tema conmuta y persiste. Cero regresión visual. |
| **2 — Primitivas** | Las 13 primitivas en `src/ui/` + `src/ui/index.ts` | 14 nuevos | Biblioteca lista, aún sin consumir. |
| **3 — Armazón** | `Sidebar`, `Header`, `App`, `LoginView` | 4 | La app **se ve** distinta al arrancar. |
| **4 — POS** | `PosView`, `CheckoutModal`, `ImeiModal`, `DecimalQuantityModal`, `CashShiftModal`, `CustomerModal`, `SupervisorPinModal` | 7 | La pantalla insignia, terminada. |
| **5 — Administración** | Las 16 vistas restantes, migradas a primitivas | 16 | Cero hex hardcodeado en todo `src/`. |

**Orden de la ola 5** (por frecuencia de uso): `DashboardView` → `ProductsView` → `SalesHistoryView` →
`PurchasesView` → `ContactsView` → `StockAdjustmentsView` → `FinanceView` → `ExpensesView` →
`TransfersView` → `UsersView` → `HrAttendanceView` → `NotificationsView` → `SettingsView`.

---

## 8. Criterios de aceptación

La ola no se cierra hasta que todo esto es cierto:

- [ ] `grep -r '\[#' src/` → **0 resultados** (fuera de `tokens.css`).
- [ ] `grep -r 'text-\[' src/` → **0 resultados**. Ningún texto por debajo de 11px.
- [ ] `npx tsc --noEmit` y `npm run lint` limpios.
- [ ] Todo par texto/fondo ≥ 4.5:1 en ambos temas; cifras críticas ≥ 7:1.
- [ ] Todo control del POS ≥ 44×44px.
- [ ] `:focus-visible` visible en el 100% de los interactivos, en ambos temas.
- [ ] `prefers-reduced-motion: reduce` desactiva toda transición no esencial.
- [ ] Flujo completo por teclado: login → turno → escaneo → IMEI → cobro → ticket, **sin ratón**.
- [ ] El tema sobrevive al reinicio de la terminal, sin parpadeo blanco al arrancar.
- [ ] Ninguna vista importa un color literal: todo pasa por `src/ui/` o por token.

---

## 9. Riesgos y cómo se neutralizan

| Riesgo | Mitigación |
|---|---|
| Regresión visual masiva al tokenizar | La ola 1 mapea los tokens a los hex **actuales**. El cambio estético llega en la ola 3, ya con red de seguridad. |
| 23 vistas migradas a mano = deriva | Las primitivas se congelan al final de la ola 2. Ninguna vista define estilo propio. |
| Pérdida de densidad de información en administración | `DataTable` con modo `dense`: 13px / filas de 36px, solo fuera del POS. |
| Peso de fuentes en terminal offline | Inter y JetBrains Mono **autoalojadas y subconjuntadas** (`latin` + `latin-ext`), `font-display: swap`. Sin CDN — la terminal opera sin red. |
| El scope crece | Cada ola se mide contra los criterios de la §8. Nada entra fuera de la lista. |

---

## 10. Qué cambia el día que esto está en producción

Hoy Supero POS **se ve como software**. Después se ve como **un instrumento**: negro absoluto, una sola
cifra dominante, un solo acento, cero ruido. Un cajero nuevo lo opera sin capacitación porque la
jerarquía visual ya le dijo dónde tocar. Un cajero veterano lo opera **sin mirarlo**.

Eso no es una mejora estética. Es la diferencia entre un producto que se tolera y uno que se defiende
frente a la competencia.

---

### Anexo — Mapa de archivos

```
frontend/src/
├── styles/
│   └── tokens.css              ← NUEVO · única fuente de verdad visual
├── ui/                         ← NUEVO · 13 primitivas + index.ts
│   ├── Button.tsx   IconButton.tsx  Card.tsx     Input.tsx
│   ├── Select.tsx   Modal.tsx       Badge.tsx    DataTable.tsx
│   ├── StatTile.tsx EmptyState.tsx  Money.tsx    Kbd.tsx
│   ├── Toast.tsx    Skeleton.tsx    index.ts
├── components/                 ← 23 vistas migradas (olas 3-5)
├── store/useThemeStore.ts      ← persistencia + prefers-color-scheme
├── index.css                   ← importa tokens, base, fuentes
└── ../tailwind.config.js       ← escala + tokens semánticos
```

---

## 11. Entrega 8 — Evidencia fotográfica, escaneo y validación de códigos

Las entregas 1–7 dejaron los quince apartados migrados y responsive. Esta cierra otra cosa: los
**campos latentes**. `image_url` en productos y `receipt_attached` en gastos existían en el modelo y
no guardaban nada — un booleano que decía «hay comprobante» sin comprobante detrás. El patrón se
repetía en el arqueo, en las mermas y en la recepción de mercadería.

### Piezas nuevas en `src/ui/`

| Pieza | Qué resuelve |
|---|---|
| `PhotoThumb` | Miniatura ampliable de una foto justificante. En una celda de tabla una foto es ilegible: sirve para saber que existe; al pulsarla se abre a tamaño completo, que es cuando se audita |
| `SignaturePad` | Lienzo de firma por eventos de puntero — dedo, ratón y lápiz sin ramas por dispositivo. Dibuja a la densidad real de la pantalla y exporta PNG transparente, para que la tinta no dependa del tema en que se firmó |
| `ScanField` | Campo de texto con visor de cámara. El botón solo aparece si el navegador admite `BarcodeDetector`: donde no funciona, no hay botón muerto |

Y `src/utils/imei.ts`, con el dígito de control por Luhn.

### Qué cambia en cada apartado

| Apartado | Antes | Ahora |
|---|---|---|
| **Productos** | «Auto» generaba `'777' + 9 dígitos` = **12 dígitos**, un EAN-13 que ningún lector acepta | 12 dígitos de datos + su dígito de control, con validación en vivo y previsualización del código real bajo el campo |
| **Gastos** | `receipt_attached: !!refNumber` | Foto del comprobante, reducida en el navegador antes de guardar, y miniatura ampliable en la columna Comprobante |
| **Turno de caja** | Arqueo ciego que no se comparaba con nada | Dos pasos: se cuenta y se fotografía el efectivo; solo entonces se revela el desglose esperado y el descuadre. La cifra contada queda bloqueada al revelar — si se pudiera retocar, dejaría de ser ciego |
| **Ajuste de stock** | Merma justificada solo con texto | Foto del producto o del estante, visible en el detalle del ajuste |
| **Compras** | Un campo de texto suelto para los IMEI | Escaneo por lote con cámara o pistola, contador «n de N», IMEI validado por Luhn, chips retirables y recepción bloqueada hasta cuadrar |
| **Cobro** | — | Conforme de entrega firmado, obligatorio en ventas a empresa desde 500 Bs. Se guarda en `block_a.customer_signature` |
| **IMEI (POS)** | Longitud mínima de 5 caracteres | Validación por Luhn cuando son 15 dígitos; otras series de fábrica se aceptan tal cual, porque no todo producto serializado es un teléfono |

### Tres fallos reales que salieron al probarlo

No estaban en la lista: aparecieron al usar la aplicación, y ninguno era visible con `grep`.

1. **`Modal` perdía el foco en cada tecla.** Su efecto de foco atrapado dependía de `onClose`, que casi
   siempre llega como función anónima y cambia de identidad en cada render del padre. Teclear una
   letra desmontaba el efecto: devolvía el foco al elemento que abrió el modal y luego lo llevaba al
   botón «Cerrar». En la recepción de compras, la segunda tecla ya no llegaba al campo y el `Enter`
   activaba el botón de la fila de debajo. Afectaba a **todos** los formularios en modal.
   Ahora `onClose` pasa por una referencia y el efecto depende solo de si el modal está abierto.
2. **El foco inicial iba al botón «Cerrar».** Casi todos estos modales son formularios; aterrizar en
   «Cerrar» obliga a tabular antes de escribir, y anulaba los `autoFocus` de los campos. Ahora va al
   primer campo, y al primer elemento solo si no hay ninguno.
3. **Clave de React duplicada en el carrito.** Un producto serializado genera una línea por número de
   serie, todas con el mismo `id`, y la lista usaba `key={item.id}`. La identidad de la línea es el
   par id + serie, igual que en el store.

Queda anotado, sin tocar: `updateQuantity`, `updateItemSerial` y `removeItem` del carrito operan solo
por `id`, así que con dos líneas del mismo producto serializado actúan sobre las dos a la vez. Es
lógica de store y está fuera del alcance de este plan.

### Un desbordamiento que solo se vio mirando

Al añadir la miniatura, Gastos empezó a desbordar horizontalmente **la página entera** entre 768 y
1280px. La tabla estaba bien contenida —su envoltorio recortaba— y ningún elemento sin recortar
sobresalía. El culpable era un `<span class="sr-only">` dentro de la miniatura vacía: `sr-only` es
`position: absolute`, y dentro de una tabla más ancha que su contenedor se posiciona contra el bloque
raíz y alarga el scroll del documento. El rótulo pasó a `aria-label`.

Es el mismo tipo de fallo que el responsive del principio: invisible a `grep`, invisible a `tsc`, y
solo detectable ejecutando y midiendo.

### Verificación

`tsc --noEmit`, `lint`, `format:check` y `build` limpios · 112 comprobaciones (14 apartados × 4
anchos × 2 temas) sin desbordamiento ni errores de consola · flujos nuevos recorridos uno a uno en
1440px y 390px · los dígitos de control de EAN-13 e IMEI contrastados con códigos publicados.
