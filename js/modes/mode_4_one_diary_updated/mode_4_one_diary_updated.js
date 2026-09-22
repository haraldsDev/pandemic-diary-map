var MODE4_DIARY_RUNIN_DAYS = 2;
var MODE4_LAST_DAY_HOLD_MS = 1000;

function mode4_getTopPlacesForDiary(app, did, n) {
    var counts = {};
    var features = app.allFeatures || [];
    for (var i = 0; i < features.length; i++) {
        var f = features[i];
        if (String(f.properties.diary_id) !== String(did)) continue;
        var name = f.properties.place_name || "";
        if (!name) continue;
        counts[name] = (counts[name] || 0) + 1;
    }
    var arr = Object.keys(counts).map(function(k) { return {name: k, count: counts[k]}; });
    arr.sort(function(a, b) { return b.count - a.count; });
    return arr.slice(0, n);
}

function mode4_getDiaryAllDateScope(app, did) {
    if (typeof diaryDailyActivity !== "undefined" && diaryDailyActivity && diaryDailyActivity[did] && diaryDailyActivity[did].length) {
        var arr = (diaryDailyActivity[did] || []).slice().sort();
        return { first: arr[0], last: arr[arr.length - 1] };
    }
    var dm = app.diaryMeta[did] || null;
    if (dm && dm.first_date && dm.last_date) return { first: dm.first_date, last: dm.last_date };
    return { first: null, last: null };
}

function mode4_buildDaySequenceHtml(app, did) {
    if (typeof diaryDailyActivity === "undefined" || !diaryDailyActivity || !diaryDailyActivity[did]) {
        return "";
    }
    var activeDays = (diaryDailyActivity[did] || []).slice().sort();
    if (!activeDays.length) return "";

    var maxDots = 30;
    var shown = activeDays.slice(0, maxDots);
    var hiddenCount = Math.max(0, activeDays.length - shown.length);

    var dotsHtml = '';
    for (var i = 0; i < shown.length; i++) {
        var day = shown[i];
        var hasGeo = !!(app.diaryGeoCountByDate[did] && app.diaryGeoCountByDate[did][day] > 0);
        var clr = hasGeo ? '#2d8a4e' : '#9a9a9a';
        var lbl = hasGeo ? 'geo' : 'non-geo';
        dotsHtml += '<span title="' + day + ' (' + lbl + ')" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + clr + ';"></span>';
    }

    return (
        '<div style="margin:8px 0 2px;">' +
            '<div style="font-size:12px;color:#666;line-height:1.2;margin-bottom:3px;">Day sequence (left to right):</div>' +
            '<div style="display:grid;grid-template-columns:repeat(10, 9px);grid-auto-rows:9px;gap:3px;justify-content:start;">' + dotsHtml + '</div>' +
            (hiddenCount > 0 ? ('<div style="font-size:12px;color:#666;margin-top:3px;">+' + hiddenCount + ' more days</div>') : '') +
        '</div>'
    );
}

function mode4_buildTotalsPanelHtml(app, did) {
    var dm = app.diaryMeta[did] || null;
    if (!dm) return null;
    var top10 = mode4_getTopPlacesForDiary(app, did, 10);
    var allActiveDays = 0;
    if (typeof diaryDailyActivity !== "undefined" && diaryDailyActivity && diaryDailyActivity[did]) {
        allActiveDays = (diaryDailyActivity[did] || []).length;
    } else {
        allActiveDays = dm.active_geo_days || 0;
    }
    var geoDays = dm.active_geo_days || 0;
    var nonGeoDays = Math.max(0, allActiveDays - geoDays);
    var daySeqHtml = mode4_buildDaySequenceHtml(app, did);
    var topHtml = '';
    for (var i = 0; i < top10.length; i++) {
        topHtml += '<div style="font-size:13px;line-height:1.25;margin:2px 0;">' + (i + 1) + '. ' + top10[i].name + ' (' + top10[i].count + ')</div>';
    }
    return (
        '<h1>TOTALS</h1>' +
        '<div style="margin-top:6px;">' +
            '<div style="font-size:18px;line-height:1.2;"><b>' + dm.total_geo_entries + '</b> geolocations total</div>' +
            '<div style="font-size:16px;line-height:1.25;margin-top:4px;"><b>' + dm.unique_places + '</b> unique places</div>' +
            (daySeqHtml ? daySeqHtml : '<div style="font-size:12px;color:#666;line-height:1.2;margin-top:6px;">No activity sequence available.</div>') +
            '<div style="font-size:12px;color:#666;line-height:1.2;">' +
                '<div><span style="color:#2d8a4e">green</span>: <b>' + geoDays + '</b> geolocated days;</div>' +
                '<div><span style="color:#777">grey</span>: <b>' + nonGeoDays + '</b> active non-geo days.</div>' +
            '</div>' +
            (topHtml ? ('<div style="font-size:15px;line-height:1.25;margin-top:8px;"><b>Top places (10):</b></div>' + topHtml) : '') +
        '</div>'
    );
}

registerMode({
    key: "mode_4",
    label: "Mode 4 – ONE diary UPDATED",
    supportsDiarySelect: true,
    rightStackPanelClass: "right-stack-panel-mode4",
    getPanelHtml: function(app, isoDate) {
        return PDPanelRenderers.renderOneDiary(app, isoDate, { getTopPlacesForDiary: mode4_getTopPlacesForDiary });
    },
    getSecondaryRightPanelStyle: function(app) {
        if (!(app.modeArtifacts && app.modeArtifacts.mode4_showTotals)) return null;
        return "padding:10px 14px;text-align:left;";
    },
    getSecondaryRightPanelHtml: function(app) {
        if (!(app.modeArtifacts && app.modeArtifacts.mode4_showTotals)) return null;
        var did = String(app.state.selectedDiaryId || "");
        return mode4_buildTotalsPanelHtml(app, did);
    },
    enter: function(app) {
        app.clearModeArtifacts();

        var did = app.chooseRandomDiaryId();
        app.setSelectedDiaryId(did);

        startMode4Sequence(app);
    },
    onDiaryChange: function(app, newDiaryId) {
        app.setSelectedDiaryId(newDiaryId);
        startMode4Sequence(app);
    },
    exit: function(app) {
        mode4StopPlayback(app);
        mode4RestorePlayerControls(app);
        if (app.modeArtifacts.mode4_timeLoadHandler) {
            app.map.timeDimension.off('timeload', app.modeArtifacts.mode4_timeLoadHandler);
            app.modeArtifacts.mode4_timeLoadHandler = null;
        }
        app.clearModeArtifacts();
    }
});

function mode4RestorePlayerControls(app) {
    // v3 basic ticker phase: mode 4 does not patch global player methods.
    app.modeArtifacts.mode4_originalPlayerStart = null;
    app.modeArtifacts.mode4_originalPlayerStop = null;
    app.modeArtifacts.mode4_manualPaused = false;
}

function mode4StopPlayback(app) {
    if (app && app.clearNativePlaybackTimers) app.clearNativePlaybackTimers();
    app.modeArtifacts.mode4_tickToken = (app.modeArtifacts.mode4_tickToken || 0) + 1;
    if (app.playback && app.playback.manualInterval) {
        clearInterval(app.playback.manualInterval);
        app.playback.manualInterval = null;
    }
    if (app.playback && app.playback.driver === "manual") {
        app.playback.driver = null;
    }
    if (app.modeArtifacts.mode4_manualTimeout) {
        clearTimeout(app.modeArtifacts.mode4_manualTimeout);
        app.modeArtifacts.mode4_manualTimeout = null;
    }
    if (app.modeArtifacts.mode4_manualInterval) {
        clearInterval(app.modeArtifacts.mode4_manualInterval);
        app.modeArtifacts.mode4_manualInterval = null;
    }
    if (app.modeArtifacts.endHoldTimer) {
        clearTimeout(app.modeArtifacts.endHoldTimer);
        app.modeArtifacts.endHoldTimer = null;
    }
    if (app.playback && app.playback.driver === "timedimension" && app.stopPlayer) {
        app.stopPlayer();
        app.playback.driver = null;
    }
    app.modeArtifacts.mode4_manualPaused = false;
}

function mode4_triggerTotals(app) {
    if (!app || !app.state || app.state.modeKey !== "mode_4") return;
    if (app.modeArtifacts.mode4_showTotals) return;
    var did = String(app.state.selectedDiaryId || "");
    var diaryFeatures = app.allFeatures.filter(function(f) {
        return String(f.properties.diary_id) === did;
    });
    mode4StopPlayback(app);
    app.setStaticOverlayFeatures(diaryFeatures);
    app.modeArtifacts.mode4_showTotals = true;
    app.modeArtifacts.mode4_phase = "done";
    if (app.refreshUi) app.refreshUi();
}

function mode4_onTimeLoad(app) {
    if (!app || !app.state || app.state.modeKey !== "mode_4") return;
    if (!app.modeArtifacts || app.modeArtifacts.mode4_phase !== "timeline") return;
    if (app.modeArtifacts.mode4_showTotals) return;
    var td = app.map && app.map.timeDimension;
    if (!td || !td._availableTimes || !td._availableTimes.length) return;
    var cur = td.getCurrentTime();
    var lastTime = td._availableTimes[td._availableTimes.length - 1];
    if (cur === lastTime) {
        app.stopPlayer();
        if (app.playback) app.playback.driver = null;
        if (app.modeArtifacts.endHoldTimer) {
            clearTimeout(app.modeArtifacts.endHoldTimer);
            app.modeArtifacts.endHoldTimer = null;
        }
        var sessionToken = app.modeArtifacts.sessionToken;
        app.modeArtifacts.endHoldTimer = setTimeout(function() {
            if (!app.modeArtifacts || app.modeArtifacts.sessionToken !== sessionToken) return;
            if (!app.state || app.state.modeKey !== "mode_4") return;
            mode4_triggerTotals(app);
        }, MODE4_LAST_DAY_HOLD_MS);
    }
}

function startMode4Sequence(app) {
    mode4StopPlayback(app);
    mode4RestorePlayerControls(app);
    if (app.modeArtifacts.mode4_timeLoadHandler) {
        app.map.timeDimension.off('timeload', app.modeArtifacts.mode4_timeLoadHandler);
        app.modeArtifacts.mode4_timeLoadHandler = null;
    }
    app.clearModeArtifacts();
    app.stopPlayer();
    if (app.modeArtifacts) app.modeArtifacts.mode4_showTotals = false;
    if (app.modeArtifacts) app.modeArtifacts.mode4_phase = "timeline";

    var did = String(app.state.selectedDiaryId || "");
    var dm = app.diaryMeta[did];
    var scope = mode4_getDiaryAllDateScope(app, did);
    if (!dm || !scope.first || !scope.last) {
        app.setTimedFeatures(app.allFeatures);
        app.nudgeToStartAndAutoplay();
        return;
    }

    var b = app.diaryBounds[did];
    if (b && b.isValid && b.isValid()) {
        if (b.getSouthWest().equals(b.getNorthEast())) {
            app.map.setView(b.getCenter(), 7, {animate: true});
        } else {
            app.map.fitBounds(b, {padding: [40, 40], maxZoom: 7, animate: true});
        }
    }

    var diaryFeatures = app.allFeatures.filter(function(f) {
        return String(f.properties.diary_id) === did;
    });

    var runInStart = app.clampIsoToMapRange(app.addDaysToIso(scope.first, -MODE4_DIARY_RUNIN_DAYS));
    app.setAvailableTimesRange(runInStart, scope.last);
    app.setTimedFeatures(diaryFeatures);
    app.setCurrentIso(runInStart);
    app.modeArtifacts.mode4_timeLoadHandler = function() { mode4_onTimeLoad(app); };
    app.map.timeDimension.on('timeload', app.modeArtifacts.mode4_timeLoadHandler);

    app.startTimeDimensionAutoplay(runInStart, "mode_4");
}
