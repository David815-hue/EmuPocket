# GBC Web Prototype

Prototipo de emulador Game Boy / Game Boy Color en la web con:

- carga local de ROM `.gb`, `.gbc` y `.gba`
- controles por teclado
- consola virtual mas pulida y botones fisicos clicables
- overlay contextual para menus tipo Pokemon
- panel de configuracion persistente
- selector manual de sistema (`Auto`, `GB/GBC`, `GBA`)
- skin visual y overlay diferenciados por sistema
- cheats RAM simples (`direccion = valor`)
- save states en `localStorage`
- fullscreen

## Ejecutar

```bash
npm run serve
```

Luego abre:

```text
http://127.0.0.1:4173
```

## Controles

- Flechas: cruceta
- Z: A
- X: B
- Enter: Start
- Backspace: Select
- A: L en modo GBA
- S: R en modo GBA
- F: fullscreen

## Notas

- La ROM no se incluye. Debes cargar una propia desde el navegador.
- Puedes dejar el sistema en `Auto` o forzar `GB/GBC` o `GBA` desde la interfaz; el modo elegido tambien cambia la carcasa visual.
- El overlay de mouse ahora tiene variantes distintas para `GB/GBC` y `GBA`, con comandos y ayudas diferentes segun la familia de consola.
- Los cheats implementados son simples parches de memoria RAM y no un parser completo de GameShark/Game Genie.
- En GB/GBC los slots guardan `save states`; en GBA los slots guardan `SRAM` del juego.
- El core integrado fue adaptado localmente desde `vendor/gameboy-online`.
