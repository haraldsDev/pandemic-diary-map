// Global mode registry. Mode files call `registerMode({ ... })`.
// This file MUST be loaded before any mode JS files.
var __PD_MODES = {};
function registerMode(mode) {
    if (!mode || !mode.key) throw new Error("Mode must have a `key`");
    if (!mode.label) throw new Error("Mode must have a `label`");
    __PD_MODES[String(mode.key)] = mode;
}

