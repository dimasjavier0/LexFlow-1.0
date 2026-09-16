Perfecto. Actualizamos la decisión: **LexFlow será un monorepo**, con frontend y backend separados pero compartiendo paquetes. Esto facilita compartir tipos, esquemas Zod y modelos/API contracts.

Te dejo un **contexto listo para pegar en Codex**. Incluye instrucciones para que el agente continúe el desarrollo y tome decisiones pequeñas contigo en vez de reinventar el proyecto.

# LEXFLOW — CONTEXTO MAESTRO PARA CODEX

## INSTRUCCIÓN PRINCIPAL

Estás trabajando en el proyecto **LexFlow**.

Lee todo este documento antes de modificar código.

El objetivo es construir LexFlow de forma incremental, manteniendo una arquitectura simple, mantenible y preparada para evolucionar.

**No reinventes decisiones ya tomadas.**

Si una decisión marcada como DEFINIDA necesita cambiarse, debes explicarlo brevemente y pedir confirmación antes de modificarla.

El usuario quiere avanzar rápido. Evita explicaciones largas y preguntas innecesarias.

Cuando existan varias decisiones pequeñas relacionadas, agrúpalas en una sola pregunta con opciones breves.

---

# 1. PRODUCTO

LexFlow es una plataforma para aprender vocabulario de inglés mediante **inmersión sensorial**.

Principio principal:

```text
Imagen / contexto
        ↓
Audio nativo
        ↓
Palabra escrita en inglés
```

La traducción al español existe como apoyo, pero debe permanecer inicialmente oculta/borrosa.

El usuario puede revelarla cuando quiera.

El objetivo es evitar que la traducción directa sea la asociación principal del aprendizaje.

---

# 2. OBJETIVO DEL MVP

El MVP debe ser deliberadamente pequeño.

El usuario debe poder:

1. Iniciar sesión con Google.
2. Seleccionar nivel.
3. Seleccionar colección.
4. Explorar vocabulario.
5. Ver múltiples imágenes relacionadas con una palabra.
6. Escuchar pronunciación.
7. Ver la palabra escrita.
8. Consultar videos/contexto cuando estén disponibles.
9. Revelar la traducción.
10. Marcar manualmente su estado de aprendizaje.

El MVP comienza con **A1**.

No implementar todavía:

* SRS
* Spaced repetition
* mapas conceptuales
* evaluaciones automáticas complejas
* gamificación compleja
* sistema de puntos
* múltiples niveles completos

---

# 3. FILOSOFÍA DEL APRENDIZAJE

El usuario tiene control sobre su aprendizaje.

Estados:

```text
WANT_TO_LEARN
NOT_INTERESTED
LEARNED
```

UI:

```text
🟠 Quiero aprender
🟣 No me interesa
🟢 Ya la aprendí
```

La intención es que el usuario no sea obligado a repetir palabras que ya conoce.

Al seleccionar un estado, el sistema puede avanzar a la siguiente palabra.

---

# 4. VOCABULARIO

El vocabulario se organiza mediante **colecciones**.

Ejemplos:

```text
Food
Colors
Family
Transportation
Months
Oxford 3000
Oxford 5000
```

Una colección puede contener palabras de diferentes niveles.

Ejemplo:

```text
Food
├── apple       → A1
├── bread       → A1
├── egg         → A1
├── beef        → A1
├── ingredient  → A2
└── cuisine     → B1
```

La UI debe mostrar:

```text
Food
```

y no:

```text
Food A1
Food A2
Food B1
```

El nivel es una clasificación interna/pedagógica.

---

# 5. PANTALLA DE APRENDIZAJE

Conceptualmente:

```text
┌──────────────────────────────┐
│ Food       [traducción]      │
│              borrosa         │
├──────────────────────────────┤
│                              │
│          IMAGEN              │
│                              │
│       ←           →          │
│                              │
├──────────────────────────────┤
│          🔊 Audio            │
│                              │
│            apple             │
├──────────────────────────────┤
│                              │
│          VIDEO               │
│                              │
│       ←           →          │
│                              │
├──────────────────────────────┤
│ 🟠 Quiero aprender           │
│ 🟣 No me interesa            │
│ 🟢 Ya la aprendí             │
└──────────────────────────────┘
```

Características:

* múltiples imágenes por palabra
* navegación izquierda/derecha
* audio
* palabra escrita
* múltiples videos/contextos
* navegación izquierda/derecha
* video opcional
* traducción oculta/borrosa
* traducción revelable

Mantener la interfaz simple.

---

# 6. PLATAFORMA

LexFlow será:

```text
Web
 ↓
PWA
 ↓
Android
 ↓
Google Play Store
```

No desarrollar una aplicación móvil independiente inicialmente.

La misma aplicación frontend será utilizada para web/PWA y posteriormente Android.

---

# 7. STACK DEFINIDO

## Frontend

```text
React
Vite
TypeScript
Tailwind CSS
```

## Backend

```text
Node.js
Express
TypeScript
REST API
MVC
Zod
```

## Base de datos

```text
PostgreSQL
Prisma
```

## Auth

```text
Supabase Auth
Google Login
JWT
```

## Infraestructura

```text
Docker
```

## Control de versiones

```text
Git
GitHub
```

---

# 8. MONOREPO

IMPORTANTE:

La decisión anterior de dos repositorios separados fue reemplazada.

**LexFlow ahora utiliza UN MONOREPO.**

Frontend y backend estarán separados dentro del mismo repositorio y compartirán paquetes.

Arquitectura inicial:

```text
lexflow/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── shared/
│   ├── schemas/
│   └── config/
│
├── docker/
│
├── package.json
├── workspace configuration
├── README.md
└── ...
```

La estructura exacta puede ajustarse durante la implementación, pero debe mantenerse el concepto:

```text
apps/
    web
    api

packages/
    shared
    schemas
    config
```

---

# 9. PAQUETES COMPARTIDOS

El monorepo debe aprovecharse para evitar duplicación.

## shared

Puede contener:

* tipos compartidos
* enums
* constantes
* interfaces
* tipos de API

Ejemplo:

```text
LearningStatus
Collection
Word
MediaResource
```

## schemas

Debe contener schemas Zod compartidos cuando sea apropiado.

Ejemplo:

```text
CreateWordSchema
CreateCollectionSchema
LearningProgressSchema
```

El frontend y backend pueden consumir los mismos schemas.

## config

Puede contener configuraciones compartidas de TypeScript, ESLint u otras herramientas.

No compartir código que genere acoplamiento innecesario entre frontend y backend.

---

# 10. GESTIÓN DEL MONOREPO

Todavía debe decidirse:

```text
npm workspaces
pnpm workspaces
Turborepo
```

No asumir automáticamente una opción si todavía no se ha decidido.

El objetivo es mantener el monorepo simple.

Si una herramienta como Turborepo aporta demasiado overhead para el MVP, preferir una solución más sencilla.

---

# 11. ARQUITECTURA

Arquitectura conceptual:

```text
                 ┌─────────────────────┐
                 │       Usuario       │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   React + Vite      │
                 │ TypeScript/Tailwind │
                 └──────────┬──────────┘
                            │
                       REST + JWT
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Node.js + Express   │
                 │        MVC          │
                 │       Zod           │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │       Prisma        │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │     PostgreSQL      │
                 └─────────────────────┘
```

Auth:

```text
React
  ↓
Supabase Auth
  ↓
Google
  ↓
JWT
  ↓
Express
```

---

# 12. BACKEND

El backend utiliza MVC.

Conceptualmente:

```text
Controller
    ↓
Service
    ↓
Repository / Prisma
    ↓
Database
```

Aunque se haya seleccionado MVC, se permite utilizar una capa `service` para evitar colocar toda la lógica de negocio dentro de controllers.

No hacer una arquitectura excesivamente compleja.

---

# 13. API

REST.

Recursos previstos:

```text
/auth
/collections
/words
/images
/audio
/videos
/progress
/admin
```

Estos nombres son conceptuales y pueden refinarse.

Antes de implementar la API definitiva deben definirse:

* endpoints
* HTTP methods
* request schemas
* response schemas
* status codes
* errores
* autenticación
* autorización
* paginación
* filtros

---

# 14. VALIDACIÓN

Usar **Zod**.

Validar runtime:

* body
* params
* query
* datos externos
* payloads administrativos
* respuestas externas cuando sea necesario

No confiar únicamente en TypeScript.

---

# 15. AUTENTICACIÓN

Proveedor:

```text
Supabase Auth
```

Método:

```text
Google Login
```

No implementar email/password en el MVP.

Backend debe validar correctamente los tokens/JWT recibidos.

---

# 16. ROLES

Dos roles:

```text
USER
ADMIN
```

USER:

* login
* colecciones
* vocabulario
* multimedia
* progreso

ADMIN:

* colecciones
* palabras
* traducciones
* imágenes
* audio
* videos
* recursos externos

---

# 17. PANEL ADMIN

Debe existir un panel administrativo.

Conceptualmente:

```text
Admin Login
      ↓
Dashboard
      ↓
Collections
      ↓
Words
      ↓
Media
      ↓
External Resources
```

El administrador debe poder gestionar contenido sin editar directamente PostgreSQL.

---

# 18. CONTENIDO EXTERNO

LexFlow no tiene contenido multimedia propio inicialmente.

La arquitectura debe permitir almacenar referencias externas.

No asumir que todos los archivos serán subidos a LexFlow.

Los recursos pueden representarse mediante:

```text
url
source
provider
metadata
license
attribution
```

según corresponda.

---

# 19. IMÁGENES

Decisión:

**APIs externas.**

No se ha seleccionado todavía un proveedor definitivo.

Antes de integrarlo investigar:

* API
* autenticación
* límites
* costos
* uso comercial
* licencia
* atribución
* términos de uso

---

# 20. AUDIO

Decisión:

**TTS + APIs externas.**

Todavía no existe proveedor definitivo.

La arquitectura debe permitir:

```text
provider
voice
accent
url
metadata
```

y eventualmente múltiples audios para una palabra.

---

# 21. VIDEOS

Decisión:

**YouGlish + URLs externas.**

Los videos son opcionales.

Una palabra puede tener:

```text
0..N videos
```

La interfaz debe soportarlo.

Antes de implementar una integración específica investigar API, disponibilidad, límites y términos de uso.

---

# 22. GESTIÓN DE RECURSOS

Se necesitan dos modos:

## Manual

```text
Admin
 ↓
URL
 ↓
Source
 ↓
Save
```

## Automático

```text
Admin
 ↓
Search word
 ↓
External API
 ↓
Results
 ↓
Select resource
 ↓
Save
```

Implementar primero el modo manual si permite avanzar más rápido.

La automatización puede venir después.

---

# 23. DATABASE

Entidades iniciales:

```text
User
Collection
Word
Image
Audio
Video
UserWordProgress
```

No asumir que este es el esquema final.

Primero analizar relaciones.

Probablemente existirán relaciones como:

```text
Collection 1 ─── N Word

Word 1 ─── N Image

Word 1 ─── N Audio

Word 1 ─── N Video

User 1 ─── N UserWordProgress

Word 1 ─── N UserWordProgress
```

También debe considerarse la clasificación de nivel:

```text
A1
A2
B1
...
```

pero el MVP solo utilizará A1.

---

# 24. DATABASE — REQUISITOS

Antes de crear el schema definitivo analizar:

* PK
* FK
* índices
* unique constraints
* enums
* timestamps
* soft delete si realmente es necesario
* relaciones
* orden de recursos
* estado de contenido
* fuentes externas
* roles
* progreso

No agregar campos innecesarios.

---

# 25. SEED

Utilizar:

```text
Prisma Seed
```

para datos iniciales.

El seed debe facilitar desarrollo local.

Ejemplo:

```text
Food
 ├── apple
 ├── bread
 ├── egg
 └── beef
```

Los recursos externos reales deben respetar sus respectivas licencias.

---

# 26. DOCKER

Utilizar Docker principalmente para facilitar el entorno local.

Como mínimo considerar:

```text
PostgreSQL
```

El backend puede ejecutarse localmente durante desarrollo si eso simplifica el flujo.

No complicar Docker innecesariamente.

---

# 27. SUPABASE

Supabase se utilizará inicialmente para:

```text
Authentication
```

También puede evaluarse:

```text
Storage
Database hosting
otros servicios
```

pero no utilizar todo Supabase automáticamente.

La aplicación sigue conceptualmente basada en:

```text
PostgreSQL + Prisma
```

---

# 28. PWA

Posteriormente se implementará:

* manifest
* service worker
* instalación
* iconos
* caching
* estrategia offline si tiene sentido

No implementar funcionalidades PWA complejas antes de tener el MVP web funcionando.

---

# 29. ANDROID

El objetivo final es publicar LexFlow en:

```text
Google Play Store
```

La tecnología concreta para empaquetar la PWA todavía NO está decidida.

No introducir Capacitor, Trusted Web Activity u otra solución sin discutirlo primero.

---

# 30. PRINCIPIOS DE ARQUITECTURA

Prioridad:

```text
Simple
↓
Mantenible
↓
Escalable razonablemente
```

Evitar:

* microservicios
* Kubernetes
* CQRS
* event sourcing
* arquitectura distribuida
* complejidad innecesaria

salvo que exista una necesidad real.

---

# 31. SEGURIDAD

Prestar atención a:

* JWT
* Supabase Auth
* autorización por roles
* CORS
* variables de entorno
* secretos
* validación Zod
* URLs externas
* APIs externas
* rate limiting
* sanitización
* manejo de errores

Nunca colocar secretos en:

```text
frontend
Git
GitHub
código fuente
```

---

# 32. VARIABLES DE ENTORNO

Separar:

```text
.env
.env.local
.env.example
```

Nunca subir secretos reales.

Debe existir un `.env.example` documentando las variables necesarias.

---

# 33. FRONTEND

El frontend debe utilizar:

```text
React
Vite
TypeScript
Tailwind CSS
```

Todavía debe decidirse:

* React Router
* React Query/TanStack Query
* estado global
* estrategia de formularios
* estructura de componentes

No agregar librerías innecesarias.

---

# 34. UI/UX

La interfaz debe ser:

* simple
* moderna
* limpia
* enfocada en aprendizaje
* responsive
* mobile-first

El MVP no necesita una interfaz excesivamente compleja.

---

# 35. FLUJO PRINCIPAL

```text
Login
  ↓
Home
  ↓
Seleccionar nivel
  ↓
Seleccionar colección
  ↓
Aprendizaje
  ↓
Palabra
  ↓
Imagen
  ↓
Audio
  ↓
Palabra escrita
  ↓
Video opcional
  ↓
Estado del usuario
  ↓
Siguiente palabra
```

---

# 36. FLUJO ADMIN

```text
Login
  ↓
Dashboard
  ↓
Collections
  ↓
Collection
  ↓
Words
  ↓
Word
  ↓
Media
  ↓
External Resources
```

---

# 37. DECISIONES PENDIENTES

Estas decisiones todavía deben tomarse.

## Monorepo

Elegir:

```text
A) npm workspaces
B) pnpm workspaces
C) Turborepo
```

## Frontend

Elegir:

```text
A) React Router
B) otra solución
```

## Data fetching

Elegir:

```text
A) TanStack Query
B) fetch
C) otra
```

## Estado

Elegir:

```text
A) Context
B) Zustand
C) otra
```

## Formularios

Elegir:

```text
A) React Hook Form
B) otra
```

## API documentation

Elegir:

```text
A) OpenAPI/Swagger
B) no inicialmente
```

## Logging

Elegir:

```text
A) Pino
B) consola inicialmente
```

## Testing

Definir:

```text
unit
integration
E2E
```

y las herramientas.

## Image provider

Investigar opciones actuales.

## TTS provider

Investigar opciones actuales.

## YouGlish integration

Investigar disponibilidad/API actual y términos.

## PWA

Definir estrategia.

## Android

Definir empaquetado para Google Play.

## Deployment

Definir posteriormente:

```text
Frontend
Backend
Database
Storage
Auth
```

---

# 38. ORDEN DE IMPLEMENTACIÓN

El agente debe avanzar aproximadamente así:

```text
1. Revisar entorno
2. Crear/validar monorepo
3. Configurar workspaces
4. Crear apps/web
5. Crear apps/api
6. Crear packages/shared
7. Crear packages/schemas
8. Crear packages/config
9. Configurar TypeScript
10. Configurar ESLint/Prettier
11. Configurar Docker
12. Levantar PostgreSQL
13. Configurar Prisma
14. Diseñar schema
15. Crear migración
16. Crear seed
17. Crear Express
18. Crear estructura MVC
19. Configurar Zod
20. Implementar manejo de errores
21. Implementar Supabase Auth
22. Google Login
23. Verificación JWT
24. Roles
25. Crear API
26. Crear frontend
27. Conectar frontend/API
28. Panel Admin
29. Recursos externos
30. Learning UI
31. User progress
32. Testing
33. PWA
34. Deployment
35. Android
36. Google Play
```

El orden puede cambiar si una dependencia técnica lo requiere.

---

# 39. METODOLOGÍA CON EL USUARIO

El usuario quiere trabajar directamente con Codex.

El usuario ejecutará comandos y verificará resultados.

Por lo tanto:

```text
Agente propone
      ↓
Usuario ejecuta
      ↓
Usuario comparte resultado
      ↓
Agente verifica
      ↓
Siguiente paso
```

Pero evitar detenerse por detalles triviales.

Si el agente puede resolver algo de manera segura sin pedir confirmación, debe hacerlo.

---

# 40. REGLA PARA DECISIONES

Hay dos tipos de decisiones.

## Ya decididas

No preguntar nuevamente.

Ejemplos:

```text
React
Vite
TypeScript
Tailwind
Node
Express
PostgreSQL
Prisma
REST
MVC
Zod
Supabase Auth
Google Login
JWT
Docker
Monorepo
GitHub
Admin
External resources
A1 MVP
```

## Pendientes

Preguntar antes de establecerlas cuando afecten arquitectura.

---

# 41. REGLA PARA CAMBIOS

Si encuentras una mejor solución técnica:

1. Explica el problema en pocas líneas.
2. Explica la alternativa.
3. Indica impacto.
4. Pide aprobación si cambia una decisión definida.

No cambiar silenciosamente decisiones arquitectónicas.

---

# 42. ESTILO DE RESPUESTA DEL AGENTE

El usuario prefiere respuestas:

* breves
* prácticas
* directas
* agrupadas
* con opciones
* orientadas a ejecutar

Evitar explicaciones teóricas largas.

Preferir:

```text
### Decisión

1. A) ...
   B) ...
   C) ...

2. A) ...
   B) ...
   C) ...

Respóndeme: 1A, 2B
```

Cuando ya exista una decisión:

```text
✅ Decidido

Ahora ejecuta:

comando

Después dime el resultado.
```

---

# 43. ESTADO ACTUAL

Definido:

```text
PRODUCTO                  ✅
MVP                       ✅
A1                        ✅
METODOLOGÍA               ✅
REACT                     ✅
VITE                      ✅
TYPESCRIPT                ✅
TAILWIND                  ✅
NODE                      ✅
EXPRESS                   ✅
REST                      ✅
MVC                       ✅
ZOD                       ✅
POSTGRESQL                ✅
PRISMA                    ✅
DOCKER                    ✅
SUPABASE AUTH             ✅
GOOGLE LOGIN              ✅
JWT                       ✅
ROLES                     ✅
ADMIN PANEL               ✅
RECURSOS EXTERNOS         ✅
IMÁGENES EXTERNAS         ✅
TTS/APIs AUDIO            ✅
YOUGLISH/VIDEO            ✅
PRISMA SEED               ✅
MONOREPO                   ✅
SHARED PACKAGES           ✅
```

Pendiente:

```text
WORKSPACE TOOL
FRONTEND ROUTING
DATA FETCHING
STATE MANAGEMENT
FORMS
DATABASE SCHEMA FINAL
API CONTRACT
EXTERNAL PROVIDERS
TESTING
PWA
DEPLOYMENT
ANDROID
GOOGLE PLAY
```

---

# 44. PRIMERA TAREA DEL AGENTE

Antes de implementar funcionalidades, inspecciona el proyecto actual.

Determina:

1. Sistema operativo.
2. Node.js instalado.
3. npm/pnpm disponible.
4. Docker disponible.
5. Git disponible.
6. Estado actual del repositorio.
7. Estructura existente.
8. Si existe código previo de LexFlow.

Después presenta un resumen corto.

**No borres código existente ni reinicies el proyecto automáticamente.**

Si el repositorio está vacío, comenzar la configuración del monorepo.

Primera decisión pendiente:

```text
A) npm workspaces
B) pnpm workspaces
C) Turborepo
```

Recomienda una opción, pero deja la decisión final al usuario.

---

# 45. OBJETIVO FINAL

El objetivo es terminar una aplicación funcional:

```text
                    LEXFLOW
                       │
                       ▼
                 Google Login
                       │
                       ▼
                    Home
                       │
                       ▼
                 Seleccionar A1
                       │
                       ▼
                 Seleccionar Food
                       │
                       ▼
              ┌─────────────────┐
              │      apple      │
              │                 │
              │     🖼️          │
              │                 │
              │      🔊         │
              │                 │
              │      apple      │
              │                 │
              │    🎬 video     │
              └─────────────────┘
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
           🟠         🟣       🟢
        Aprender   No quiero   Aprendí
                       │
                       ▼
                 Siguiente palabra
```

Y un administrador debe poder mantener el contenido desde:

```text
Admin
 ↓
Collections
 ↓
Words
 ↓
Images / Audio / Videos
 ↓
External resources
```

La prioridad es:

**funcionalidad real > complejidad arquitectónica.**

Con este documento, **Codex debería tener suficiente contexto para continuar sin reconstruir toda nuestra conversación**.

---

# 46. DECISIONES IMPLEMENTADAS

## Monorepo

```text
npm workspaces
```

## Frontend

```text
React Router
React Context para estado global inicial
React Hook Form + Zod para formularios
```

## Datos

```text
fetch nativo para el MVP
TanStack Query se evaluará para una segunda versión
```

## Registro de cambios

Todo cambio relevante debe agregarse también a `CHANGELOG.md`.

## Estado de implementación (2026-09-14)

```text
Base monorepo                 ✅
Git inicializado              ✅
Apps web y API creadas        ✅
Paquetes compartidos creados  ✅
Esqueleto web/API creado      ✅
Validación TypeScript         ✅
Web y API arrancan localmente ✅
Docker y PostgreSQL local       ✅
Puerto PostgreSQL local: 5433  ✅
Base de datos / Prisma        ✅
Schema Prisma inicial creado  ✅
Prisma ORM 7 + Node 24        ✅
Schema Prisma validado         ✅
Prisma Client generado         ✅
Migración y seed              ✅
Auth Supabase                 pendiente
```
