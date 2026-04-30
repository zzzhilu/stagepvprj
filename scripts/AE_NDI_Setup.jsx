/*
 * AE NDI Preview Lock Script
 * ===========================
 * Find "NDI_OUT" comp, open and lock its viewer.
 *
 * Prerequisites (manual one-time setup):
 *   1. Edit > Preferences > Video Preview > Enable Mercury Transmit
 *   2. Check NDI Output
 *   3. Uncheck "Disable video output when in the background"
 *
 * Usage: File > Scripts > Run Script File
 *
 * Note: Mercury Transmit / NDI follows the active viewer.
 *       This script locks the viewer, but if you click another comp
 *       the NDI output will follow. Keep NDI_OUT viewer active.
 */

(function() {

    var COMP_NAME = "NDI_OUT";

    var comp = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.item(i) instanceof CompItem &&
            app.project.item(i).name === COMP_NAME) {
            comp = app.project.item(i);
            break;
        }
    }

    if (!comp) {
        alert("Cannot find composition \"" + COMP_NAME + "\".\nPlease create it first.",
              "NDI Preview Lock");
        return;
    }

    var viewer = comp.openInViewer();
    if (!viewer) {
        alert("Cannot open Viewer.", "NDI Preview Lock");
        return;
    }

    viewer.locked = true;
    viewer.setActive();

    alert("\"" + COMP_NAME + "\" viewer opened and locked.\n\n" +
          "NDI output follows the active viewer.\n" +
          "Keep this viewer active for NDI output.",
          "NDI Preview Lock");

})();
