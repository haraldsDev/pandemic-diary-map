registerMode({
    key: "mode_1",
    label: "Mode 1 – ALL diaries",
    supportsDiarySelect: false,
    getPanelHtml: function(app, isoDate) {
        var s = app.getStats(isoDate);
        return PDPanelRenderers.renderAllDiaries(app, isoDate, s);
    },
    enter: function(app) {
        app.clearModeArtifacts();
        if (app.clearNativePlaybackTimers) app.clearNativePlaybackTimers();
        app.resetDefaultViewport();
        app.setSelectedDiaryId(app.state.selectedDiaryId);
        app.setTimedFeatures(app.allFeatures);
        app.setBaselineAvailableTimes();
        app.startTimeDimensionAutoplay(MAP_TIME_START, "mode_1");
    },
    exit: function(app) {
        app.clearModeArtifacts();
    }
});

