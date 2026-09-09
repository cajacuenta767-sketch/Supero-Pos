# Registro de Nuevos Requerimientos y Especificaciones - Supero POS

Este archivo contiene el registro detallado y secuencial de todas las nuevas instrucciones, desgloses técnicos y blueprints enviados por el usuario. 

Las especificaciones registradas aquí se mantendrán almacenadas minuciosamente y solo se ejecutarán en el código cuando el usuario dé la orden explícita de ejecuciones.

---

## Fase 2: Core de Seguridad y Catálogo Maestro

### Paso 2.1: Conceptualización del Esquema Relacional y Migraciones (Prisma ORM)

Con la infraestructura base y los entornos listos conceptualmente, el siguiente paso se enfoca en diseñar el modelo de datos relacional que sostendrá la seguridad, los perfiles de usuario y el catálogo maestro de productos en el servidor central (PostgreSQL), utilizando un ORM para la gestión estructurada de los esquemas.

#### 1. Conceptualización de la Capa de Identidad y Permisos (Tablas Base)
* **Entidad de Roles (`roles`)**:
  * Se diseña una tabla maestra estática encargada de definir los perfiles operativos del sistema. Los registros conceptuales obligatorios corresponden a los roles de `ADMIN` (administrador con privilegios globales), `CAJERO` (operador exclusivo del punto de venta) y `ALMACENERO` (responsable de compras, kardex e inventario).
* **Entidad de Usuarios (`users`)**:
  * Define la estructura para almacenar la información de los operadores del sistema. Cada usuario se vincula de manera obligatoria a un rol específico, almacena un nombre de usuario único, el hash criptográfico seguro de su contraseña (generado por Argon2id) y un indicador booleano de estado para habilitar o revocar accesos de forma inmediata sin eliminar el historial de transacciones.

#### 2. Conceptualización del Catálogo Maestro y Tipos de Unidades
* **Entidad de Productos (`products`)**:
  * Representa la columna vertebral comercial del negocio. Cada producto conceptualizado en esta tabla almacena sus identificadores clave (SKU alfanumérico único y código de barras corporativo para lectura láser rápida) y su denominación comercial.
* **Clasificación Operativa por Tipos de Unidades (`unit_type`)**:
  * El diseño relacional incorpora una regla estricta que determina cómo el sistema interpretará el comportamiento del artículo en el mostrador:
    * *Unidades Enteras (`UNIT`)*: Configura el producto para admitir exclusivamente cantidades discretas enteras, restringiendo el uso de decimales.
    * *Unidades Fraccionadas (`FRACTION`)*: Configura el producto para aceptar valores decimales de alta precisión, orientado a artículos a granel o medidos.
    * *Unidades Serializadas (`SERIALIZED`)*: Diseñado para el segmento de electrónica, indica al sistema que el producto exige la captura obligatoria de un número de serie único o IMEI tanto en la recepción de compras como en la emisión de ventas en el POS.
* **Estructura de Precios Duales y Costos**:
  * La estructura almacena de forma independiente el costo ponderado de adquisición, el precio minorista regular de venta al público y un precio especial para ventas por volumen o mayoristas, asegurando que el POS aplique la tarifa correcta de manera automatizada.

#### 3. Estrategia de Migraciones Estrictas y Control de Cambios en la Base de Datos
* **Evolución Controlada del Esquema**:
  * Se conceptualiza que cualquier modificación futura en la estructura de las tablas (como la adición de nuevos campos o tablas auxiliares) no debe realizarse de forma manual ni directa sobre la base de datos en producción.
* **Historial Versionado**:
  * El sistema de migraciones actúa como un libro de bitácora secuencial y ordenado. Cada cambio de estructura se redacta como un archivo de migración versionado que se ejecuta de manera idéntica y controlada tanto en el entorno de desarrollo como en el servidor central de producción, garantizando que la base de datos siempre mantenga una integridad absoluta y predecible.

---

### Paso 2.2: Conceptualización del Módulo de Autenticación, Hashing Argon2id y Control de Acceso (RBAC)

Continuando con la Fase 2, este paso se enfoca en diseñar la capa de seguridad que blindará el acceso al servidor central, garantizando que solo los usuarios autorizados puedan interactuar con la API del sistema POS y ERP.

#### 1. Protocolo de Derivación y Hashing de Contraseñas (Argon2id)
* **Protección contra Filtraciones**:
  * Se establece que las credenciales de los operadores nunca se almacenan como texto plano en la base de datos central.
* **Algoritmo de Alta Seguridad**:
  * El sistema conceptualiza el uso de Argon2id (reconocido como el estándar moderno de la industria para derivación de claves). Este algoritmo combina resistencia contra ataques por fuerza bruta, tablas arcoíris y procesamiento paralelo mediante GPU, aplicando un factor de sal (*salt*) aleatorio único para cada usuario antes de generar el hash definitivo que se guardará en PostgreSQL.

#### 2. Estructura y Carga Útil del Token de Sesión (JWT)
* **Emisión de Credenciales Digitales**:
  * Tras validar exitosamente las credenciales de acceso, el servidor central emite un token de sesión firmado criptográficamente.
* **Contenido Mínimo y Seguro (Payload)**:
  * El diseño conceptual de este token encapsula exclusivamente los atributos estrictamente necesarios para la operación diaria:
    * Identificador único del usuario.
    * Rol operativo asignado (`ADMIN`, `CAJERO`, `ALMACENERO`).
    * Identificador de la sucursal o almacén autorizado.
    * Marca de tiempo de expiración para caducar automáticamente la sesión tras un periodo de inactividad o al finalizar la jornada.

#### 3. Filtros de Intercepción y Validación de Permisos (Guards RBAC)
* **Control de Acceso Basado en Roles (Role-Based Access Control)**:
  * Cada petición HTTP que llega al servidor central pasa obligatoriamente por un filtro de seguridad (*guard*). Este interceptor verifica la autenticidad y vigencia del token de sesión.
* **Restricción de Recursos**:
  * El filtro cruza el rol contenido en el token con los privilegios requeridos por el endpoint solicitado. Si un operador con rol de cajero intenta acceder a rutas administrativas o de configuración gerencial, el sistema bloquea la petición de forma inmediata y emite un código de respuesta estandarizado de acceso denegado, protegiendo la integridad del sistema.

---

### Paso 2.3: Conceptualización del CRUD de Productos y Gestión de Precios Duales

Avanzando en la Fase 2, este paso se enfoca en diseñar la lógica operativa y de validación para la administración del catálogo maestro de productos en el servidor central, asegurando la consistencia comercial y de precios antes de que lleguen a las terminales del punto de venta.

#### 1. Operaciones del Catálogo Maestro (CRUD Centralizado)
* **Creación y Registro Estricto**:
  * Se conceptualiza un flujo donde cada alta de producto exige obligatoriamente los identificadores comerciales únicos (SKU alfanumérico y código de barras), la denominación del artículo, la categoría y la tipificación de unidad (`UNIT`, `FRACTION`, `SERIALIZED`).
* **Actualización Controlada**:
  * La modificación de atributos comerciales (como nombres o descripciones) se realiza de forma centralizada. Cualquier cambio se propaga de manera segura hacia las terminales durante sus procesos de sincronización de catálogos.
* **Baja Lógica (*Soft Delete*) en lugar de Eliminación Física**:
  * El sistema conceptualiza que un producto nunca debe ser borrado físicamente de la base de datos central si ya posee historial de transacciones, ventas o movimientos en el Kardex. En su lugar, se desactiva mediante un indicador de estado, impidiendo su venta futura pero preservando la integridad de los reportes históricos.

#### 2. Lógica de Precios Duales y Márgenes Comerciales
* **Estructura de Tarifas Múltiples**:
  * El diseño conceptual separa de manera independiente tres valores financieros fundamentales por cada producto:
    * *Costo Ponderado*: El valor de adquisición real calculado por el Kardex.
    * *Precio Minorista (`retail_price`)*: La tarifa estándar aplicada al público general en el mostrador del POS.
    * *Precio Mayorista (`wholesale_price`)*: La tarifa especial diferencial aplicada automáticamente cuando la venta cumple con las reglas de volumen por cantidad establecida.
* **Validación de Rentabilidad**:
  * El sistema establece reglas lógicas preventivas que alertan al administrador si se intenta registrar un precio de venta menor al costo ponderado de adquisición, evitando pérdidas operativas involuntarias.

#### 3. Integridad de Identificadores (SKU y Códigos de Barras)
* **Restricción de Unicidad**:
  * Se establece una regla estricta a nivel de base de datos que prohíbe la duplicidad de códigos de barras o SKUs. Esto es crítico para evitar confusiones en la pistola láser del cajero al momento de escanear artículos de alta rotación en el mostrador.

---

## Fase 4: Motor de Inventarios, Kardex y Cadena de Suministro

### Paso 4.1: Especificación de Alta Definición - Motor de Kardex y Costo Promedio Ponderado (CPP - Profundizado)

Especificación lógica y técnica detallada para implementar el motor de inventarios con rigor contable, transaccional y sin errores de redondeo.

#### 1. Reglas de Concurrencia y Aislamiento Transaccional en Base de Datos
* **Prevención de Condiciones de Carrera (Race Conditions)**:
  * Cuando se procesa una compra masiva o una venta simultánea, dos procesos podrían intentar modificar el stock y el costo del mismo producto al mismo tiempo. El backend debe ejecutar estas operaciones bajo un nivel de aislamiento estricto (Serializable o mediante bloqueos explícitos de fila con `SELECT FOR UPDATE`), asegurando que el cálculo del stock y del costo no sufra discrepancias por escrituras simultáneas.

#### 2. Algoritmo y Precisión Matemática del Costo Promedio Ponderado (CPP)
* **Fórmula Operativa**:
  $$\text{Nuevo CPP} = \frac{(\text{Stock Actual} \times \text{CPP Actual}) + (\text{Cantidad Comprada} \times \text{Costo Compra})}{\text{Stock Actual} + \text{Cantidad Comprada}}$$
* **Manejo de Precisión Decimal**:
  * Los costos unitarios y ponderados deben calcularse y almacenarse obligatoriamente con una precisión mínima de cuatro decimales en la base de datos central (`DECIMAL(12,4)`) para evitar la pérdida acumulativa de centavos en inventarios de alto volumen. Los precios de venta al público se redondean estrictamente a dos decimales.
* **Gestión de Stock en Cero o Negativo**:
  * Si el stock actual de un producto llega a cero y se registra una nueva compra, el sistema debe descartar el costo histórico anterior y asignar de manera directa el nuevo costo de adquisición como el CPP vigente, evitando divisiones por cero o arrastres de costos obsoletos.

#### 3. Estructura de Auditoría Inalterable en el Kardex
Cada movimiento de inventario (tanto entradas como salidas) debe generar un registro de solo lectura en la tabla del Kardex que contenga obligatoriamente:
* Identificador del producto y del almacén/sucursal.
* Tipo de movimiento estricto (`PURCHASE_RECEIPT`, `POS_SALE`, `MANUAL_ADJUSTMENT`, `TRANSFER_OUT`, `TRANSFER_IN`, `DAMAGE_LOSS`).
* Cantidad operada (con signo positivo para entradas y negativo para salidas).
* Costo unitario histórico en el instante exacto de la ejecución.
* Stock resultante exacto después de aplicar la transacción, garantizando trazabilidad forense ante cualquier auditoría física.

---

### Paso 4.2: Módulo de Compras (SRM) y Recepción con Control de IMEI

Especificación técnica para el ciclo de aprovisionamiento de mercadería y control de la cadena de suministro, adaptada para su desarrollo directo.

#### 1. Ciclo de Vida de las Órdenes de Compra
* **Estados del Documento**:
  * `DRAFT`: Borrador inicial generado por administración.
  * `PENDING_APPROVAL`: Enviado para validación gerencial.
  * `APPROVED`: Autorizado, a la espera de despacho por parte del proveedor.
  * `PARTIALLY_RECEIVED`: El proveedor entregó una parte de la mercancía acordada.
  * `COMPLETED`: Recepción total finalizada e impactada en el Kardex.
  * `CANCELLED`: Anulado por incidencias con el proveedor.

#### 2. Recepción de Facturas y Actualización Masiva
* **Contraste Físico vs. Digital**: El almacenero verifica la factura física del proveedor contra la orden de compra aprobada en la interfaz. El sistema permite registrar recepciones parciales: calcula automáticamente qué porcentaje del pedido ingresa y deja el saldo restante pendiente en el sistema sin alterar el stock ni generar costos parciales erróneos hasta que se complete la recepción.
* **Impacto Automático**: Al confirmar la recepción total o parcial, el sistema dispara de forma síncrona el cálculo del nuevo Costo Promedio Ponderado (CPP) y genera las entradas correspondientes en el Kardex.

#### 3. Asistente de Ingreso Obligatorio para Productos Serializados (Electrónica / IMEIs)
* **Bloqueo Operativo de Recepción**: Si la orden de compra contiene artículos tipificados como `SERIALIZED`, la interfaz de recepción de almacén activa un flujo obligatorio de escaneo unitario.
* **Validación de Unicidad**: Por cada unidad recibida, el operario debe capturar el número de serie o IMEI. El backend realiza una validación inmediata en la base de datos central para garantizar que ese identificador no se encuentre registrado previamente en el sistema (evitando duplicidades).
* **Asignación de Estado**: Los números de serie ingresados se almacenan en una tabla dedicada vinculada al producto y a la factura de compra, asignándoles de manera automática el estado operativo `IN_STOCK` (disponibles para ser vendidos en el POS).

---

### Paso 4.3: Control de Mermas, Ajustes Extraordinarios y Auditoría Forense (`audit_logs`)

Este módulo rige cualquier modificación manual de existencias que no provenga de una venta del POS o de una compra corporativa.

#### 1. Clasificación Obligatoria de Desviaciones de Stock
Cualquier ajuste manual de inventario exige la selección estricta de una causa tipificada para evitar usos arbitrarios:
* `DAMAGED`: Artículos rotos o inutilizados por accidentes operativos.
* `EXPIRED`: Perecederos que superaron su fecha límite de comercialización.
* `INTERNAL_USE`: Retiros autorizados para consumo o pruebas operativas internas.
* `CYCLE_COUNT_DISCREPANCY`: Diferencias detectadas durante un conteo físico o inventario cíclico de estantería.

#### 2. Bitácora de Auditoría Inalterable (`audit_logs`)
Cada ajuste manual de inventario, cambio excepcional de precios o anulación de documentos genera un registro estructurado de solo lectura en la tabla de auditoría. Estructura de datos obligatoria para el backend:
* Identificador del operador responsable (`user_id`).
* Identificador de la sucursal o almacén (`warehouse_id`).
* Marca de tiempo exacta de la ejecución (`created_at`).
* Objeto de estado que almacene el *snapshot* "antes" y "después" de la modificación en formato JSONB (ej. stock anterior, stock resultante y la diferencia exacta).
* Justificación textual obligatoria introducida por el usuario.

---

### Paso 4.4: Gestión Financiera de Caja y Egresos Operativos Menores (Caja Chica)

Este módulo controla los flujos de efectivo dentro del turno del cajero, asegurando que cualquier salida menor de dinero esté documentada y no altere los arqueos de cierre.

#### 1. Ciclo de Vida del Turno de Caja
* Ningún cajero puede operar el POS sin una sesión de caja abierta.
* **Declaración de Fondo Inicial**: El sistema exige ingresar el monto exacto de efectivo disponible en la gaveta al encender el turno, estableciendo la base financiera inicial indispensable para el cálculo del arqueo posterior.

#### 2. Registro de Salidas de Efectivo Menores (Caja Chica)
* Durante el turno, la gaveta permite registrar retiros menores autorizados para cubrir urgencias operativas (ej. compra de suministros de limpieza, fletes de envío rápido o viáticos menores).
* **Reglas de Validación**:
  * Exige la introducción de un PIN de autorización gerencial o de supervisor.
  * Selección obligatoria de la categoría del gasto.
  * Captura obligatoria del número de comprobante o recibo físico respaldatorio.

#### 3. Impacto Automático en el Arqueo de Cierre Ciego
* El sistema calcula el efectivo teórico esperado en la gaveta mediante la siguiente fórmula lógica:
  $$\text{Efectivo Teórico Esperado} = \text{Fondo Inicial} + \text{Ventas en Efectivo} - \text{Egresos de Caja Chica}$$
* Este valor se contrasta de forma ciega contra el conteo físico real ingresado por el cajero al finalizar el turno, generando el reporte exacto de sobrantes o faltantes.

---

## Módulo 1: "Hogar" (Dashboard Principal)

Especificación completa de la interfaz gráfica, distribución de componentes, lógica visual y widgets analíticos del Dashboard Principal.

### 1. Barra de Encabezado y Bienvenida (Top Bar del Dashboard)
* **Saludo Personalizado**:
  * Texto destacado con tipografía grande: "Bienvenido [Nombre del Administrador o Cajero], 👋".
  * Subtítulo informativo: Fecha actual del sistema, turno en curso y nombre de la sucursal activa.
* **Controles Rápidos del Encabezado**:
  * Selector desplegable de Sucursal / Almacén para alternar la visualización de métricas (Consolidado Global o Sucursal Específica).
  * Selector de Rango Temporal para los datos (Hoy, Últimos 7 días, Últimos 30 días, Mes actual, Rango personalizado).
  * Indicador de estado de sincronización en tiempo real (Icono de red con estado conectado/desconectado).
  * Botón de refresco manual de métricas.

### 2. Cuadrícula de Tarjetas Métricas Superiores (KPIs Financieros)
Diseño de fila de 4 tarjetas rectangulares con esquinas redondeadas, fondo blanco, sombra suave y borde sutil:
* **Tarjeta 1: Ventas Totales**
  * Icono: Carrito de compras enmarcado en contenedor circular celeste claro.
  * Etiqueta superior: "Ventas totales".
  * Valor principal: Monto monetario formateado en tipografía grande y negrita (Ejemplo: $864.00).
  * Indicador inferior: Porcentaje de incremento o decremento respecto al periodo anterior con flecha de tendencia (Verde si subió, Rojo si bajó).
* **Tarjeta 2: Margen Neto (Utilidad Real)**
  * Icono: Billetera / Monedas en contenedor circular verde esmeralda suave.
  * Etiqueta superior: "Neto" con icono de información (*Tooltip*: "Ganancia bruta menos el Costo Promedio Ponderado de la mercadería vendida").
  * Valor principal: Monto monetario neto en tipografía grande y negrita (Ejemplo: $864.00).
  * Indicador inferior: Margen de rentabilidad porcentual sobre las ventas (Ejemplo: 32.5% de margen).
* **Tarjeta 3: Compra Total**
  * Icono: Flecha de descarga / Entrada en contenedor circular azul rey suave.
  * Etiqueta superior: "Compra total".
  * Valor principal: Monto acumulado de compras a proveedores recibidas en el periodo (Ejemplo: $0.00).
  * Indicador inferior: Cantidad de órdenes de compra procesadas e ingresadas al almacén.
* **Tarjeta 4: Compra Pendiente (Compromisos por Recibir)**
  * Icono: Triángulo de advertencia en contenedor circular ámbar/naranja.
  * Etiqueta superior: "Compra pendiente".
  * Valor principal: Monto valorizado de órdenes de compra emitidas pero pendientes de recepción física en almacén (Ejemplo: $0.00).
  * Indicador inferior: Número de pedidos pendientes con alerta visual si existen entregas con retraso.

### 3. Módulo Central: Gráfica de Tendencia de Ventas (30 Días)
Contenedor principal amplio ubicado debajo de las tarjetas métricas:
* **Cabecera de la Gráfica**:
  * Icono identificador de calendario/tendencia.
  * Título: "Ventas de los últimos 30 días".
  * Botones de alternancia de vista: Gráfico de Línea con Área sombreada o Gráfico de Barras verticales.
  * Filtro rápido: Ver por Monto monetario total ($) o por Cantidad de tickets emitidos.
* **Comportamiento de los Ejes**:
  * Eje Vertical (Y): Escala de ingresos monetarios con incrementos proporcionales legibles (0k, 2k, 4k, 6k, 8k, 10k).
  * Eje Horizontal (X): Marcadores cronológicos correspondientes a los días del mes (del 1 al 30).
* **Interactividad y Tooltips**:
  * Línea de tendencia en azul corporativo con degradado suave hacia transparente en la base.
  * Tooltip flotante al deslizar el cursor: Fecha exacta, Total facturado en esa jornada, Número de ventas realizadas, Ticket promedio del día.

### 4. Paneles Laterales e Inferiores de Apoyo Operativo
Tres bloques complementarios distribuidos debajo o al lateral de la gráfica principal:
* **Bloque A: Alerta de Stock Crítico (Reposición Inmediata)**:
  * Lista compacta con los 5 productos con existencias por debajo del stock mínimo configurado.
  * Columnas: Nombre del artículo, Stock físico actual en rojo, Umbral mínimo y botón de acción rápida "Generar Orden de Compra".
* **Bloque B: Últimas Ventas del Turno (Feed en Vivo)**:
  * Lista de las últimas 5 transacciones completadas en mostrador.
  * Muestra: Número de ticket correlativo, Hora exacta, Nombre del cajero, Método de pago utilizado (Efectivo, Tarjeta, QR) y Monto total.
  * Enlace al pie: "Ver historial completo de ventas".
* **Bloque C: Accesos Directos**:
  * Botones grandes de acceso directo para operaciones frecuentes:
    * "Abrir Terminal POS (Caja)" en color azul destacado.
    * "Registrar Gasto de Caja Chica".
    * "Realizar Conteo / Arqueo de Caja".
    * "Nuevo Producto Rápido".

### 5. Adaptabilidad y Estados de Carga
* **Estados Vacíos y Cargas Iniciales**: Skeletons de carga en tarjetas y gráfica mientras se obtienen los datos.
* **Modo Sin Conexión**: Advertencia visual en el gráfico indicando que las métricas reflejan exclusivamente la actividad de la terminal local hasta la próxima sincronización con el servidor central.

---

### Módulo 1 Ampliado: Distribución Visual con 2 Filas de KPIs Financieros y Top Navigation Bar

Especificación visual y estructural detallada para el Dashboard Principal:

#### 1. Barra de Navegación Superior (Top Navigation Bar)
* **Logotipo del Sistema**: Marca destacada `Super POS`.
* **Buscador Global**: Campo con atajo `[F2]` para escaneo o búsqueda de artículos y funciones.
* **Accesos Directos a POS**: Botón de salto rápido a la Terminal Punto de Venta.
* **Selector de Fecha Interactivo**: Control de fecha y calendario.
* **Menú de Perfil de Administrador**: Avatar y credenciales del usuario con menú contextual.

#### 2. Encabezado de Bienvenida
* Saludo personalizado ("Bienvenido [Nombre], 👋") y botón desplegable de filtro por fecha.

#### 3. Matriz de Métricas Financieras en 2 Filas (8 Tarjetas KPI)
* **Fila 1 (Tarjetas Principales)**:
  1. *Ventas Totales*: Monto monetario ($864.00) con indicador % de tendencia.
  2. *Margen Neto / Utilidad Real*: Ganancia bruta menos CPP ($864.00, 32.5%).
  3. *Facturas Vencidas*: Indicador de cuentas por cobrar/pagar vencidas ($0.00 / 0 facturas).
  4. *Retorno Total de Compras*: Devoluciones o notas de crédito con proveedores ($0.00).
* **Fila 2 (Tarjetas Secundarias)**:
  5. *Compra Total*: Monto acumulado de compras recibidas ($0.00).
  6. *Compras Pendientes*: Compromisos valorizados por recibir en almacén ($0.00).
  7. *Registro de Devoluciones Totales*: Devoluciones de clientes procesadas en mostrador ($0.00).
  8. *Control Acumulado de Gastos Operativos*: Egresos de caja chica acumulados ($0.00).

#### 4. Panel de Analítica Gráfica Inferior ("Ventas de los últimos 30 días")
* Gráfico interactivo de líneas y áreas sombreadas con escala temporal y monetaria interactiva, conmutadores de vista y tooltips flotantes.
