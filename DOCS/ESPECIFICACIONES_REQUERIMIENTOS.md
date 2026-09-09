# Especificaciones de Requerimientos y Alcance del Sistema - Supero POS

Este documento es la especificación técnica completa y viva del sistema **Supero POS**. Contiene todos los requerimientos funcionalmente detallados, la estructura del menú lateral de 13 módulos, los permisos por rol (RBAC), las historias de usuario y casos de uso, los requerimientos no funcionales (NFR), la definición del MVP frente al roadmap futuro, la arquitectura técnica y stack tecnológico detallado, el modelo de datos relacional (ERD - PostgreSQL), la arquitectura de APIs y contratos de sincronización, los diseños UX/UI, flujos de usuario (User Flows), sistema de temas (Claro / Oscuro), la estructura del stack tecnológico definitivo, la estrategia DevOps y CI/CD, la planificación de Sprints y roadmap de ejecución, la lógica detallada del worker de sincronización y transacciones atómicas ACID, la estrategia de pruebas (QA) y protocolo de despliegue piloto, y la estimación de costos de infraestructura y plan de arranque.

---

## Paso 1.1: Orquestación de la Infraestructura de Datos Central (Desglose Profundo)

Análisis detallado de los componentes conceptuales, lógicos y operativos que intervienen en la preparación del entorno de datos central mediante contenedores:

### 1. Propósito y Aislamiento del Motor de Base de Datos
* **Independencia del Sistema Operativo Anfitrión**: El motor relacional (PostgreSQL) no se instala directamente sobre el sistema operativo físico de la máquina de desarrollo. En su lugar, se encapsula en un contenedor virtualizado liviano. Esto garantiza que el software corra exactamente bajo las mismas condiciones técnicas y de rendimiento, sin importar si posteriormente se traslada a un servidor en la nube o a otra máquina.
* **Estandarización de Versiones**: Se fija una versión específica y estable del motor de base de datos (PostgreSQL 15 Alpine), evitando incompatibilidades futuras causadas por actualizaciones automáticas del sistema o diferencias entre entornos de desarrollo y producción.

### 2. Configuración de Credenciales y Perímetro de Seguridad Inicial
* **Segregación de Privilegios**: Se establecen parámetros de control de acceso desde la inicialización del contenedor, definiendo un usuario administrador (`pos_admin`) con privilegios totales y una contraseña robusta exclusiva para la administración de las tablas corporativas.
* **Nombre de la Instancia Maestra**: Se asigna un identificador único para la base de datos relacional corporativa (`pos_central_db`), asegurando que todas las conexiones futuras del servidor central apunten exactamente al esquema financiero y de inventario correcto.

### 3. Gestión de Persistencia y Volúmenes de Almacenamiento
* **Protección contra Pérdida de Datos**: Por naturaleza, los contenedores son entornos efímeros; si se eliminan, su contenido interno desaparece. Para evitar la pérdida de información financiera o de catálogos durante las pruebas, se configura un volumen de almacenamiento persistente (`postgres_data`).
* **Enlace con el Anfitrión**: Este volumen actúa como un puente que mapea carpetas internas del contenedor con el disco duro físico del equipo de desarrollo, asegurando que las tablas, registros y transacciones permanezcan intactos aunque el contenedor sea detenido o reiniciado.

### 4. Mapeo de Puertos y Enlace de Red
* **Apertura de Canales de Comunicación**: Se asigna el puerto de red específico y estandarizado (`5432:5432`) en la máquina local para que funcione como el punto de contacto exclusivo entre el mundo exterior y el contenedor de la base de datos.
* **Interoperabilidad Local**: Este enlace permite que el backend central (NestJS) y las herramientas de administración gráfica de bases de datos se comuniquen de manera fluida utilizando la red interna del equipo.

### 5. Validación Operativa y Salud del Servicio
* **Verificación de Ejecución**: Se implementa un control de estado (*healthcheck*) para comprobar que el servicio del motor de base de datos se encuentre activo, ejecutando procesos en segundo plano de manera continua.
* **Comprobación de Disponibilidad**: Se confirma mediante comandos del sistema que el puerto de red asignado esté escuchando activamente y listo para aceptar las primeras conexiones seguras de la aplicación.

---

## Paso 1.2: Inicialización y Estructuración Conceptual del Servidor Central (NestJS - Monolito Modular)

Una vez asegurado el motor de base de datos relacional, el siguiente paso se enfoca en conceptualizar y estructurar la arquitectura del servidor central corporativo. Este servidor actuará como el cerebro de la lógica de negocio, procesando peticiones de las sucursales, administrando el catálogo y centralizando la analítica.

### 1. Filosofía de Arquitectura (Monolito Modular)
* **Independencia de Dominios**: El backend se diseña bajo un patrón de monolito modular. Esto significa que, aunque todo el código del servidor reside en una sola aplicación desplegable, los dominios funcionales (seguridad, ventas, inventario, caja) se encuentran estrictamente aislados en carpetas y componentes propios.
* **Bajo Acoplamiento y Alta Cohesión**: Cada módulo opera con sus propias reglas internas. Por ejemplo, el módulo de inventario no puede modificar directamente las tablas de usuarios o ventas sin pasar por los servicios autorizados de esos respectivos dominios, garantizando un código limpio y fácil de escalar o migrar a microservicios en el futuro si el crecimiento del negocio lo exige.

### 2. Definición y Alcance de los Módulos Base del Servidor
* **Módulo de Autenticación e Identidad (`auth`)**: Responsable de recibir las credenciales, validar contra los hashes seguros, emitir los tokens de sesión firmados y gestionar las políticas de acceso.
* **Módulo de Catálogo Maestro (`products`)**: Administra la creación, actualización y consulta de productos, gestionando las reglas operativas según el tipo de unidad (enteras, fraccionadas y serializadas con IMEI).
* **Módulo de Inventario y Kardex (`inventory`)**: Controla los almacenes físicos, las existencias, el cálculo automático del costo promedio ponderado y los movimientos de entrada/salida.
* **Módulo de Ventas Central (`sales`)**: Recibe, valida y almacena de forma definitiva los tickets sincronizados por las terminales de caja.
* **Módulo de Gestión de Cajas (`cash-registers`)**: Administra de forma centralizada la trazabilidad de los turnos, arqueos y egresos operativos.
* **Módulo de Sincronización Asíncrona (`sync`)**: El componente encargado de procesar los lotes de transacciones enviados por las terminales fuera de línea, aplicando reglas de idempotencia y prevención de duplicados.

### 3. Configuración y Gestión de Entorno (Variables de Configuración)
* **Centralización de Parámetros Sensibles**: Se establece la conceptualización de un archivo de configuración de entorno seguro (`.env`) que aísla los datos críticos del código fuente (como las credenciales de conexión a PostgreSQL, las llaves privadas para la firma de tokens de sesión y los puertos de escucha de la API).
* **Validación de Arranque**: El servidor debe configurar un mecanismo preventivo que verifique, antes de iniciar operaciones, que todas las variables de entorno obligatorias estén presentes y sean válidas; de lo contrario, el sistema se detiene de forma controlada para evitar fallos de ejecución en producción.

### 4. Capas Transversales de Seguridad, Validación y Manejo de Errores
* **Filtros de Excepciones Globales**: Se conceptualiza un manejador central de errores que intercepta cualquier fallo en los endpoints, transformando los errores técnicos de la base de datos o del código en respuestas HTTP estandarizadas y limpias para los clientes (formato RFC 7807).
* **Pipes de Validación de Datos**: Se establece que toda información que ingrese a la API (como datos de productos, montos de venta o credenciales) debe pasar por reglas strictly de tipado y saneamiento antes de tocar la lógica de negocio, previniendo inyecciones o datos corruptos.

---

## Paso 1.3: Estructuración Conceptual de la Terminal de Escritorio (Electron + Vite + React)

Con el servidor central conceptualizado, el siguiente paso se enfoca en diseñar la arquitectura de la aplicación cliente que operará directamente en cada caja de las sucursales. Esta terminal debe garantizar velocidad, independencia de red y control físico del mostrador.

### 1. Arquitectura de Procesos Duales en Electron
* **Aislamiento del Proceso Principal (Main Process)**:
  * Actúa como el núcleo de control del sistema operativo de escritorio. Es el único proceso con privilegios para interactuar directamente con los recursos físicos de la máquina: el sistema de archivos local, los puertos USB/Serial para impresoras y básculas, y la gestión de las ventanas de la aplicación.
* **Aislamiento del Proceso de Renderizado (Renderer Process)**:
  * Corresponde a la interfaz gráfica desarrollada con tecnologías web modernas (React y Tailwind CSS). Este proceso se ejecuta en un entorno controlado y seguro, sin acceso directo al hardware, comunicándose con el proceso principal mediante puentes seguros de mensajes asíncronos (IPC Bridge).

### 2. Capa de Persistencia Local y Base de Datos Embebida (SQLite)
* **Autonomía Operativa (Offline-First)**:
  * La terminal conceptualiza el uso de una base de datos relacional local embebida directamente en el almacenamiento cifrado de la máquina. Esto permite que el cajero consulte precios, gestione el carrito y emita tickets de venta de manera instantánea, aun cuando la conexión a internet esté totalmente interrumpida.
* **Tabla de Retención de Sincronización (`sync_queue`)**:
  * Se diseña conceptualmente una estructura interna dedicada exclusivamente a retener de forma estructurada los paquetes de transacciones ejecutadas sin red, asegurando que ningún ticket se pierda y preparando los datos para cuando el sistema detecte conectividad con el servidor central.

### 3. Interfaz de Usuario y Ergonomía Visual (React + Tailwind CSS)
* **Sistema de Diseño Dual (Modo Claro / Modo Oscuro Puro)**:
  * La interfaz se conceptualiza para adaptarse dinámicamente a las condiciones lumínicas del mostrador o la bodega, utilizando contrastes estrictos que reducen la fatiga visual del cajero durante jornadas de alta rotación.
* **Optimización para Pantallas Táctiles y Teclado**:
  * El diseño prioriza botones de gran formato para accesos rápidos en pantallas táctiles, combinados con la captura global de eventos de teclado para habilitar atajos de cobro instantáneo sin necesidad de utilizar el ratón.

### 4. Puente de Comunicación con Periféricos de Hardware
* **Controladores Nativos Unificados**:
  * Se conceptualiza una capa de abstracción en el proceso principal que traduce las órdenes del cajero (como imprimir un ticket, abrir la gaveta monedero o capturar el peso de una báscula) en comandos físicos ejecutados a través de los puertos del equipo, manteniendo la interfaz gráfica totalmente fluida y libre de bloqueos.

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
  * Los costos unitarios y ponderados deben calcularse y almacenarse obligatoriamente con una precisión mínima de cuatro decimales en la base de datos central (`DECIMAL(12,4)`) para evitar la pérdida acumulativa de centavos en inventarios de alto volumen. Los precios de venta al público se redondean strictly a dos decimales.
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

---

## Paso 1: Definición de Requerimientos y Alcance (Módulo de Gestión y Alta de Productos)

Dentro del alcance del sistema, el proceso de gestión y alta de productos (catálogo maestro) debe ser sumamente versátil, ya que un minimarket maneja productos masivos por peso/unidad, mientras que una tienda de electrónica maneja productos únicos e identificables.

### 1. Creación y Configuración del Producto (Catálogo Maestro)
- **Datos Básicos**:
  - Nombre comercial y descripción detallada.
  - Código interno (SKU autogenerado o manual).
  - Código de barras principal (para lectura con escáner).
  - Asociación obligatoria a una Categoría y Subcategoría (ej. *Electrónica > Smartwatches* o *Abarrotes > Lácteos*).
- **Gestión de Precios y Costos**:
  - Precio de costo histórico o ponderado.
  - Múltiples listas de precios: **Precio Regular (Minorista)**, **Precio por Mayor** (escala por volumen) y **Precio Especial/Oferta**.
  - Cálculo automático del margen de ganancia porcentual en tiempo real conforme se define el precio de venta.

### 2. Tipos de Unidades de Medida y Comportamiento (Adaptabilidad Comercial)
El sistema permite configurar el producto según su naturaleza operativa:
- **Productos por Unidades Enteras (Standard)**: Para artículos de electrónica, accesorios, latas, botellas, etc. (controlados estrictamente en números enteros).
- **Productos Fraccionados / A Granel (Fractional)**: Para bodegas/minimarkets donde se vende por peso (gramos/kilos) o longitud (metros). El sistema permite vender cantidades decimales (ej. `0.450 kg` de queso o `1.2` metros de cable).
- **Productos con Trazabilidad Estricta (Serialized / IMEI)**: Exclusivo para electrónica. Al dar de alta el producto, se define que requiere número de serie. El stock no solo se cuenta por cantidad, sino que exige registrar individualmente cada código IMEI/Serie al momento de ingresar la compra y validarlo obligatoriamente al realizar la venta.

### 3. Control de Lotes, Fechas de Vencimiento y Ubicación
- **Control de Caducidad (FIFO)**: Capacidad de asociar fechas de vencimiento a los lotes de mercadería que ingresan (vital para abarrotes, lácteos y productos perecibles en bodegas), permitiendo alertar en el POS o dashboard sobre productos próximos a vencer.
- **Ubicación Física en Almacén (Pasillo / Estante)**: Campos opcionales para mapear la ubicación exacta del producto dentro del depósito o tienda (ej. *Pasillo 3, Estante B*) para facilitar la reposición y el conteo físico.

### 4. Gestión Masiva y Actualizaciones
- **Importación y Exportación Masiva**: Herramienta para cargar, actualizar precios o masificar catálogos enteros mediante archivos estructurados (Excel / CSV), evitando la inserción manual uno por uno.
- **Impresión de Etiquetas de Códigos de Barras**: Módulo integrado para generar e imprimir etiquetas con códigos de barras o códigos internos para aquellos productos que no los traigan de fábrica (muy común en productos artesanales o a granel de bodega).

---

## Estructura del Menú Lateral (Sidebar) y Alcance Detallado por Roles

Definición exhaustiva del alcance del sistema basada en la estructura del menú lateral de la interfaz, especificando las capacidades operativas y la matriz de control de acceso por roles (Admin, Gerente, Almacenero, Cajero/Vendedor).

### 1. Hogar (Dashboard Gerencial y Operativo)
- **Alcance**: Panel central con métricas financieras en tiempo real (ingresos diarios, semanales, mensuales, ticket promedio y margen bruto), estado de cajas abiertas y alertas críticas (stock mínimo, productos por caducar y créditos vencidos).
- **Permisos por Rol**:
  - *Admin / Gerente*: Acceso total a métricas financieras, gráficas de rendimiento y auditorías.
  - *Cajero / Almacenero*: Vista restringida o simplificada enfocada únicamente en accesos directos operativos de su área.

### 2. Gestión de Usuarios
- **Alcance**: Administración del personal con alta, baja, edición de credenciales y asignación estricta de permisos granulares (RBAC).
- **Permisos por Rol**:
  - *Admin*: Acceso exclusivo.

### 3. Contactos (CRM y SRM)
- **Alcance**: Directorio unificado y segmentado. Incluye gestión de Clientes (datos fiscales, historial de compras, control de líneas de crédito y "fiados") y Proveedores (datos comerciales, condiciones de pago y cuentas).
- **Permisos por Rol**:
  - *Admin / Gerente*: Control total de clientes y proveedores.
  - *Cajero / Vendedor*: Permiso para registrar nuevos clientes rápidamente y consultar sus créditos o historial básico desde el POS.

### 4. Productos
- **Alcance**: Catálogo maestro completo. Gestión de categorías, subcategorías, códigos de barras, múltiples listas de precios (mayorista, minorista, oferta), configuración de tipos de unidad (enteras, fraccionadas a granel y con trazabilidad estricta por número de serie/IMEI para electrónica), además de control de lotes y fechas de vencimiento.
- **Permisos por Rol**:
  - *Admin / Gerente*: Creación, edición de costos/precios y eliminación de productos.
  - *Almacenero*: Edición de atributos físicos y stock base.
  - *Cajero / Vendedor*: Solo modo consulta (ver precios, stock disponible y características para informar al cliente).

### 5. Compras
- **Alcance**: Gestión de órdenes de compra a proveedores, registro de facturas de ingreso de mercadería y validación física de la carga contra la factura para actualizar automáticamente los costos de inventario.
- **Permisos por Rol**:
  - *Admin / Gerente*: Autorización y visualización financiera de compras.
  - *Almacenero*: Ejecución de la recepción física y registro de órdenes.

### 6. Vender (Punto de Venta - POS)
- **Alcance**: Interfaz de cobro ultrarrápida optimizada para pantallas táctiles y lectores de código de barras (incluyendo decodificación de balanzas electrónicas). Permite ventas de productos fraccionados, captura obligatoria de series/IMEI, aplicación de descuentos, pagos mixtos (efectivo, tarjeta, QR), cálculo de vuelto y gestión de turnos (apertura y cierre/arqueo de caja).
- **Permisos por Rol**:
  - *Cajero / Vendedor*: Acceso exclusivo al flujo de cobro y apertura/cierre de su propia caja asignada.
  - *Admin / Gerente*: Acceso de supervisión, capacidad de autorizar anulaciones de ventas o devoluciones bloqueadas.

### 7. Transferencias de Acción / Stock
- **Alcance**: Módulo de logística interna para mover mercadería entre sucursales o depósitos mediante guías de remisión con doble validación de estado (En tránsito y Recibido), evitando mermas fantasma.
- **Permisos por Rol**:
  - *Admin / Gerente*: Autorización general de transferencias entre tiendas.
  - *Almacenero*: Ejecución y confirmación de envíos y recepciones físicas.

### 8. Ajuste de Stock
- **Alcance**: Kardex transaccional inalterable y auditoría de inventarios. Permite registrar mermas, robos, productos dañados, caducados o correcciones manuales derivadas de inventarios físicos cíclicos con justificación obligatoria.
- **Permisos por Rol**:
  - *Admin*: Autorización y revisión de bitácoras de ajuste.
  - *Almacenero*: Registro técnico de movimientos en el inventario.

### 9. Gastos
- **Alcance**: Registro y categorización de salidas monetarias operativas ajenas a la compra de inventario (ej. pago de servicios básicos, insumos de tienda, mantenimiento menor).
- **Permisos por Rol**:
  - *Admin / Gerente*: Registro y control financiero de egresos.

### 10. Cuentas de Pago / Cobro
- **Alcance**: Control de cuentas bancarias de la empresa, cajas chicas, seguimiento de cuentas por pagar a proveedores y recaudación de cuentas por cobrar de clientes con créditos vigentes.
- **Permisos por Rol**:
  - *Admin / Gerente*: Gestión y visibilidad financiera completa.

### 11. Informes
- **Alcance**: Generación de reportes analíticos avanzados sobre ventas, rentabilidad por producto/categoría, rotación de inventario, auditorías de caja y cierres de turno consolidados.
- **Permisos por Rol**:
  - *Admin / Gerente*: Acceso total a reportes gerenciales y financieros.

### 12. Plantillas de Notificación
- **Alcance**: Configuración de parámetros para alertas automáticas del sistema (umbrales de stock mínimo, avisos de proximidad de caducidad y alertas de créditos vencidos).
- **Permisos por Rol**:
  - *Admin*: Configuración exclusiva.

### 13. Ajustes
- **Alcance**: Configuración general del sistema: datos fiscales de la empresa, configuración de hardware local (impresoras térmicas ESC/POS, gavetas de dinero, lectores).

---

## Paso 2: Historias de Usuario y Casos de Uso (Versión Ampliada y Detallada por Módulos y Roles)

Desglose exhaustivo de las historias de usuario organizadas según los módulos del menú lateral y el nivel de acceso de cada rol.

### 1. Módulo: Hogar (Dashboard Gerencial)
- **Para el Administrador / Gerente**:
  - Como Administrador, quiero visualizar gráficos comparativos de ventas de los últimos 30 días y el margen de ganancia neto en tiempo real para evaluar la salud financiera diaria del negocio sin necesidad de abrir reportes complejos.
  - Como Administrador, quiero ver widgets de alerta temprana sobre stock crítico y compras pendientes para anticiparme al desabastecimiento antes de que afecte las ventas.

### 2. Módulo: Gestión de Usuarios
- **Para el Administrador**:
  - Como Administrador, quiero crear perfiles de usuario nuevos asignando credenciales únicas y un rol específico (Cajero, Almacenero, Supervisor) para restringir el acceso a funciones críticas de la empresa.
  - Como Administrador, quiero desactivar de inmediato la cuenta de un empleado que deja la empresa para revocar el acceso al sistema por motivos de seguridad.

### 3. Módulo: Contactos (Clientes y Proveedores)
- **Para el Administrador / Almacenero**:
  - Como Administrador, quiero registrar los datos fiscales completos de un proveedor (Razón social, NIT, dirección, plazos de crédito) para asociarlos correctamente a las órdenes de compra y cuentas por pagar.
- **Para el Cajero / Vendedor**:
  - Como Cajero, quiero buscar el historial de compras y el estado de la línea de crédito de un cliente recurrente directamente desde el POS para informarle si cuenta con saldo disponible para compras a plazo ("fiado").

### 4. Módulo: Productos (Catálogo Maestro)
- **Para el Administrador**:
  - Como Administrador, quiero dar de alta un producto configurando su tipo de unidad (Unidad entera para accesorios, Fraccionado a granel para abarrotes, o Con número de serie/IMEI para electrónica) para que el sistema se comporte de forma adecuada según el artículo.
  - Como Administrador, quiero establecer múltiples listas de precios (Precio Minorista, Precio Mayorista y Precio de Oferta) para aplicarlas automáticamente según el tipo de cliente en la caja.
- **Para el Cajero / Almacenero**:
  - Como Cajero, quiero consultar el catálogo buscando por código de barras, nombre o atributos para verificar rápidamente el precio y stock disponible en caso de que el cliente pregunte en mostrador.

### 5. Módulo: Compras
- **Para el Administrador / Almacenero**:
  - Como Almacenero, quiero generar una orden de compra detallando las cantidades acordadas con el proveedor para tener un documento formal de pedido.
  - Como Almacenero, quiero registrar la recepción física de la mercancía validando la factura del proveedor ítem por ítem para actualizar de forma automática los costos y el inventario del almacén central.

### 6. Módulo: Vender (Punto de Venta - POS)
- **Para el Cajero / Vendedor**:
  - Como Cajero, quiero procesar una venta utilizando un lector de códigos de barras o decodificando balanzas electrónicas para registrar productos pesados (ej. gramos de queso o metros de cable) de forma exacta.
  - Como Cajero, quiero registrar de forma obligatoria el número de serie o IMEI al vender un smartphone o equipo electrónico para asociarlo al ticket y respaldar futuras garantías.
  - Como Cajero, quiero realizar cobros mixtos (ej. una parte en efectivo, otra por transferencia QR y otra con tarjeta) para adaptarme a las formas de pago del cliente.
  - Como Cajero, quiero aplicar un descuento global o por ítem autorizado previamente por su clave de supervisor para cerrar una venta especial sin vulnerar los márgenes de ganancia.

### 7. Módulo: Transferencias de Stock y Ajustes
- **Para el Almacenero**:
  - Como Almacenero, quiero generar una guía de transferencia interna de mercancía entre la sucursal principal y el depósito secundario con estado "En tránsito" para mantener la trazabilidad de los productos en movimiento.
  - Como Almacenero, quiero registrar un ajuste de inventario por mermas, roturas o diferencias de conteo físico añadiendo una justificación obligatoria para mantener el Kardex auditado y sin mermas ocultas.

### 8. Módulo: Gastos y Cuentas de Pago/Cobro
- **Para el Administrador**:
  - Como Administrador, quiero registrar los gastos operativos menores del día (como compra de suministros de limpieza o pasajes) descontándolos de la caja autorizada para mantener la contabilidad diaria exacta.
  - Como Administrador, quiero registrar abonos y pagos de cuentas pendientes a proveedores para llevar un control estricto de las cuentas por pagar y evitar bloqueos comerciales.

### 9. Módulo: Informes y Auditoría
- **Para el Administrador / Gerente**:
  - Como Administrador, quiero generar un reporte consolidado de cierres de caja por cajero y turno para detectar discrepancias monetarias (faltantes o sobrantes).
  - Como Administrador, quiero consultar el reporte de rotación de inventario (productos con alta salida frente a productos estancados) para tomar decisiones de liquidación o reabastecimiento.

### 10. Módulo: Ajustes y Configuración
- **Para el Administrador**:
  - Como Administrador, quiero configurar los datos fiscales de la empresa, parámetros de impresoras térmicas ESC/POS, gavetas de dinero, lectores de código de barras y tasas de impuestos para asegurar una operación continua y la emisión de comprobantes.

---

## Paso 3: Requerimientos No Funcionales (NFR) - Versión Exhaustiva y Detallada

Desglose técnico ampliado de las características de calidad, rendimiento, seguridad y resiliencia que aseguran la viabilidad comercial, la estabilidad operativa y la protección de datos del sistema POS multifuncional.

### 1. Rendimiento, Carga y Latencia
- **Velocidad de Interacción en el POS**: La lectura de códigos de barras, la búsqueda de artículos por nombre, SKU o atributos, y el cálculo del ticket de venta final no deben superar los **200 milisegundos**, garantizando fluidez y evitando congestión en las filas de caja durante horas pico.
- **Optimización para Catálogos Masivos**: El motor de bases de datos debe soportar catálogos complejos que superen los **100,000 SKUs** sin degradación de velocidad, utilizando índices avanzados en columnas clave (códigos de barras, SKUs, números de serie/IMEI y categorías).
- **Gestión Concurrente de Terminales**: Soporte multi-terminal simultáneo donde múltiples cajas operando al mismo tiempo en la misma sucursal no generen bloqueos de base de datos (deadlocks) ni retrasos en la validación de stock.

### 2. Disponibilidad, Resiliencia y Arquitectura Offline-First
- **Autonomía Operativa Local (100% Sin Internet)**: Cada terminal de punto de venta debe contar con una base de datos local embebida (ej. SQLite) que le permita realizar búsquedas de productos, procesar cobros, aplicar descuentos, imprimir comprobantes físicos y descontar stock localmente de forma totalmente independiente ante caídas totales de la red de internet.
- **Sincronización Asíncrona Bidireccional**: Una vez restablecida la conectividad, el sistema debe ejecutar una sincronización en segundo plano, enviando las ventas locales al servidor central y actualizando catálogos o precios nuevos hacia las terminales.
- **Resolución de Conflictos por Concurrencia**: Mecanismos basados en marcas de tiempo (timestamps) y registros de versión para solucionar automáticamente colisiones de datos si un producto fue modificado centralmente mientras una caja operaba sin conexión.
- **Protección contra Cortes de Energía**: Mecanismos de persistencia y transaccionalidad robustos para evitar la corrupción de la base de datos local o la pérdida de turnos de caja ante apagones repentinos o desconexiones físicas de hardware.

### 3. Seguridad, Control de Accesos y Privacidad
- **Cifrado Avanzado de Credenciales**: Las contraseñas de los usuarios (Administradores, Cajeros, Almaceneros) deben almacenarse exclusivamente utilizando funciones de derivación de claves seguras y resistentes a ataques de fuerza bruta, tales como **Argon2id** o **bcrypt**.
- **Gestión Segura de Sesiones (JWT)**: Autenticación basada en tokens de acceso con tiempo de expiración corto y tokens de refresco (refresh tokens), previniendo vulnerabilidades si una terminal POS queda desatendida temporalmente.
- **Control de Acceso Basado en Roles (RBAC Estricto)**: Restricción de rutas a nivel de API y renderizado condicional estricto en el frontend. Un cajero jamás podrá visualizar vistas de costos de compra, márgenes de ganancia o reportes gerenciales.
- **Bitácora de Auditoría Inalterable (Logs de Seguridad)**: Registro obligatorio en una tabla de auditoría protegida de cualquier acción de alto riesgo: anulaciones de ventas, descuentos fuera de rango autorizado, modificaciones de precios base, aperturas de cajón sin venta e ingresos de inventario manual. Cada registro debe almacenar la estampa de tiempo, el usuario exacto y la terminal.

### 4. Integridad Financiera y Consistencia Transaccional (ACID)
- **Atomicidad en Ventas e Inventarios**: Cualquier transacción financiera (cobro de ticket) y su respectivo impacto logístico (descuento de stock en la tabla de inventario, afectación de caja y registro en el Kardex) debe ejecutarse bajo una **transacción ACID**. Si ocurre un fallo de impresión o de hardware a mitad del proceso, la base de datos debe aplicar un rollback completo para evitar desajustes monetarios o mermas fantasma.
- **Cierre de Caja Ciego e Inalterable**: Los montos declarados en los arqueos de turno deben bloquearse para su edición posterior una vez validados y cerrados, exigiendo un proceso de auditoría formal por parte del administrador para cualquier corrección posterior.

### 5. Compatibilidad y Comunicación de Hardware (Periféricos)
- **Baja Latencia con Periféricos de Caja**: Comunicación nativa o mediante pasarelas locales eficientes con impresoras térmicas de tickets (soporte universal de comandos **ESC/POS** para corte automático y apertura de gaveta de dinero).
- **Soporte de Lectores y Balanzas**: Compatibilidad directa con escáneres de códigos de barras por puerto USB/HID o serial y decodificación automática de tramas de peso provenientes de balanzas electrónicas en el mostrador.

---

## Paso 4: Definición del MVP (Producto Mínimo Viable) - Versión Exhaustiva

Para garantizar un desarrollo ágil, evitar el crecimiento descontrolado del alcance (scope creep) y asegurar un producto funcional listo para operar en entornos comerciales exigentes, desglosamos y ampliamos las características obligatorias de la versión inicial (MVP), separando formalmente lo que queda reservado para fases evolutivas futuras.

### 1. Funcionalidades Detalladas del MVP (Core Operativo y Comercial)

#### 1.1. Seguridad y Control de Accesos (RBAC Base)
- Autenticación de usuarios basada en tokens seguros (JWT).
- Implementación estricta de tres roles principales operativos con visibilidad diferenciada en el menú lateral:
  - **Cajero**: Acceso exclusivo al POS, aperturas/cierres de caja y consultas rápidas.
  - **Almacenero**: Acceso a recepción de mercancía y ajustes de stock.
  - **Administrador**: Acceso gerencial, dashboard, catálogos y gestión de personal.

#### 1.2. Catálogo Maestro de Productos (Adaptación Multifuncional)
- Alta, edición y baja de productos con soporte para códigos de barras y SKUs.
- Configuración de tres tipos de unidades comerciales:
  - **Unidades Enteras**: Para artículos estandarizados de electrónica y accesorios.
  - **Unidades Fraccionadas (A granel)**: Para abarrotes, permitiendo ventas con cantidades decimales (peso o longitud).
  - **Trazabilidad por Serie / IMEI**: Exclusivo para electrónica, exigiendo el registro obligatorio de números de serie al ingresar y vender el equipo.
- Gestión de precios de costo y listas de precios (minorista y mayorista).

#### 1.3. Punto de Venta (POS Frontend & Offline-First)
- Interfaz de cobro rápida optimizada para pantallas táctiles y lectores de códigos de barras.
- **Operación 100% Offline**: Funcionamiento local autónomo ante cortes de internet (con base de datos local SQLite), sincronizando transacciones de forma asíncrona al restablecerse la red.
- Soporte para métodos de pago múltiples o combinados (Efectivo, Tarjeta, Transferencia/QR) y cálculo automático de vuelto.
- Gestión de turnos: Apertura de caja con fondo inicial y arqueo de cierre.

#### 1.4. Inventario Base y Kardex
- Control de stock por almacén (Tienda principal y Depósito).
- Kardex transaccional automatizado para registrar entradas por compras y salidas por ventas directas.
- Alertas tempranas de stock mínimo en el dashboard.

#### 1.5. Dashboard Gerencial Inicial
- Visualización en tiempo real de ventas totales del día, ticket promedio, margen bruto básico y estado de cajas activas.

---

### 2. Funcionalidades Excluidas del MVP (Roadmap - Fase 2 y Posteriores)

Para mantener el enfoque en el núcleo operativo y acelerar el tiempo de salida al mercado, los siguientes submódulos quedan apartados para fases de escalabilidad:
- **Facturación Electrónica Fiscal Nativa**: Integración avanzada con regulaciones tributarias gubernamentales (el MVP emite tickets de venta internos / notas de venta).
- **Módulo Completo de Órdenes de Compra y Proveedores**: Las compras se registrarán de forma directa como ingresos a inventario sin requerir flujos complejos de cotizaciones o solicitudes de compra previas.
- **Gestión Avanzada de Cuentas por Cobrar ("Fiados") y Créditos**: El control de líneas de crédito a largo plazo se reducirá a un registro manual básico en el perfil del cliente, sin automatización de cobros o alertas masivas.
- **Transferencias de Stock con Doble Validación**: Los traslados entre sucursales se efectuarán de manera directa sin requerir un estado intermedio de aprobación "En tránsito".
- **Programas de Fidelización, Membresías y Puntos**: Acumulación de puntos por compras frecuentes de clientes.

---

## Paso 5: Elección del Patrón Arquitectónico y Stack Tecnológico Detallado

Para garantizar que el sistema sea altamente robusto, tolerante a fallos, fácil de mantener y 100% operativo ante interrupciones de conectividad, se amplía y detalla la arquitectura de software, incorporando los componentes críticos de sincronización, hardware y comunicación.

### 1. Patrón Arquitectónico del Backend: Monolito Modular
El servidor central se construye bajo el patrón de **Monolito Modular** utilizando **NestJS** y **TypeScript**.
- **Organización por Dominios Acotados (Bounded Contexts)**: El código se divide en módulos independientes y estrictamente desacoplados:
  - **Auth & Users**: Gestión de credenciales y roles RBAC.
  - **Products & Categories**: Catálogo maestro, precios y tipos de unidad.
  - **Inventory & Warehouses**: Control de stock, kardex y transferencias.
  - **Sales & POS**: Procesamiento de tickets, pagos mixtos y series/IMEI.
  - **CashRegisters**: Aperturas, control de flujos y arqueos de caja.
  - **Suppliers & Purchases**: Órdenes de compra y cuentas por pagar.
  - **Audit**: Bitácora de seguridad y logs de acciones sensibles.
- **Ventaja Operativa**: Mantiene la simplicidad de despliegue de un monolito, pero evita el acoplamiento caótico gracias a la inyección de dependencias estricta de NestJS, facilitando su futura migración a microservicios si el negocio escala a múltiples sucursales a nivel nacional.

### 2. Arquitectura de Despliegue Híbrido (Offline-First) y Base de Datos
Para garantizar que las cajas no se detengan por cortes de internet, la infraestructura opera con un modelo distribuido:
- **Capa Local (Terminales POS - Tienda / Caja)**:
  - *Tecnología de Cliente*: Aplicación de escritorio multiplataforma desarrollada con **Electron + React**.
  - *Base de Datos Local*: **SQLite**, embebida directamente en la terminal. Almacena una copia optimizada del catálogo de productos, precios y el stock local de la sucursal.
  - *Autonomía Total*: El cajero puede buscar productos, aplicar descuentos, registrar series/IMEI, procesar pagos y emitir tickets sin conexión a internet.
- **Capa Central (Servidor Cloud / Servidor Principal de la Empresa)**:
  - *Base de Datos Central*: **PostgreSQL**, gestionada mediante un ORM (Prisma o TypeORM) para asegurar transacciones ACID strictly.
  - *Consolidación Global*: Almacena la data histórica de todas las sucursales, reportes gerenciales, control de usuarios y catálogos maestros globales.
- **Mecanismo de Sincronización Asíncrona (Patrón Outbox / Cola de Sincronización)**:
  - Cuando la terminal opera sin internet, cada venta realizada se guarda en una cola de pendientes local (`sync_queue`).
  - Al detectarse nuevamente conexión a internet, un proceso en segundo plano (*background worker*) transmite los paquetes de ventas pendientes al servidor central mediante peticiones HTTP seguras (POST masivos o por lotes).
  - *Resolución de Conflictos*: El servidor central procesa los paquetes utilizando las marcas de tiempo (*timestamps*) originales de la venta para impactar el Kardex central sin alterar la contabilidad histórica del turno.

### 3. Capa de Comunicación con Periféricos de Hardware
Dado que un POS interactúa directamente con dispositivos físicos, la aplicación de escritorio (Electron) incorpora un puente de comunicación nativo (IPC - Inter-Process Communication):
- **Impresoras Térmicas**: Comunicación directa con puertos USB o Red (TCP/IP) mediante comandos estándar **ESC/POS** para impresión de tickets, corte automático de papel y apertura de la gaveta de dinero.
- **Lectores de Códigos de Barras**: Recepción de eventos por interfaz USB (modo HID o emulación de teclado) con captura instantánea de caracteres para evitar latencia en la pantalla de cobro.
- **Balanzas Electrónicas**: Interfaz serial o USB para capturar tramas de peso directo al momento de vender productos fraccionados a granel.

### 4. Seguridad de la Arquitectura y Comunicaciones
- **Cifrado de Tránsito**: Toda comunicación entre las terminales POS locales y el servidor central viaja bajo protocolos seguros **HTTPS / TLS 1.3**.
- **Tokens de Autenticación**: Uso de **JWT (JSON Web Tokens)** con rotación de claves y tiempos de expiración estrictos, almacenados de forma encriptada en el almacenamiento seguro de Electron.
- **Integridad de Datos Local**: La base de datos SQLite local cuenta con cifrado a nivel de archivo (ej. **SQLCipher**) para proteger la información comercial ante robos físicos de equipos en tienda.

---

## Paso 6: Diseño del Modelo de Datos Detallado y Optimizado (ERD - PostgreSQL)

Ampliación exhaustiva del modelo relacional en PostgreSQL, incorporando restricciones de integridad, índices estratégicos para alto rendimiento con catálogos masivos (más de 100,000 SKUs) y soporte total para la operación híbrida y multitienda.

### 1. Módulo de Seguridad y Control de Accesos (RBAC)

#### Tabla `roles`
- `id` (SERIAL, Primary Key)
- `name` (VARCHAR(50), Unique, Not Null): Identificador del rol (ADMIN, CAJERO, ALMACENERO).
- `description` (VARCHAR(255)): Descripción operativa del rol.

#### Tabla `users`
- `id` (SERIAL, Primary Key)
- `role_id` (INT, Foreign Key -> `roles.id`, Not Null)
- `username` (VARCHAR(100), Unique, Not Null): Nombre de usuario para inicio de sesión.
- `password_hash` (VARCHAR(255), Not Null): Hash seguro generado mediante Argon2id.
- `is_active` (BOOLEAN, Default: TRUE): Control de habilitación de cuenta.
- `created_at` (TIMESTAMP WITH TIME ZONE, Default: CURRENT_TIMESTAMP)
- **Índices**: Índice en `username` para acelerar la autenticación.

### 2. Módulo de Almacenes y Jerarquía de Catálogo

#### Tabla `warehouses`
- `id` (SERIAL, Primary Key)
- `name` (VARCHAR(150), Not Null): Nombre de la sucursal o depósito (ej. "Tienda Principal La Paz", "Depósito Central").
- `address` (VARCHAR(255)): Ubicación física.
- `is_active` (BOOLEAN, Default: TRUE)

#### Tabla `categories`
- `id` (SERIAL, Primary Key)
- `name` (VARCHAR(150), Not Null): Nombre de la categoría (ej. "Electrónica", "Abarrotes").
- `parent_id` (INT, Foreign Key -> `categories.id`, Nullable): Permite estructurar subcategorías de forma jerárquica.

### 3. Módulo de Catálogo Maestro, Trazabilidad y Stock

#### Tabla `products`
- `id` (SERIAL, Primary Key)
- `category_id` (INT, Foreign Key -> `categories.id`, Not Null)
- `sku` (VARCHAR(100), Unique, Not Null): Código único de inventario.
- `barcode` (VARCHAR(100), Index, Not Null): Código de barras principal para escáner.
- `name` (VARCHAR(250), Not Null): Nombre comercial del producto.
- `cost_price` (DECIMAL(12,4), Not Null): Precio de adquisición o costo ponderado.
- `sale_price` (DECIMAL(12,4), Not Null): Precio de venta regular minorista.
- `wholesale_price` (DECIMAL(12,4), Nullable): Precio especial por volumen o mayorista.
- `unit_type` (VARCHAR(20), Not Null): Tipo de comportamiento (UNIT para enteros, FRACTION para decimales/a granel, SERIALIZED para electrónica con serie/IMEI).
- `min_stock` (DECIMAL(12,4), Default: 0): Umbral mínimo para alertas tempranas en el dashboard.
- `is_active` (BOOLEAN, Default: TRUE)
- **Índices**: Índices compuestos en `barcode` y `sku` para búsquedas en menos de 200 milisegundos en el POS.

#### Tabla `product_serials` (Exclusivo para Electrónica)
- `id` (SERIAL, Primary Key)
- `product_id` (INT, Foreign Key -> `products.id`, Not Null)
- `serial_number` (VARCHAR(150), Unique, Not Null): Número de serie o IMEI físico del equipo.
- `status` (VARCHAR(30), Default: 'IN_STOCK'): Estados posibles (IN_STOCK, SOLD, RETURNED, DAMAGED).
- **Índices**: Índice único estricto en `serial_number` para evitar duplicidad de garantías.

#### Tabla `inventory` (Stock Multi-Almacén - Tabla Pivote)
- `id` (SERIAL, Primary Key)
- `product_id` (INT, Foreign Key -> `products.id`, Not Null)
- `warehouse_id` (INT, Foreign Key -> `warehouses.id`, Not Null)
- `stock` (DECIMAL(12,4), Default: 0.0000): Cantidad física exacta disponible (soporta decimales para productos fraccionados a granel).
- `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Restricción**: Clave única compuesta en (`product_id`, `warehouse_id`) para garantizar un único registro de stock por producto en cada almacén.

### 4. Módulo de Contactos (CRM y SRM)

#### Tabla `contacts`
- `id` (SERIAL, Primary Key)
- `type` (VARCHAR(20), Not Null): Clasificación del contacto (CUSTOMER o SUPPLIER).
- `name` (VARCHAR(200), Not Null): Nombre completo o Razón Social.
- `tax_id` (VARCHAR(50)): Número de identificación fiscal (NIT o Cédula de Identidad).
- `phone` (VARCHAR(50))
- `address` (VARCHAR(255))
- `credit_limit` (DECIMAL(12,4), Default: 0.0000): Monto máximo autorizado para créditos o compras a plazo ("fiados").

### 5. Módulo de Caja, Turnos y Operativa Financiera

#### Tabla `cash_registers`
- `id` (SERIAL, Primary Key)
- `user_id` (INT, Foreign Key -> `users.id`, Not Null): Cajero responsable del turno.
- `opening_amount` (DECIMAL(12,4), Not Null): Fondo inicial de efectivo declarado al abrir la caja.
- `closing_amount` (DECIMAL(12,4), Nullable): Monto final obtenido tras el arqueo ciego.
- `status` (VARCHAR(20), Default: 'OPEN'): Estado de la sesión (OPEN o CLOSED).
- `opened_at` (TIMESTAMP WITH TIME ZONE, Default: CURRENT_TIMESTAMP)
- `closed_at` (TIMESTAMP WITH TIME ZONE, Nullable)

### 6. Módulo de Ventas, POS y Detalle Transaccional

#### Tabla `sales`
- `id` (SERIAL, Primary Key)
- `cash_register_id` (INT, Foreign Key -> `cash_registers.id`, Not Null)
- `user_id` (INT, Foreign Key -> `users.id`, Not Null): Cajero que emitió el ticket.
- `customer_id` (INT, Foreign Key -> `contacts.id`, Nullable): Cliente asociado (requerido para ventas a crédito).
- `subtotal` (DECIMAL(12,4), Not Null)
- `discount` (DECIMAL(12,4), Default: 0.0000)
- `total` (DECIMAL(12,4), Not Null)
- `payment_method` (VARCHAR(30), Not Null): Método principal o categoría de pago (CASH, CARD, QR, MIXED).
- `status` (VARCHAR(20), Default: 'COMPLETED'): Estado del ticket (COMPLETED o VOIDED para anulaciones autorizadas).
- `created_at` (TIMESTAMP WITH TIME ZONE, Default: CURRENT_TIMESTAMP)

#### Tabla `sale_details`
- `id` (SERIAL, Primary Key)
- `sale_id` (INT, Foreign Key -> `sales.id`, Not Null)
- `product_id` (INT, Foreign Key -> `products.id`, Not Null)
- `quantity` (DECIMAL(12,4), Not Null): Cantidad vendida (enteros o decimales fraccionados).
- `unit_price` (DECIMAL(12,4), Not Null): Precio aplicado al momento de la venta.
- `subtotal` (DECIMAL(12,4), Not Null)
- `serial_id` (INT, Foreign Key -> `product_serials.id`, Nullable): Enlace obligatorio si el producto pertenece al sector de electrónica y requiere trazabilidad por IMEI/Serie.

### 7. Módulo de Auditoría e Inalterabilidad de Logs

#### Tabla `audit_logs`
- `id` (SERIAL, Primary Key)
- `user_id` (INT, Foreign Key -> `users.id`, Not Null): Usuario que ejecutó la acción sensible.
- `action` (VARCHAR(100), Not Null): Tipo de evento registrado (ej. VOID_SALE, MANUAL_STOCK_ADJUSTMENT, PRICE_OVERRIDE).
- `details` (JSONB, Not Null): Objeto estructurado que almacena el estado anterior y posterior del cambio para trazabilidad forense.
- `created_at` (TIMESTAMP WITH TIME ZONE, Default: CURRENT_TIMESTAMP)

---

## Paso 7: Diseño de Arquitectura de APIs y Contratos (Versión Exhaustiva y Ampliada)

Especificación técnica profunda de la arquitectura de comunicación entre el frontend de escritorio (Electron/React) y el backend modular (NestJS), detallando middleware de validación, manejo de errores normalizados, y los contratos de datos críticos para soportar la operación síncrona y la sincronización offline-first.

### 1. Estándares Globales y Middleware de la API
- **Validación Estricta de Entradas (DTOs con `class-validator`)**: Cada endpoint del backend debe interceptar el payload mediante pipes de validación que rechacen automáticamente campos no declarados, tipos de datos incorrectos o formatos inválidos antes de tocar la lógica de negocio.
- **Formato de Respuesta Estándar (Envelope Pattern)**:
  Todas las respuestas exitosas de la API deben retornar una estructura JSON predecible:
  ```json
  {
    "success": true,
    "status_code": 200,
    "message": "Operación realizada con éxito",
    "data": { ... }
  }
  ```
- **Manejo Normalizado de Errores (RFC 7807)**:
  Los errores de la API deben estructurarse de manera uniforme para que el cliente (POS) pueda interpretarlos y mostrarlos adecuadamente al cajero:
  ```json
  {
    "success": false,
    "status_code": 400,
    "error": "BAD_REQUEST",
    "message": "El stock disponible es insuficiente para completar la venta.",
    "timestamp": "2026-06-06T14:30:00Z",
    "path": "/api/v1/sales"
  }
  ```

### 2. Catálogo Detallado de Endpoints por Módulo

#### A. Módulo de Autenticación y Sesiones (`/api/v1/auth`)
- `POST /api/v1/auth/login`
  - **Descripción**: Autentica las credenciales del usuario y emite un JWT con sus permisos granulares.
  - **Payload**: `{ "username": "cajero_principal", "password": "secure_password_hash" }`
  - **Respuesta Exitosa (200)**: Retorna el token de acceso, el tiempo de expiración y el perfil de roles (`ADMIN`, `CAJERO`, `ALMACENERO`).
- `POST /api/v1/auth/refresh`
  - **Descripción**: Renueva el token de acceso utilizando un refresh token seguro almacenado en el cliente de escritorio.

#### B. Módulo de Productos e Inventario (`/api/v1/products`)
- `GET /api/v1/products/pos-lookup`
  - **Descripción**: Endpoint ultra optimizado para la barra de búsqueda del POS. Permite filtrar de forma instantánea por código de barras exacto, SKU parcial o nombre.
  - **Query Params**: `q=7750123456789&warehouse_id=1`
  - **Respuesta Exitosa (200)**: Retorna el producto con su tipo (`UNIT`, `FRACTION`, `SERIALIZED`), su precio actual y el stock exacto disponible en esa sucursal.
- `GET /api/v1/products/serials/verify/:sku`
  - **Descripción**: Valida la existencia y estado de un número de serie o IMEI en el sector de electrónica antes de permitir su selección en el ticket de venta.

#### C. Módulo de Caja y Turnos (`/api/v1/cash-registers`)
- `POST /api/v1/cash-registers/open`
  - **Descripción**: Registra la apertura de caja de un turno asignado.
  - **Payload**: `{ "user_id": 3, "warehouse_id": 1, "opening_amount": 200.00 }`
- `POST /api/v1/cash-registers/:id/close`
  - **Descripción**: Ejecuta el cierre o arqueo de caja declarando el conteo físico de cierre.
  - **Payload**: `{ "closing_amount": 1450.50, "notes": "Cierre de turno sin novedades" }`

#### D. Módulo de Ventas y POS (`/api/v1/sales`)
- `POST /api/v1/sales`
  - **Descripción**: Registra una venta completada en línea, afectando de manera atómica el stock y generando el comprobante.
  - **Payload**: Estructura transaccional completa con cabecera de pagos mixtos, desglose de ítems, cantidades fraccionadas y números de serie obligatorios para electrónica.

---

### 3. Contrato Crítico: Sincronización Offline-First (`/api/v1/sync`)

Para garantizar que las ventas efectuadas por la aplicación de escritorio (Electron + SQLite) durante un corte de internet se integren sin fallos al servidor central (PostgreSQL), se define el siguiente contrato masivo:

- `POST /api/v1/sync/batch`
  - **Descripción**: Procesa un lote de transacciones acumuladas en la cola local (`sync_queue`) tras la reconexión a la red.
  - **Payload (Body)**:
    ```json
    {
      "terminal_id": "POS-SUCURSAL-01",
      "sync_batch_id": "uuid-batch-987654",
      "transactions": [
        {
          "local_sale_id": 1042,
          "client_timestamp": "2026-06-06T12:15:30Z",
          "cash_register_id": 2,
          "user_id": 3,
          "customer_id": null,
          "payment_method": "CASH",
          "subtotal": 45.00,
          "discount": 0.00,
          "total": 45.00,
          "items": [
            {
              "product_id": 150,
              "quantity": 1.5000,
              "unit_price": 30.00,
              "subtotal": 45.00,
              "serial_number": null
            }
          ]
        }
      ]
    }
    ```
  - **Respuesta Exitosa (200)**:
    ```json
    {
      "success": true,
      "processed_count": 1,
      "failed_count": 0,
      "sync_batch_id": "uuid-batch-987654",
      "server_timestamp": "2026-06-06T12:45:00Z",
      "errors": []
    }
    ```

---

## Paso 8: Diseños UX/UI, Flujos de Usuario (User Flows) y Sistema de Temas (Claro / Oscuro)

Definición de los recorridos visuales y lógicos (User Flows) que realizarán los diferentes roles (Cajero, Almacenero, Administrador) dentro de la aplicación de escritorio (Electron + React), asegurando una experiencia de usuario ágil, sin fricciones y adaptada tanto a la alta rotación de una bodega como a la precisión técnica de una tienda de electrónica.

### 1. Flujos de Usuario Principales (User Flows)

#### A. Flujo de Autenticación y Despliegue Dinámico por Rol
- **Inicio de Sesión**: El operador abre la aplicación local. Se presenta una pantalla de login limpia que solicita Usuario y Contraseña.
- **Validación de Credenciales**: El backend (o la base de datos local cifrada en modo offline) valida el hash y retorna el token JWT junto con el rol asignado (`ADMIN`, `CAJERO`, `ALMACENERO`).
- **Renderizado del Menú Lateral (Sidebar)**: El frontend adapta dinámicamente las opciones visibles según la matriz de permisos:
  - **Cajero**: Visualiza casi exclusivamente accesos directos al POS y aperturas de caja.
  - **Almacenero**: Visualiza productos, compras, transferencias y ajustes de stock.
  - **Administrador**: Visualiza el menú completo (Dashboard gerencial, usuarios, finanzas, informes, etc.).

#### B. Flujo Crítico de Venta Rápida en el POS (El núcleo del negocio)
- **Apertura de Turno**: Antes de vender, el cajero ingresa el fondo inicial de efectivo. El sistema abre la sesión de caja.
- **Búsqueda o Escaneo de Productos**:
  - El cajero pasa el producto por el escáner de códigos de barras, o utiliza la barra de búsqueda rápida.
  - **Caso Bodega (Fraccionado)**: Si es un producto a granel (ej. queso o cable), el sistema solicita o captura automáticamente el peso/medida decimal.
  - **Caso Electrónica (Trazabilidad)**: Si el producto requiere número de serie (`SERIALIZED`), el sistema interrumpe el flujo de forma obligatoria abriendo un modal flotante para escanear o digitar el código IMEI/Serie del equipo antes de agregarlo al ticket.
- **Gestión del Carrito y Descuentos**: Se acumulan los ítems. Si se requiere un descuento especial, el sistema exige la clave o autorización rápida de un supervisor.
- **Selección de Método de Pago**:
  - El cajero selecciona efectivo, tarjeta, QR o un **Pago Mixto** (ej. parte en efectivo y parte por transferencia).
  - Si el pago es en efectivo, la interfaz muestra de forma grande y clara el cálculo automático del vuelto.
- **Cierre y Ticket**: Se procesa la transacción de forma atómica (actualizando el stock local en SQLite y enviando la cola al servidor si hay red). La impresora térmica emite el ticket automáticamente y se abre la gaveta de dinero.

#### C. Flujo de Control de Inventario y Recepción de Compras (Almacenero)
- **Recepción**: El almacenero ingresa al módulo de Compras/Recepción.
- **Validación Física**: Selecciona la orden de compra pendiente y contrasta la factura del proveedor con la carga física recibida.
- **Ingreso Masivo o de Series**:
  - Si entran smartphones, el sistema habilita campos obligatorios para registrar individualmente cada IMEI asociado a esa compra.
- **Impacto en Kardex**: Al confirmar, el sistema actualiza de manera automática los costos ponderados y eleva el stock disponible en el almacén correspondiente.

---

### 2. Lineamientos de Diseño UX/UI para Entornos POS

- **Optimización Táctil y Teclado (Touch & Keyboard Friendly)**:
  - Botones de acción principal (Cobrar, Cancelar, Buscar) de gran tamaño, accesibles mediante la pantalla táctil o atajos de teclado rápidos (ej. `F1` para cobrar, `F2` para buscar).
- **Contraste y Legibilidad (Modo Operativo Real)**:
  - Interfaz con alta tasa de contraste (fondos limpios, textos oscuros y alertas en colores normalizados: rojo para stock crítico o errores, verde para pagos exitosos) para evitar fatiga visual en turnos largos de caja.
- **Diseño Cero-Latencia Visual**:
  - Uso de esqueletos de carga (*skeletons*) y estados de carga instantáneos para que el cajero nunca perciba bloqueos en la interfaz durante la lectura masiva de códigos de barras.

---

### 3. Especificación del Sistema de Temas (Modo Claro vs. Modo Oscuro Puro)

El sistema cuenta con un conmutador global de temas que adapta instantáneamente la interfaz sin perder legibilidad ni jerarquía visual.

#### A. Versión Clara (Light Theme - Tonos Blancos y Grises Nítidos)
Diseñado para entornos comerciales con alta iluminación ambiental (tiendas de abarrotes, bodegas).
- **Fondo Principal (Background)**: Blanco puro (`#FFFFFF`) y grises sutiles de fondo de contenedor (`#F8F9FA` / `#F1F3F5`) para estructurar los paneles sin saturar la vista.
- **Tipografía y Textos**: Gris muy oscuro / casi negro (`#1A1D20`) para el texto principal y gris medio (`#6C757D`) para textos secundarios o metadatos, asegurando un ratio de contraste óptimo (WCAG AAA).
- **Contenedores y Tarjetas (Cards)**: Superficies blancas elevadas con bordes finos y limpios (`#DEE2E6`) y sombras muy suaves para dar profundidad.
- **Colores de Acción y Estado (Acentos)**:
  - *Primario (Acciones/Botones)*: Azul institucional corporativo (`#0D6EFD`).
  - *Éxito (Cobros / Stock OK)*: Verde esmeralda (`#198754`).
  - *Alerta / Error (Stock mínimo / Anulaciones)*: Rojo carmesí (`#DC3545`).

#### B. Versión Oscura (Dark Theme - Tonos Negro Profundo)
Diseñado para entornos de baja iluminación, cajas nocturnas o talleres de electrónica, evitando el deslumbramiento y reduciendo el consumo energético.
- **Fondo Principal (Background)**: Negro absoluto / tono negro profundo (`#000000` o `#0B0C10`) para el fondo general del sistema, minimizando la emisión de luz de la pantalla.
- **Superficies y Contenedores (Cards)**: Gris ultra oscuro / negro secundario (`#121212` o `#1F2833`) para diferenciar las tarjetas y tablas del fondo general, manteniendo la jerarquía visual.
- **Tipografía y Textos**: Blanco suave o gris muy claro (`#F3F4F6`) para el texto principal, y gris claro atenuado (`#9CA3AF`) para textos secundarios, evitando fatiga visual por deslumbramiento de blanco puro.
- **Colores de Acción y Estado (Acentos adaptados)**:
  - *Primario (Acciones/Botones)*: Azul eléctrico brillante (`#3B82F6`) para destacar sobre fondos oscuros.
  - *Éxito (Cobros / Stock OK)*: Verde brillante vibrante (`#22C55E`).
  - *Alerta / Error (Stock mínimo / Anulaciones)*: Rojo anaranjado de alta visibilidad (`#EF4444`).

---

### 4. Flujos de Usuario Detallados (User Flows) por Módulo

#### A. Flujo de Navegación Dinámica por Rol (Sidebar)
- **Arranque**: El usuario inicia sesión; el frontend evalúa el rol devuelto por el token JWT.
- **Renderizado Condicional**:
  - El Cajero experimenta una interfaz simplificada donde el menú lateral se colapsa automáticamente, priorizando los accesos directos al POS y la apertura/cierre de caja.
  - El Almacenero visualiza los accesos a Inventario, Compras, Transferencias de Stock y Ajustes.
  - El Administrador despliega el menú completo (Dashboard gerencial, Usuarios, Finanzas, Informes y Ajustes del sistema).

#### B. Flujo Crítico de Cobro y Venta en el POS (Optimizado para Velocidad)
- **Acceso al POS**: Pantalla dividida en dos secciones lógicas: Panel izquierdo para la lista de ítems escaneados y totales; Panel derecho para el catálogo rápido por categorías y botones de acción táctil.
- **Lectura / Búsqueda de Productos**:
  - Al pasar un producto por el escáner de códigos de barras, se añade de forma instantánea al carrito (latencia inferior a 200ms).
  - *Ramificación por Tipo de Unidad*:
    - Si es **Fraccionado (bodega)**, se abre un mini-prompt flotante para ingresar el peso exacto en balanza o cantidad decimal.
    - Si es **Serializado (electrónica)**, el sistema bloquea temporalmente la adición y abre un modal obligatorio para capturar el número de serie o IMEI físico antes de continuar.
- **Procesamiento de Pago**:
  - El cajero presiona la tecla de cobro rápido (`F1` o botón táctil grande).
  - Selecciona el método de pago (Efectivo, Tarjeta, QR o Pago Mixto combinando ambos). Si es efectivo, calcula de forma automatizada y en números grandes el vuelto a entregar.
- **Finalización Atómica**: Al confirmar, se imprime el ticket térmico de forma desatendida, se abre la gaveta de dinero por comandos ESC/POS y el stock local en SQLite se descuenta de inmediato.

#### C. Flujo de Control de Inventario y Auditoría (Almacenero / Admin)
- **Ingreso por Compras**: El usuario selecciona el documento del proveedor, valida la carga física contra el sistema y, de tratarse de dispositivos electrónicos, registra en lote los números de serie individuales.
- **Ajustes y Mermas**: Ante una diferencia de inventario o producto dañado, el operador accede a "Ajuste de Stock", selecciona el ítem, introduce la cantidad y escribe obligatoriamente una justificación comercial. El sistema registra el evento en la bitácora de auditoría inalterable (`audit_logs`).

---

## Paso 9: Especificación Técnica y Estructura del Stack Tecnológico Definitivo

Desglose técnico profundo de herramientas, librerías, estructura de directorios y configuración interna del stack seleccionado para construir el POS multifuncional (Offline-First con soporte para Modo Claro y Modo Oscuro).

### 1. Frontend Local (Terminal POS de Escritorio)
- **Framework Principal**: **Electron + Vite + React + TypeScript**
  - **Arquitectura de Procesos**:
    - **Main Process (Node.js)**: Gestiona el ciclo de vida de la ventana, la comunicación directa con los puertos USB/Red para las impresoras térmicas (**ESC/POS**), el acceso al sistema de archivos local y la base de datos SQLite embebida.
    - **Renderer Process (React)**: Interfaz gráfica de usuario optimizada para pantallas táctiles y atajos de teclado rápidos.
- **Gestión de Estilos y Temas (Claro / Oscuro)**: **Tailwind CSS v3/v4**
  - **Configuración**: Implementación mediante la estrategia de clases basada en atributos (`darkMode: 'class'`). Un estado global en React inyecta la clase `dark` en la etiqueta raíz `<html>` para alternar instantáneamente entre los tokens del Modo Claro (fondos blancos puros y grises nítidos) y el Modo Oscuro (tonos negro profundo y grises oscuros).
- **Gestión de Estado del POS**: **Zustand**
  - **Uso**: Almacena en memoria volátil el carrito de compras activo, los datos de la caja abierta, los productos seleccionados y el estado de conectividad a internet en tiempo real.

### 2. Capa de Datos Local (Offline-First)
- **Motor Embebido**: **SQLite** (a través de la librería nativa `better-sqlite3`)
  - **Rendimiento**: Permite ejecuciones sincrónicas ultrarrápidas, ideales para búsquedas de productos en milisegundos sin latencia de red.
  - **Tabla de Cola de Sincronización (`sync_queue`)**: Cada venta efectuada sin internet se almacena localmente en esta tabla con un identificador único y un indicador de estado (`pending`). Un proceso en segundo plano (*background worker*) evalúa la conectividad HTTP cada 30 segundos para vaciar la cola hacia el servidor central.

### 3. Backend Central y Lógica de Negocio
- **Framework del Servidor**: **NestJS (TypeScript)**
  - **Estructura de Módulos (Monolito Modular)**:
    ```
    src/
    ├── modules/
    │   ├── auth/          # Control de usuarios y JWT
    │   ├── products/      # Catálogo maestro, precios y unidades
    │   ├── inventory/     # Kardex, almacenes y transferencias
    │   ├── sales/         # Procesamiento de tickets y POS
    │   ├── cash-registers/# Aperturas, arqueos y turnos
    │   └── sync/          # Endpoints de sincronización offline
    ├── common/            # Filtros de excepción, interceptores y DTOs
    └── main.ts            # Punto de entrada de la aplicación
    ```
- **ORM y Capa de Datos**: **Prisma ORM**
  - **Uso**: Mapeo estricto del esquema relacional hacia PostgreSQL, gestión de migraciones seguras y ejecución de transacciones atómicas (ACID) para proteger el inventario y las cajas contra desajustes financieros.

### 4. Base de Datos Central (Servidor Cloud / Principal)
- **Motor Relacional**: **PostgreSQL**
  - **Configuración Clave**:
    - Uso de tipos de datos `DECIMAL(12,4)` para evitar errores de redondeo en cálculos monetarios y cantidades fraccionadas a granel.
    - Columnas tipo `JSONB` en la tabla de auditoría (`audit_logs`) para almacenar los estados previos y posteriores de modificaciones críticas de precios o anulaciones de ventas.
    - Connection pooling configurado para soportar concurrencia masiva desde múltiples sucursales simultáneamente.

### 5. Integración de Hardware y Periféricos
- **Impresión Térmica**: Librería `node-escpos` conectada vía IPC desde el proceso principal de Electron, enviando comandos hexadecimales directos a impresoras conectadas por USB, Serial o red local (TCP/IP) para el corte de papel y apertura automática de gaveta de dinero.
- **Lectura de Códigos de Barras**: Recepción de eventos de teclado (modo HID) o puerto serie virtual, procesando la cadena de texto y limpiando el buffer de entrada en menos de 10 milisegundos para impactar de inmediato el carrito de ventas en pantalla.

---

## Paso 10: Estrategia DevOps, Entornos y CI/CD (Versión Técnica Avanzada)

Especificación profunda de la infraestructura de control de versiones, contenerización, aislamiento de entornos y automatización de pipelines (CI/CD) orientada a garantizar un ciclo de vida de software seguro, auditable y con despliegues automatizados tanto para el servidor central como para las aplicaciones de escritorio instaladas en las cajas físicas.

### 1. Control de Versiones y Políticas de Ramas (Git Workflow)
Se adopta una variante estricta de Gitflow con Integración Continua para mantener el código ordenado y auditable:
- **Rama `main` (Producción)**: Contiene exclusivamente código estable, validado en entornos de prueba y listo para operar en las tiendas físicas. Está protegida contra escrituras directas (*Branch Protection Rules*); solo acepta fusiones (*merges*) mediante Pull Requests aprobados.
- **Rama `develop` (Integración)**: Rama central de desarrollo donde convergen las características terminadas antes de pasar a la fase de pruebas de estrés y validación general.
- **Ramas `feature/*` (Características)**: Ramas temporales creadas para desarrollar módulos específicos (ej. `feature/offline-sync-queue`, `feature/pos-barcode-scanner`). Se eliminan tras ser fusionadas a `develop`.
- **Ramas `hotfix/*` (Correcciones de Emergencia)**: Creadas directamente desde `main` para resolver fallos críticos en producción, con despliegue inmediato automatizado.

---

### 2. Contenerización y Orquestación de la Infraestructura Central (Docker)
Para eliminar el problema de inconsistencias entre equipos de desarrollo y servidores, todo el entorno del servidor central se ejecuta mediante Docker.

- **Estructura de Orquestación (`docker-compose.yml` para desarrollo/staging)**:
  ```yaml
  version: '3.8'

  services:
    postgres_db:
      image: postgres:15-alpine
      container_name: pos_postgres_core
      environment:
        POSTGRES_USER: pos_admin
        POSTGRES_PASSWORD: secure_password_db
        POSTGRES_DB: pos_central_db
      ports:
        - "5432:5432"
      volumes:
        - pgdata:/var/lib/postgresql/data
      restart: always

    backend_api:
      build:
        context: .
        dockerfile: Dockerfile
      container_name: pos_nestjs_backend
      environment:
        DATABASE_URL: postgresql://pos_admin:secure_password_db@postgres_db:5432/pos_central_db?schema=public
        JWT_SECRET: super_secret_jwt_key_2026
        PORT: 3000
      ports:
        - "3000:3000"
      depends_on:
        - postgres_db
      restart: always

  volumes:
    pgdata:
  ```
- **Persistencia y Volúmenes**: Los datos críticos almacenados en PostgreSQL se vinculan a un volumen físico persistente (`pgdata`) para evitar pérdida de información ante reinicios o actualizaciones de contenedores.

---

### 3. Aislamiento Riguroso de Entornos
- **Entorno de Desarrollo (Development)**: Ejecutado en las máquinas de los ingenieros mediante contenedores locales y recarga en caliente (hot-reload con `nest start --watch` y Vite para el frontend).
- **Entorno de Pruebas / Staging (Staging)**: Servidor espejo al de producción donde se valida la sincronización asíncrona masiva y se realizan pruebas de estrés con múltiples conexiones concurrentes simuladas.
- **Entorno de Producción (Production)**: Servidor central en la nube (o servidor físico principal de la empresa) protegido por reglas de firewall estrictas, donde solo se exponen los puertos de la API REST mediante proxy inverso seguro con terminación SSL/TLS (Nginx).

---

### 4. Automatización de Pruebas y Despliegue (Pipeline CI/CD con GitHub Actions)
Configuración de pipelines automatizados que se disparan ante cada evento en el repositorio de Git:

#### A. Integración Continua (Job de CI)
- **Ejecución de Pruebas y Linting**: Al abrir un Pull Request hacia `develop` o `main`, GitHub Actions ejecuta de forma paralela:
  - Análisis estático de código mediante ESLint y Prettier.
  - Pruebas unitarias e integración de servicios utilizando Jest.
  - Compilación de TypeScript (`tsc --noEmit`) para verificar la ausencia total de errores de tipado.

#### B. Despliegue Continuo (Job de CD para Backend)
- **Build & Push de Imagen Docker**: Si las pruebas pasan con éxito en la rama `main`, el pipeline compila la imagen Docker del backend de NestJS, le asigna una etiqueta con el número de versión semántica y la almacena en un registro privado de contenedores.
- **Actualización Remota del Servidor**: Mediante un comando automatizado vía SSH, el servidor de producción descarga la nueva imagen y reinicia el contenedor sin interrumpir las tablas transaccionales.

#### C. Compilación Automatizada de la App de Escritorio (Electron Builder)
- **Generación de Instaladores Nativos**: El pipeline incluye un job específico para la aplicación de escritorio de las cajas físicas. Mediante `electron-builder`, compila el código de React/Electron y genera automáticamente los instaladores ejecutables (`.exe` optimizado para Windows de las cajas) cada vez que se genera un tag de versión oficial en el repositorio, facilitando su distribución limpia hacia las sucursales.

---

## Paso 11: Planificación de Sprints y Roadmap de Ejecución (Desglose Técnico Detallado)
Desglose exhaustivo de tareas, entregables y criterios de aceptación por cada Sprint de dos semanas para garantizar un desarrollo controlado, sin desvíos de alcance y con validación técnica continua.

### Sprint 0: Configuración de Infraestructura y Arquitectura Base (Semanas 1 y 2) - Blueprint Extendido de Alta Definición

Desglose conceptual y operativo de máxima profundidad para estructurar la infraestructura base del sistema:

#### 1. Delimitación de Módulos del Servidor Central (Monolito Modular)
Cada módulo del backend funciona como un dominio autocontenido para evitar acoplamiento excesivo:
* **Módulo de Autenticidad e Identidad**: Gestiona exclusivamente la validación de credenciales, emisión de credenciales de sesión y control de perfiles.
* **Módulo de Catálogo**: Administra la creación, actualización y consulta de productos, categorías y esquemas de precios.
* **Módulo de Inventario**: Controla los almacenes físicos, las existencias y el registro de movimientos del Kardex.
* **Módulo de Ventas**: Procesa y almacena de forma definitiva los tickets emitidos.
* **Módulo de Cajas**: Administra las aperturas de turno, fondos iniciales, arqueos y egresos operativos.
* **Módulo de Sincronización**: Administra el canal de recepción masiva de datos provenientes de las colas locales de las sucursales.

#### 2. Persistencia y Seguridad en el Servidor Central (PostgreSQL)
* **Aislamiento por Volúmenes Docker**: El motor de base de datos relacional opera dentro de un contenedor aislado con un volumen de almacenamiento persistente montado en el sistema operativo anfitrión. Esto garantiza que ante fallos del contenedor o actualizaciones del servicio de API, los registros financieros, de inventario y de auditoría permanezcan intactos.
* **Control de Versiones de Esquema**: Cualquier modificación en las tablas corporativas (roles, usuarios, sucursales) debe ejecutarse a través de un sistema estricto de migraciones secuenciales, prohibiendo cambios manuales directos en producción.

#### 3. Estructura y Seguridad en la Terminal de Escritorio (Electron + SQLite)
* **Aislamiento de Procesos de Escritorio**:
  * *Proceso Principal*: Administra el ciclo de vida del software, la interacción directa con puertos físicos de hardware (impresoras ESC/POS, balanzas y lectores HID) y el acceso seguro al sistema de archivos local.
  * *Proceso de Renderizado*: Muestra la interfaz gráfica interactiva, gestionando los estados visuales en tiempo real mediante gestores de estado optimizados.
* **Base de Datos Local Embebida**: Cada caja opera con un archivo de base de datos relacional independiente y cifrado localmente, asegurando operaciones ultrarrápidas y autonomía absoluta ante cortes de red.

- **Infraestructura del Servidor Central (Backend)**:
  - Inicialización del repositorio Git con la estructura de Monolito Modular en NestJS y TypeScript.
  - Configuración del archivo `docker-compose.yml` para desplegar PostgreSQL 15 con persistencia de volúmenes y variables de entorno seguras.
  - Configuración inicial de Prisma ORM y ejecución de la migración base para las tablas de infraestructura (`roles`, `users`, `warehouses`).
- **Infraestructura de la Terminal POS (Frontend de Escritorio)**:
  - Creación del boilerplate base con **Electron + Vite + React + TypeScript**.
  - Configuración estricta de **Tailwind CSS** para soportar el sistema de temas dual: inyección dinámica de la clase `dark` para alternar entre el Modo Claro (fondos blancos `#FFFFFF` y grises nítidos) y el Modo Oscuro (tono negro profundo `#000000` y grises de alta opacidad).
  - Instalación y configuración del motor SQLite local mediante la librería nativa `better-sqlite3`.

### Sprint 1: Seguridad, Autenticación y Catálogo Maestro (Semanas 3 y 4) - Blueprint Extendido de Alta Definición

Ampliación exhaustiva de los componentes de seguridad de accesos y la arquitectura lógica del catálogo de productos, manteniendo el enfoque conceptual y operativo sin fragmentos de código.

#### 1. Módulo de Seguridad y Control de Acceso Basado en Roles (RBAC)
* **Protocolo de Derivación de Contraseñas**:
  * Las contraseñas de los usuarios no se almacenan como texto plano. El sistema aplica una función criptográfica de derivación de claves basada en **Argon2id** con un factor de resistencia elevado y una cadena de caracteres aleatorios (*salt*) única por usuario. Esto previene ataques de fuerza bruta y previene filtraciones ante vulnerabilidades de base de datos.
* **Estructura y Carga Útil del Token de Sesión (JWT)**:
  * Tras validar las credenciales, el servidor emite una credencial digital firmada criptográficamente que encapsula:
    * Identificador único del usuario.
    * Rol operativo asignado (`ADMIN`, `CAJERO`, `ALMACENERO`).
    * Identificador del almacén o sucursal autorizada.
    * Marca de tiempo de expiración de la sesión.
* **Interceptación y Validación de Rutas (Guards)**:
  * Cada petición HTTP que llega al servidor central pasa por un filtro de intercepción obligatorio que verifica la validez del token y comprueba si el rol del usuario posee privilegios explícitos sobre el recurso solicitado. Si el rol es insuficiente, la petición es rechazada de inmediato con un código de error estandarizado.

#### 2. Catálogo Maestro, Tipos de Unidades y Reglas de Validación
* **Estructura de Datos del Producto**:
  * *Identificadores*: Código SKU alfanumérico único y código de barras corporativo para lectura láser rápida.
  * *Clasificación de Unidades (`unit_type`)*: Define de manera estricta el comportamiento operativo del artículo en el mostrador:
    * **Unidades Enteras (UNIT)**: El sistema restringe las cantidades exclusivamente a números enteros (ej. unidades de bebidas, abarrotes envasados). No permite decimales en las operaciones de venta ni de inventario.
    * **Unidades Fraccionadas (FRACTION)**: Diseñado para productos a granel o de medida continua (ej. kilogramos, metros). El sistema habilita la captura de valores decimales de alta precisión, calculando de forma proporcional el subtotal y descontando la fracción exacta del inventario local.
    * **Unidades Serializadas (SERIALIZED)**: Exclusivo para electrónica y dispositivos de alto valor. Activa un ciclo de control estricto: la interfaz exige de forma obligatoria la captura de un código IMEI o número de serie único tanto en la recepción de la compra del proveedor como en el momento de procesar la venta en el POS, bloqueando cualquier intento de avanzar sin este requisito.
* **Estrategia de Precios Duales**:
  * El catálogo almacena de forma independiente el costo ponderado, el precio minorista regular y el precio especial para ventas por mayor, asegurando que la terminal local aplique la tarifa correcta de manera transparente durante la selección de los productos en el carrito.

### Sprint 2: El Núcleo del Negocio - Punto de Venta / POS Local (Semanas 5 y 6) - Blueprint Técnico y Funcional Extendido

Planos técnicos detallados para la construcción del motor del punto de venta en la terminal de escritorio (Electron + React + Tailwind), estableciendo los flujos lógicos, reglas de validación y la experiencia interactiva en el mostrador sin fragmentos de código, listos para su desarrollo directo.

#### 1. Interfaz Gráfica y Ergonomía Operativa del POS
* **Distribución del Espacio de Trabajo (Diseño Dual o Táctil)**:
  * *Panel Izquierdo (El Carrito de Compras Activo)*: Muestra de manera secuencial los productos agregados al ticket actual. Cada línea detalla claramente la descripción, cantidad exacta, precio unitario, descuentos aplicados y subtotal. Incorpora tipografía de alto contraste adaptada dinámicamente al sistema de temas (Modo Claro o Modo Oscuro) para prevenir errores visuales.
  * *Panel Derecho (Catálogo Táctil y Accesos Rápidos)*: Contiene botones interactivos de gran formato organizados por categorías visuales para aquellos artículos de alta rotación que carecen de código de barras (ej. panadería, servicios o artículos sueltos), permitiendo su selección con un solo toque en pantallas táctiles.
* **Optimización de Entrada por Periféricos**:
  * *Lector de Códigos de Barras (Modo HID)*: Configurado para capturar de manera instantánea la cadena de texto enviada por la pistola láser, limpiando el búfer e insertando el producto en el carrito en menos de 200 milisegundos.
  * *Atajos de Teclado Universales*: Incorporación de comandos rápidos obligatorios mediante el teclado (ej. activación directa del cobro `F1`, búsqueda avanzada por texto `F2`, anulación de ítems o aplicación rápida de descuentos autorizados).

#### 2. Ciclo de Turnos y Apertura de Caja
* **Validación de Sesión Activa**: Ningún operador puede emitir ventas si no cuenta con una sesión de caja formalmente abierta.
* **Declaración Obligatoria de Fondo Inicial**: El flujo exige al cajero ingresar el monto exacto de efectivo disponible en la gaveta al encender el turno. Este valor se registra como la base financiera inicial indispensable para realizar el arqueo y cierre posterior.

#### 3. Flujos Operativos Especializados por Tipo de Unidad
La interfaz del POS adapta su comportamiento de manera automática según la tipología del producto seleccionado:
* **Gestión de Productos Fraccionados (FRACTION)**:
  * Al seleccionar un artículo a granel, el sistema interrumpe brevemente el flujo estándar abriendo un diálogo flotante de enfoque numérico. Si la terminal está conectada por puerto serie a una báscula electrónica certificada, captura el peso de forma desatendida; de lo contrario, permite el ingreso manual de cantidades decimales de alta precisión, recalculando proporcionalmente el subtotal.
* **Validación Estricta de Productos Serializados (SERIALIZED - Electrónica)**:
  * Ante la selección de un equipo tecnológico o smartphone, la interfaz ejecuta un bloqueo operativo obligatorio. Se despliega un modal flotante que exige la captura del número de serie o IMEI. El sistema realiza una consulta ultra rápida en la base de datos local SQLite para validar que el identificador exista, pertenezca al producto y su estado sea estrictamente disponible (`IN_STOCK`). Si alguna condición falla, el sistema bloquea el cobro y emite una alerta visual en rojo y aviso sonoro.

#### 4. Motor de Liquidación y Pagos Múltiples
* **Desglose de Pagos Mixtos (Mixed Tenders)**:
  * El panel de cobro permite liquidar un ticket combinando múltiples fuentes financieras (ej. una porción en efectivo y el saldo restante mediante transferencia digital o código QR corporativo). La interfaz valida matemáticamente que la suma de los montos cubra exactamente el total del ticket antes de destrabar el botón final de emisión.
* **Cálculo Automatizado de Vuelto en Efectivo**:
  * Al seleccionar pago en efectivo, el cajero introduce el monto recibido por el cliente. La interfaz calcula y muestra en un panel tipográfico gigante el cambio exacto a retornar, eliminando errores de cálculo bajo presión en horas de alta afluencia.

#### 5. Ejecución Transaccional Atómica y Salida de Periféricos
* **Consolidación Atómica Local (SQLite)**:
  * Al confirmar el pago, la aplicación ejecuta la transacción ACID local: se descuenta el stock de forma síncrona, se actualizan los estados de los números de serie a vendidos y se genera el registro inalterable del ticket.
* **Automatización ESC/POS y Gaveta**:
  * Simultáneamente, el proceso principal de Electron emite los comandos de impresión en formato ESC/POS hacia la impresora térmica conectada, ordenando la salida limpia del ticket corporativo y enviando el pulso eléctrico que libera de manera automática la gaveta monedero.
* **Inyección en la Cola de Sincronización (`sync_queue`)**:
  * De forma paralela y silenciosa, el ticket procesado es empaquetado e ingresado en la tabla de retención local, quedando a la espera de que el proceso en segundo plano detecte conectividad para su posterior reconciliación con el servidor central.

#### 6. Gestión Avanzada del Carrito y Operaciones de Ítem
El motor del carrito de compras en el POS no es una simple lista visual, sino una máquina de estados controlada que procesa cada adición con validaciones estrictas:
* **Agrupación Inteligente vs. Líneas Separadas**:
  * Cuando se escanea repetidamente un producto de venta entera (`UNIT`), el sistema agrupa automáticamente las cantidades en una sola línea incrementando el contador, a menos que el producto pertenezca a la categoría serializada (`SERIALIZED`), donde cada unidad exige una línea independiente debido a su número IMEI o de serie único.
* **Modificadores y Descuentos a Nivel de Ítem**:
  * El cajero puede modificar la cantidad de un producto directamente o aplicar un descuento porcentual/monetario sobre un ítem específico.
  * **Control de Autorización**: Si el descuento supera un umbral máximo preestablecido por la administración (ej. mayor al 10%), la interfaz bloquea el flujo y exige la introducción inmediata de una credencial de supervisor (contraseña o PIN) para desbloquear la acción, registrando el evento de manera auditada.
* **Anulación de Líneas Previas al Cobro**:
  * Si un cliente decide no llevar un producto antes de pagar, el cajero puede eliminar el ítem del carrito. El sistema actualiza instantáneamente los subtotales, deshecha la reserva temporal del stock local y, si el ítem era serializado, libera el IMEI para que vuelva a estar disponible en el catálogo de la terminal.

#### 7. Control de Cierre de Turno y Arqueo (Caja)
* **Arqueo Ciego (Blind Count)**:
  * Al finalizar el turno, el cajero no visualiza en pantalla el monto teórico que el sistema calcula que debería haber en la caja. Esto se implementa intencionalmente para forzar un conteo físico real y honesto del efectivo existente en la gaveta.
* **Conciliación y Desviaciones**:
  * Tras introducir el conteo físico por denominaciones de billetes y monedas, el sistema compara el valor real frente al registrado por las ventas acumuladas (restando el fondo inicial y sumando los ingresos o egresos autorizados). Cualquier diferencia (sobrante o faltante) se registra automáticamente con su respectiva desviación en la bitácora financiera del turno para la revisión gerencial.

### Sprint 3: Inventario, Kardex, Compras y Caja (Semanas 7 y 8) - Desglose Operativo y Conceptual Profundo

Ampliación exhaustiva de los procesos lógicos y operativos que rigen el control de existencias, la cadena de suministro, las mermas y la gestión financiera menor de caja, bajo un enfoque estrictamente conceptual y sin fragmentos de código.

#### 1. Kardex Transaccional y Motor de Valuación de Inventarios
El Kardex es el núcleo contable y físico de la operación. Su diseño conceptual garantiza que cada unidad de producto tenga una historia rastreable desde su ingreso hasta su baja definitiva.
* **Valuación por Costo Promedio Ponderado (CPP)**:
  * El sistema calcula de manera automática y dinámica el costo unitario real de los productos cada vez que se registra una nueva compra. Si un lote ingresa a un precio distinto al stock existente, el sistema pondera el valor total del inventario entre las nuevas cantidades, asegurando que el cálculo del margen de utilidad y la valorización financiera de la empresa sean precisos en tiempo real.
* **Tipificación Estricta de Movimientos**:
  * Cada alteración en el stock se clasifica bajo un tipo de movimiento inalterable:
    * *Entradas*: Compras a proveedores, devoluciones de clientes, transferencias de entrada entre sucursales y ajustes positivos por inventario físico.
    * *Salidas*: Ventas en el POS, mermas documentadas, transferencias de salida y ajustes negativos por faltantes.
* **Trazabilidad Multi-Almacén y Tránsito**:
  * Cuando se realiza una transferencia de mercadería entre la tienda principal y un depósito secundario, el sistema genera un estado de "Stock en Tránsito". La mercadería sale del almacén de origen de forma inmediata, pero no ingresa al destino hasta que el responsable de la otra sucursal confirme físicamente su recepción, evitando pérdidas de control logístico.

#### 2. Módulo de Compras, Recepción y Gestión de Proveedores (SRM)
Este bloque administra la relación comercial con los abastecedores y automatiza el ingreso formal de mercadería al inventario.
* **Ciclo de Vida de las Órdenes de Compra**:
  * El proceso inicia con la creación de una orden de compra dirigida al proveedor (incluyendo condiciones comerciales, plazos de crédito y montos). Una vez aprobada por la administración, la orden queda a la espera de la llegada física de la carga.
* **Recepción Parcial y Total de Mercadería**:
  * Al recibir los productos en el depósito, el almacenero contrasta la factura física del proveedor con la orden de compra en pantalla. El sistema permite registrar recepciones parciales (si el proveedor despachó solo una parte del pedido), dejando pendiente el remanente sin alterar los costos ni el historial.
* **Ingreso Masivo de Números de Serie (Sector Electrónica)**:
  * Durante la recepción de equipos tecnológicos o smartphones, el sistema despliega un asistente de escaneo masivo. El almacenero pistola o ingresa uno a uno los códigos IMEI o números de serie. El sistema valida en tiempo real que no existan duplicados en la base de datos central y asigna de forma simultánea el estado operativo disponible (`IN_STOCK`) a cada unidad, vinculándolas formalmente a la factura de compra del proveedor.

#### 3. Control de Mermas, Ajustes Extraordinarios y Auditoría Forense
Las discrepancias entre el stock teórico del sistema y la realidad física del almacén se gestionan a través de un flujo estructurado y auditado.
* **Clasificación Obligatoria de Desviaciones**:
  * Cualquier salida de stock que no provenga de una venta formal exige la selección de una causa justificada:
    * *Dañado / Roto*: Productos inutilizados por accidentes operativos.
    * *Vencido*: Artículos perecederos que han superado su fecha de expiración (especialmente relevante para el segmento de minimarket/bodega).
    * *Consumo Interno*: Retiros autorizados para uso operativo de la empresa.
    * *Sobrante / Faltante por Conteo*: Diferencias detectadas durante inventarios cíclicos o arqueos generales de estantería.
* **Bitácora de Auditoría Inalterable (`audit_logs`)**:
  * Cada ajuste manual de inventario, cambio de precio extraordinario o anulación genera un evento en una bitácora centralizada de alta seguridad. Este registro almacena la identidad del usuario responsable, la hora exacta, la sucursal y un objeto estructurado que detalla el estado del stock "antes" y "después" de la modificación, permitiendo a la gerencia realizar análisis forenses ante cualquier sospecha de merma inusual o fraude interno.

#### 4. Gestión Financiera de Caja y Control de Egresos Menores
La gaveta de efectivo no solo acumula las entradas por ventas; también funciona como una caja chica operativa para solventar urgencias diarias.
* **Flujo Controlado de Salidas de Efectivo (Egresos Menores)**:
  * Ante la necesidad de pagar un gasto menor imprevisto (ej. compra urgente de suministros de limpieza, fletes de envío o viáticos locales), el cajero solicita autorización al supervisor.
* **Validación Documental y Restricción por PIN**:
  * La interfaz exige ingresar un PIN de autorización gerencial, seleccionar la categoría del gasto y adjuntar (o registrar) el número de recibo o factura física del gasto.
* **Impacto Automático en el Arqueo de Cierre**:
  * Los egresos registrados durante el turno son descontados matemáticamente del efectivo teórico que el sistema calcula que debería haber en la gaveta. Al momento del cierre de caja, el arqueo considera estos retiros autorizados, evitando falsas diferencias por faltantes de dinero.

- **Kardex Transaccional y Control de Stock**:
  - Programación de transacciones atómicas (ACID) para asegurar que cada venta descuente de manera síncrona el stock local en SQLite y actualice los registros.
  - Desarrollo del módulo de recepción de compras de proveedores y registro de ajustes de stock por mermas o daños.
  - Implementación de la bitácora de auditoría inalterable (`audit_logs`) para registrar cambios de precios o anulaciones con formato JSONB.
- **Gestión Financiera de Caja**:
  - Módulo de registro de egresos y gastos operativos menores autorizados durante el turno.

### Sprint 4: Arquitectura Offline-First y Sincronización Asíncrona (Semanas 9 y 10) - Desglose Operativo y Conceptual Profundo

Ampliación exhaustiva de los mecanismos lógicos, de resiliencia y de resolución de conflictos que permiten a las terminales de caja operar con absoluta autonomía sin internet y sincronizarse de forma limpia con el servidor central, bajo un enfoque strictly conceptual y sin fragmentos de código.

#### 1. Mecánica Interna de la Cola Local de Transacciones (`sync_queue`)
La gestión de la intermitencia de internet no debe recaer en decisiones manuales del operador. El sistema opera bajo un diseño transparente y automatizado.
* **Aislamiento Transaccional Local**:
  * Cuando se procesa una venta y la terminal detecta la ausencia de conectividad con la nube o el servidor central, la transacción se consolida de forma íntegra en la base de datos local SQLite de la máquina. Paralelamente, el sistema genera un registro contenedor que encapsula toda la estructura de la venta (cabecera, ítems desglosados, series/IMEI de electrónica, impuestos y pagos) y lo deposita en la tabla de retención de sincronización.
* **Priorización y Estado de los Paquetes**:
  * Cada registro dentro de la cola local almacena un estado operativo interno que permite al sistema saber si el ticket se encuentra pendiente de envío (`PENDING`), en proceso de transmisión (`SYNCING`), confirmado por el servidor central (`SYNCED`) o marcado con error tras múltiples intentos fallidos (`FAILED`). Esto garantiza que ningún ticket quede en un limbo contable.

#### 2. Ciclo de Vida y Estrategia del Background Worker
El proceso de sincronización en segundo plano opera de manera autónoma en el sistema operativo de la terminal de escritorio.
* **Monitoreo No Intrusivo de Red**:
  * El servicio en segundo plano evalúa periódicamente la disponibilidad del servidor central mediante pulsos de red ligeros. El cajero nunca percibe bloqueos ni demoras en la interfaz principal del POS mientras el worker evalúa o ejecuta la transmisión en paralelo.
* **Transmisión por Lotes Controlados (Batching)**:
  * Cuando la red se restablece, el worker no intenta enviar todas las transacciones acumuladas en una sola petición gigante que pueda saturar el ancho de banda de la tienda o generar timeouts en el servidor. En su lugar, empaqueta las ventas en lotes secuenciales administrados (ej. paquetes de 50 transacciones por envío).
* **Tolerancia a Interrupciones de Red a Mitad del Lote**:
  * Si la conexión a internet vuelve a caerse justo a mitad de la sincronización de un lote, el sistema detiene el proceso de manera controlada. Las transacciones que ya fueron confirmadas por el servidor central se marcan como sincronizadas localmente, mientras que las restantes se conservan intactas en la cola para reanudar el envío en cuanto la red vuelva a estabilizarse, evitando duplicidades.

#### 3. Reconciliación, Cronología y Prevención de Colisiones en el Servidor Central
La recepción de datos provenientes de múltiples sucursales desconectadas exige reglas estrictas en el servidor central (PostgreSQL) para evitar distorsiones financieras.
* **Preeminencia de la Marca de Tiempo Original (Timestamping)**:
  * Para la contabilidad y el Kardex, el momento en que ocurrió la venta es el instante en que el cajero la imprimió físicamente en la terminal local, no la hora en que el servidor central recibió el paquete de sincronización tras horas de corte de internet. El sistema utiliza esta marca de tiempo original para asentar los registros en los reportes históricos y balances diarios.
* **Idempotencia contra Duplicidad de Tickets**:
  * Para evitar que un fallo intermitente de red provoque que una misma transacción se procese dos veces, el servidor central utiliza identificadores únicos generados en el origen. Si el servidor detecta que un ticket ya fue registrado previamente en su base de datos, descarta el reenvío duplicado y emite una confirmación exitosa al cliente para limpiar su cola local.
* **Descuento de Inventario Multi-Almacén**:
  * Una vez que el servidor central valida y aprueba el lote sincronizado, ejecuta transacciones atómicas que impactan de manera específica las existencias del almacén asignado a esa sucursal, manteniendo la sincronía exacta entre las ventas físicas en tienda y la valorización central del inventario corporativo.

#### 4. Analítica Gerencial y Sistema de Alertas Tempranas
La centralización de los datos sincronizados alimenta de manera inmediata el panel de control del administrador, transformando la información operativa en inteligencia de negocios.
* **Visibilidad Consolidada y Multitienda**:
  * El dashboard gerencial agrupa el rendimiento comercial de todas las sucursales en tiempo real (o tras completarse las sincronizaciones de red), permitiendo visualizar comparativas de ventas diarias, productos de mayor rotación y métodos de pago preferidos por los clientes (efectivo, tarjetas o códigos QR).
* **Mitigación de Quiebres de Stock**:
  * El módulo incorpora un sistema de alertas proactivas que monitorea los niveles de inventario frente a los umbrales mínimos configurados (`min_stock`). El administrador recibe notificaciones visuales inmediatas sobre qué productos están próximos a agotarse, permitiendo coordinar reabastecimientos oportunos con los proveedores antes de que la falta de mercadería afecte las ventas en los puntos de atención.

- **Cola de Transacciones Locales (`sync_queue`)**:
  - Configuración de la tabla espejo en SQLite para almacenar tickets de venta procesados sin conexión a internet.
- **Background Worker de Sincronización**:
  - Desarrollo del servicio en segundo plano en la aplicación de Electron que evalúa el estado de la red cada 30 segundos.
  - Implementación del endpoint masivo `/api/v1/sync/batch` en NestJS para procesar los lotes de ventas pendientes utilizando marcas de tiempo (*timestamps*) para evitar colisiones en PostgreSQL.
- **Dashboard Gerencial Inicial**:
  - Creación de widgets analíticos básicos para visualizar ventas diarias, ticket promedio y alertas de stock mínimo crítico.

### Fase de Ejecución: Sprint 5 (Pruebas de Integración, Hardware y Despliegue Piloto - Blueprint Extendido de Alta Definición)

Desglose técnico, conceptual y operativo exhaustivo de la fase final de validación, asegurando que la terminal de escritorio interactúe de forma impecable con el entorno físico del mostrador, que la arquitectura resista escenarios de fallo extremo y que la llegada a producción sea controlada y segura, sin fragmentos de código.

#### 1. Arquitectura de Integración con Periféricos de Hardware (POS)
El software de escritorio en Electron debe gobernar el mostrador de manera síncrona y robusta, gestionando la comunicación directa con los dispositivos físicos sin depender del navegador web:
* **Subsistema de Impresión Térmica (Protocolo ESC/POS)**:
  * *Traducción de Datos*: La aplicación procesa los datos del ticket de venta (cabecera con datos de la empresa, listado de ítems con cantidades enteras, fraccionadas o series/IMEI, subtotales, impuestos, métodos de pago y código de barras de control) y los compila en tramas de comandos de control estándar (ESC/POS).
  * *Manejo de Excepciones del Periférico*: Antes de disparar la impresión, el proceso principal de Electron consulta el estado bidireccional del dispositivo. Si la impresora reporta falta de papel, tapa abierta o error de conexión, la interfaz bloquea el cierre del ticket y muestra una alerta visual inmediata al cajero, evitando comprobantes incompletos o pérdidas de trazabilidad física.
* **Automatización de la Gaveta Portamonedas**:
  * *Control Electromecánico*: La gaveta de efectivo no se conecta al ordenador, sino al puerto dedicado de la impresora térmica.
  * *Disparador Atómico*: El sistema envía el pulso eléctrico de apertura de manera totalmente desatendida y síncrona, ocurriendo únicamente en el milisegundo exacto en que el cobro es procesado y confirmado en la base de datos local SQLite. Esto elimina aperturas manuales con llave y protege el efectivo del turno.
* **Captura Masiva por Lectores HID (Código de Barras y QR)**:
  * *Gestión del Foco y Búfer*: El lector láser opera como un dispositivo de entrada de teclado virtual (HID). El sistema implementa un sistema global de captura de eventos que intercepta la cadena de texto independientemente del campo de texto donde el cajero tenga el cursor, limpiando el búfer de forma automática tras cada lectura exitosa para garantizar una velocidad de escaneo inferior a 200 milisegundos.
* **Interfacing con Básculas Electrónicas de Mostrador**:
  * *Comunicación Serial / USB*: Para los productos fraccionados (`FRACTION`), la terminal se comunica mediante protocolos de puerto serie virtual con la báscula certificada. Al seleccionar el artículo a granel, el software interroga activamente al puerto y captura el peso exacto en kilogramos o gramos, insertando el valor directamente en el diálogo de cobro y evitando alteraciones o errores de transcripción manual por parte del operador.

#### 2. Ingeniería de Resiliencia, Pruebas de Estrés y Auditoría de Calidad (QA)
Antes de autorizar el despliegue del sistema en un entorno comercial real, la infraestructura y el software se someten a pruebas de presión metódicas:
* **Ingeniería del Caos y Cortes Forzados de Red**:
  * *Simulación de Escenarios Hostiles*: Se ejecutan pruebas donde se interrumpe de forma abrupta el suministro de internet o se desconecta el cable de red de la terminal mientras múltiples cajeros procesan transacciones de manera simultánea. Se verifica que la base de datos local SQLite mantenga la integridad transaccional (ACID) y que la cola de sincronización (`sync_queue`) retenga los paquetes sin pérdida de información ni bloqueos en la interfaz de usuario.
* **Pruebas de Estrés en Sincronización Masiva**:
  * *Simulación de Reconexión Corporativa*: Se simula la reanudación masiva de la red tras horas de operación desconectada en múltiples sucursales, enviando miles de tickets acumulados de forma simultánea al servidor central (PostgreSQL). Se mide el tiempo de respuesta del backend, validando que el motor procese los lotes mediante idempotencia, evite duplicidades y actualice los Kardex sin generar cuellos de botella en la API.
* **Auditoría Estricta de Control de Acceso (RBAC)**:
  * *Pruebas de Penetración Lógica*: Se verifica formalmente que los tokens de sesión y los filtros de ruta (*guards*) impidan de manera infalible que un operador con rol de cajero o almacenero intente acceder a las rutas de configuración gerencial, reportes financieros globales o modificación de catálogos centrales.

#### 3. Protocolo de Despliegue Piloto (Go-Live Controlado)
La puesta en marcha en un entorno real se ejecuta mediante fases controladas para mitigar riesgos comerciales y operativos:
* **Fase de Homologación en Entorno Sandbox (Pruebas de Banco)**:
  * Instalación del ejecutable de escritorio en un equipo aislado dentro de las oficinas centrales para validar la correcta configuración de controladores de impresoras, permisos de puertos seriales y la conectividad inicial con los servicios en la nube.
* **Piloto en Sucursal Real (Operación en Paralelo / Shadow Running)**:
  * Selección estratégica de una tienda física o una caja secundaria de menor riesgo para implementar el nuevo sistema. Durante una semana comercial completa, el personal opera el POS digital manteniendo un registro operativo complementario de respaldo. Esto permite contrastar los cuadres de caja diarios al 100%, certificar que los arqueos son exactos y verificar que el comportamiento del sistema se adapte a la dinámica real del negocio.
* **Despliegue Masivo Automatizado (CI/CD)**:
  * Superado el periodo de prueba piloto sin incidencias críticas, los pipelines automatizados de integración continua compilan, firman digitalmente y distribuyen los nuevos ejecutables limpios directamente a las terminales de todas las sucursales, consolidando la salida a producción definitiva del proyecto.

- **Integración de Hardware Físico (Periféricos)**:
  - Pruebas de comunicación ESC/POS desde el proceso principal de Electron hacia impresoras térmicas físicas (corte automático de papel y apertura de gaveta de dinero).
  - Validación de la lectura de balanzas electrónicas conectadas por puerto serie o USB.
- **Pruebas de Estrés y QA**:
  - Simulación de cortes abruptos de internet durante operaciones masivas en el POS para verificar la integridad de la sincronización asíncrona.
  - Ejecución de pruebas automatizadas con Jest y análisis de seguridad de endpoints.
- **Empaquetado y Distribución**:
  - Configuración de `electron-builder` en GitHub Actions para compilar automáticamente los instaladores ejecutables (`.exe` para Windows de las cajas físicas) y desplegar la versión piloto en sucursales reales.

---

## Componentes Críticos: Worker de Sincronización Offline y Transacciones Atómicas ACID

Desglose técnico ultra detallado y paso a paso del Worker de Sincronización Asíncrona (Offline-First) y el manejo de transacciones atómicas ACID (para SQLite local y PostgreSQL central).

### Componente 1: Lógica del Worker de Sincronización Asíncrona (Offline-First)

El sistema offline-first no depende de llamadas HTTP síncronas al servidor central durante la venta. Todo ocurre de manera local y en segundo plano se encarga de la reconciliación.

#### A. Estructura de la Tabla de Cola Local (`sync_queue` en SQLite)
Cada vez que el cajero efectúa un pago en el POS sin internet, la venta no solo impacta el stock local, sino que se empaqueta e inserta en una tabla de pendientes local:

```sql
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payload_type VARCHAR(50) NOT NULL, -- Ejemplo: 'SALE_TRANSACTION'
    local_id INTEGER NOT NULL,         -- ID interno del ticket en la terminal
    payload_data JSON NOT NULL,        -- Objeto completo de la venta serializado en texto
    attempts INTEGER DEFAULT 0,        -- Intentos fallidos de retransmisión
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'SYNCING', 'SYNCED', 'FAILED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### B. Algoritmo del Background Worker (Proceso en Segundo Plano en Electron)
En el proceso principal de Electron, un servicio se ejecuta cíclicamente (ej. cada 30 segundos) o al detectar un cambio en el estado de red del sistema operativo:

1. **Detección de Conectividad**:
   - Se realiza un ping ligero o un eco HTTP al servidor central (`GET /api/v1/health`).
   - Si hay respuesta exitosa, el worker cambia el estado de la aplicación a `ONLINE` y dispara el proceso de descarga de cola (`processSyncQueue()`).
2. **Extracción por Lotes (Batching)**:
   - El worker extrae un lote de hasta 50 transacciones pendientes de la tabla SQLite local:
     ```sql
     SELECT * FROM sync_queue WHERE status = 'PENDING' LIMIT 50;
     ```
3. **Transmisión Masiva al Servidor Central**:
   - Envía el lote mediante una petición POST segura al backend NestJS:
     ```typescript
     const response = await axios.post('https://api.empresa.com/api/v1/sync/batch', {
       terminal_id: DEVICE_ID,
       batch: pendingItems.map(item => JSON.parse(item.payload_data))
     });
     ```
4. **Reconciliación y Limpieza Local**:
   - *Si el servidor responde 200 OK*: El backend confirma qué IDs locales procesó correctamente. El worker actualiza el estado en SQLite de esos registros a `'SYNCED'` o los elimina físicamente de la cola local para liberar espacio.
   - *Si ocurre un error de red o conflicto (4xx / 5xx)*: El worker incrementa el contador de `attempts`. Si un ítem supera los 5 intentos fallidos, se marca como `'FAILED'` y genera una alerta visual en el dashboard del Administrador para auditoría manual.

---

### Componente 2: Manejo de Transacciones Atómicas ACID

Para evitar desajustes monetarios, mermas fantasma o inventarios en negativo al procesar ventas locales y centralizadas, se implementa el principio ACID (Atomicidad, Consistencia, Aislamiento y Durabilidad).

#### A. Transacción Local en SQLite (Proceso de Venta en la Terminal)
Cuando el cajero presiona "Cobrar", la operación en la base de datos local SQLite debe ser una única transacción atómica. Si falla la lectura del stock o la inserción del detalle, todo se revierte (*rollback*):

```javascript
// Ejemplo implementado mediante better-sqlite3 en Node.js/Electron
const processLocalSale = db.transaction((saleData) => {
  try {
    // 1. Insertar la cabecera de la venta
    const saleStmt = db.prepare(`
      INSERT INTO sales (cash_register_id, user_id, customer_id, total, payment_method, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const saleResult = saleStmt.run(
      saleData.cash_register_id,
      saleData.user_id,
      saleData.customer_id,
      saleData.total,
      saleData.payment_method,
      saleData.timestamp
    );
    const saleId = saleResult.lastInsertRowid;

    // 2. Iterar sobre cada producto del carrito
    for (const item of saleData.items) {
      // 2.1. Validar stock actual local antes de descontar
      const stockCheck = db.prepare('SELECT stock FROM inventory WHERE product_id = ?').get(item.product_id);
      if (!stockCheck || stockCheck.stock < item.quantity) {
        throw new Error(`Stock insuficiente para el producto ID: ${item.product_id}`);
      }

      // 2.2. Descontar stock (Soporta decimales para productos fraccionados)
      db.prepare(`
        UPDATE inventory 
        SET stock = stock - ? 
        WHERE product_id = ?
      `).run(item.quantity, item.product_id);

      // 2.3. Insertar el detalle del ticket
      db.prepare(`
        INSERT INTO sale_details (sale_id, product_id, quantity, unit_price, subtotal, serial_number)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(saleId, item.product_id, item.quantity, item.unit_price, item.subtotal, item.serial_number);

      // 2.4. Si es producto serializado (electrónica), actualizar el estado del IMEI a 'SOLD'
      if (item.serial_number) {
        db.prepare(`
          UPDATE product_serials 
          SET status = 'SOLD' 
          WHERE serial_number = ?
        `).run(item.serial_number);
      }
    }

    // 3. Registrar en la cola de sincronización en la misma transacción atómica
    db.prepare(`
      INSERT INTO sync_queue (payload_type, local_id, payload_data)
      VALUES ('SALE_TRANSACTION', ?, ?)
    `).run(saleId, JSON.stringify({ saleId, ...saleData }));

    return { success: true, saleId };
  } catch (error) {
    // Si cualquier paso falla, la transacción SQLite hace rollback automático
    throw error;
  }
});
```

---

## Paso 12: Estrategia de Pruebas (QA) y Protocolo de Despliegue Piloto (Versión Exhaustiva)

Desglose técnico profundo de los protocolos de aseguramiento de la calidad, escenarios de pruebas de estrés para arquitecturas offline-first y la metodología detallada del despliegue piloto controlado en entorno real.

### 1. Niveles de Pruebas Automatizadas (QA Riguroso)

#### Pruebas Unitarias (Jest)
- **Enfoque**: Cobertura estricta (>85%) en la lógica de negocio del backend (NestJS) y cálculos comerciales del frontend (React).
- **Casos críticos**: Validación de descuentos porcentuales vs. montos fijos, redondeos matemáticos en productos fraccionados a granel (ej. venta de 0.345 kg de un artículo) y aplicación correcta de listas de precios mayoristas según el cliente.

#### Pruebas de Integración y Contrato de API (Supertest)
- **Enfoque**: Validación sistemática de los endpoints del monolito modular.
- **Casos críticos**: Comprobación de que los Guards de NestJS bloqueen peticiones de cajeros intentando acceder a rutas de administración o reportes gerenciales, y verificación de que los códigos de error HTTP sigan strictly el formato estándar (RFC 7807).

#### Pruebas End-to-End en Electron (Playwright)
- **Enfoque**: Simulación de interacciones reales de usuario en la aplicación de escritorio.
- **Casos críticos**: Prueba automatizada del flujo completo de venta: apertura de caja, escaneo de códigos de barras, interrupción obligatoria por inserción de número de serie/IMEI en electrónica, cálculo de vuelto en pago mixto y generación de comandos ESC/POS para la impresora térmica.

---

### 2. Protocolo de Pruebas de Resiliencia (Offline-First QA)

Para garantizar que la aplicación local en SQLite y la sincronización asíncrona no fallen bajo condiciones adversas en tienda, se ejecutan pruebas de estrés específicas:

#### Prueba de Desconexión Abrupta (Chaos Engineering local)
- **Procedimiento**: Con el POS ejecutando una venta activa, se desactiva físicamente la red o se simula un corte total de internet.
- **Criterio de Aceptación**: La interfaz no debe congelarse ni arrojar pantallas de error. El cajero debe poder finalizar el cobro, imprimir el ticket localmente y verificar que la transacción se almacene en la tabla `sync_queue` de SQLite.

#### Prueba de Inyección de Lotes Masivos y Concurrencia
- **Procedimiento**: Se simulan 10 terminales POS operando sin internet durante 4 horas, acumulando un total de 2,000 transacciones. Al restablecer la red, se dispara la sincronización masiva hacia el endpoint `/api/v1/sync/batch`.
- **Criterio de Aceptación**: El servidor central (PostgreSQL) debe procesar el lote mediante transacciones atómicas utilizando las marcas de tiempo (*timestamps*) originales sin generar duplicidad de tickets ni dejar inventarios en negativo.

---

### 3. Protocolo de Despliegue Piloto y Salida a Producción (Go-Live)

Para mitigar riesgos comerciales en el negocio, la implementación se realiza de forma escalonada:

#### Fase A: Pruebas de Banco y Homologación de Hardware (Entorno Sandbox)
- Instalación de la app Electron en un equipo de pruebas interno.
- Calibración y enlace físico de los periféricos: impresoras térmicas (verificación de comandos de corte y apertura de gaveta), lectores de códigos de barras (velocidad de lectura HID) y balanzas electrónicas.

#### Fase B: Piloto Controlado en Sucursal Real (Shadow Running)
- Selección de una sucursal o caja secundaria de menor riesgo comercial.
- Operación en paralelo durante una semana completa: el personal opera el nuevo sistema POS manteniendo un registro de respaldo para contrastar cuadres de caja diarios y verificar que los arqueos cuadren al 100%.

#### Fase C: Despliegue Masivo Automatizado
- Una vez superado el piloto sin incidencias críticas, se distribuye el ejecutable oficial (`.exe`) generado automáticamente por el pipeline de CI/CD (GitHub Actions) hacia el resto de las terminales de la empresa, habilitando la operación simultánea centralizada.

---

## Paso 13: Estimación de Costos de Infraestructura y Plan de Arranque (Contexto Local)

Fase final de estructuración económica y logística para la implementación comercial del sistema POS y ERP, dimensionada para optimizar la rentabilidad operativa y adaptarse a la realidad del mercado boliviano.

### 1. Estimación de Infraestructura Cloud y Servidor Central (Mensual / Anual)
Para albergar el servidor central (NestJS + PostgreSQL + Nginx) con capacidad de consolidar múltiples sucursales:
- **Servidor VPS Cloud (AWS EC2 / DigitalOcean / Linode)**:
  - *Especificaciones mínimas*: 2 vCPU, 4 GB RAM, 80 GB SSD NVMe.
  - *Costo referencial*: Aproximadamente entre **$20 a $40 USD mensuales**, suficiente para manejar catálogos masivos de más de 100,000 SKUs y concurrencia multi-caja.
- **Dominio y Certificado SSL**:
  - Dominio corporativo anual (~$12 USD/año) y certificados de seguridad gratuitos mediante Let's Encrypt (HTTPS/TLS 1.3).

---

### 2. Presupuesto de Hardware por Terminal POS (Caja Física)
Para equipar cada puesto de cobro en tienda con autonomía offline-first (Electron + SQLite):
- **Terminal de Cómputo**: Mini PC de escritorio económica o terminal All-in-One táctil (procesador equivalente a Intel Core i3 / 8GB RAM / SSD 240GB).
- **Periféricos Esenciales**:
  - *Impresora Térmica de Tickets* (80mm con corte automático y puerto USB/Red): Aproximadamente **$80 - $120 USD** por unidad.
  - *Lector de Códigos de Barras* (Láser/Imager USB con base): Aproximadamente **$25 - $45 USD**.
  - *Gaveta de Dinero Metálica* (RJ11 conectada a la impresora): Aproximadamente **$45 - $70 USD**.
  - *Balanza Electrónica* con puerto serial/USB (para productos a granel): Aproximadamente **$150 - $250 USD** (opcional según el tipo de tienda).

---

### 3. Plan de Recursos y Asignación de Desarrollo (Sky Tech)
Para ejecutar el roadmap de 12 semanas (Sprints 0 al 5) de manera eficiente:
- **Líder Técnico / Arquitecto de Software**: Diseño de bases de datos, configuración de contenedores Docker, backend en NestJS y sincronización asíncrona.
- **Desarrollador Frontend / Desktop**: Construcción de la interfaz de Electron + React, gestión de estados con Zustand y diseño adaptable (Modo Claro / Modo Oscuro).
- **Control de Calidad (QA) y Despliegue**: Pruebas de resiliencia offline y configuración de pipelines automatizados en GitHub Actions para la generación de ejecutables nativos (`.exe`).

---

## Paso 14: Operación Continua, Mantenimiento Evolutivo y Escalabilidad a Largo Plazo

Fase final de consolidación del ciclo de vida del software, orientada a garantizar la estabilidad operativa, el soporte técnico estructurado y la evolución tecnológica del sistema POS y ERP tras su despliegue masivo en todas las sucursales, manteniendo un enfoque estrictamente conceptual y sin fragmentos de código.

### 1. Monitoreo, Observabilidad y Salud del Servidor Central
La infraestructura en la nube que sostiene el monolito modular y la base de datos maestra requiere supervisión constante para anticiparse a cuellos de botella o caídas de servicio.
* **Monitoreo de Recursos en Tiempo Real**:
  * Seguimiento continuo de métricas clave de rendimiento en el servidor (uso de CPU, consumo de memoria RAM, latencia de respuestas HTTP y espacio en discos SSD del clúster de bases de datos).
* **Gestión Centralizada de Registros (Logs y Alertas)**:
  * Implementación de sistemas de recolección de errores que notifican de manera inmediata al equipo técnico ante fallos críticos en las peticiones de la API o interrupciones en los servicios de sincronización, permitiendo una respuesta rápida antes de que afecte la operación en tienda.

### 2. Gestión de Actualizaciones y Distribución Remota de Software
Las terminales de escritorio operan localmente en cada caja, por lo que la administración de nuevas versiones debe ser automatizada y transparente.
* **Despliegues Silenciosos y Automáticos**:
  * A través del pipeline de integración continua, cada vez que se libera una mejora o corrección de errores, la aplicación de escritorio detecta la nueva versión disponible en el servidor central y gestiona su descarga en segundo plano, aplicando los cambios de manera limpia sin interrumpir los turnos activos de los cajeros.
* **Versionado Controlado de Esquemas SQLite**:
  * Si una actualización requiere cambios estructurales en la base de datos local de las terminales, el sistema ejecuta migraciones automáticas controladas al iniciar la aplicación, asegurando la compatibilidad con las nuevas funcionalidades del servidor central.

### 3. Soporte Operativo y Auditoría Periódica
La continuidad del negocio depende de protocolos claros de atención a incidencias y control de integridad de los datos.
* **Estrategia de Niveles de Soporte**:
  * *Nivel 1 (Incidencias Operativas)*: Resolución rápida de problemas de usuario en mostrador (bloqueo de sesiones, dudas en flujos de pago o manejo de periféricos).
  * *Nivel 2 (Incidencias Técnicas o de Red)*: Diagnóstico de fallos en la cola de sincronización local (`sync_queue`), revisión de atascos en impresoras térmicas o validación de conectividad de hardware.
* **Auditorías Periódicas de Inventario y Caja**:
  * Ejecución rutinaria de arqueos sorpresivos y conteos físicos cíclicos de estantería para contrastar con los saldos del Kardex, asegurando el control estricto de mermas y previniendo desviaciones financieras.

### 4. Roadmap de Crecimiento y Escalabilidad Futura
Una vez estabilizado el núcleo transaccional del ERP y el POS, el sistema se encuentra preparado para integrar nuevas capacidades estratégicas orientadas al crecimiento del negocio:
* **Adaptación a Normativas Fiscales Locales**:
  * Incorporación de módulos de facturación electrónica obligatoria integrados directamente con los entes de control fiscal correspondientes al mercado de operación.
* **Inteligencia de Negocios y Analítica Avanzada**:
  * Conexión de bases de datos de lectura optimizadas hacia herramientas corporativas de visualización y tableros gerenciales profundos para proyecciones de venta y comportamiento de clientes.
* **Expansión Multi-Sucursal Ilimitada**:
  * Incorporación de nuevas tiendas físicas o bodegas secundarias al ecosistema central sin alterar la arquitectura base, manteniendo la sincronización y el control de inventario unificado en tiempo real.
