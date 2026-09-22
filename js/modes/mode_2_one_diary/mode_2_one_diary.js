// Mode 3 "cinematic" settings live here (mode-specific).
var MODE3_DIARY_RUNIN_DAYS = 2;
var MODE3_LAST_DAY_HOLD_MS = 1000;

function mode3_getTopPlacesForDiary(app, did, n) {
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

function mode3_getDiaryAllDateScope(app, did) {
    if (typeof diaryDailyActivity !== "undefined" && diaryDailyActivity && diaryDailyActivity[did] && diaryDailyActivity[did].length) {
        var arr = (diaryDailyActivity[did] || []).slice().sort();
        return { first: arr[0], last: arr[arr.length - 1] };
    }
    var dm = app.diaryMeta[did] || null;
    if (dm && dm.first_date && dm.last_date) return { first: dm.first_date, last: dm.last_date };
    return { first: null, last: null };
}

function mode3_buildDaySequenceHtml(app, did) {
    if (typeof diaryDailyActivity === "undefined" || !diaryDailyActivity || !diaryDailyActivity[did]) {
        return "";
    }
    var activeDays = (diaryDailyActivity[did] || []).slice().sort();
    if (!activeDays.length) return "";

    var maxDots = 30; // 3 lines x 10 dots
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

registerMode({
    key: "mode_2",
    label: "Mode 2 – ONE diary",
    supportsDiarySelect: true,
    getPanelHtml: function(app, isoDate) {
        return PDPanelRenderers.renderOneDiary(app, isoDate, { getTopPlacesForDiary: mode3_getTopPlacesForDiary });
    },
    getClockBoxStyle: function(app, isoDate) {
        var showTotals = !!(app.modeArtifacts && app.modeArtifacts.mode3_showTotals);
        if (!showTotals) return "";
        // ~50% wider than default yearbox (150px -> ~230px)
        return "width:230px;padding:10px 14px;text-align:left;";
    },
    getClockHeadlineHtml: function(app, isoDate) {
        var showTotals = !!(app.modeArtifacts && app.modeArtifacts.mode3_showTotals);
        if (!showTotals) return null;
        return '<h1>TOTALS</h1>';
    },
    getClockSubtitleHtml: function(app, isoDate) {
        var did = String(app.state.selectedDiaryId || "");
        var dm = app.diaryMeta[did] || null;
        var showTotals = !!(app.modeArtifacts && app.modeArtifacts.mode3_showTotals);
        if (showTotals && dm) {
            var top10 = mode3_getTopPlacesForDiary(app, did, 10);
            var allActiveDays = 0;
            if (typeof diaryDailyActivity !== "undefined" && diaryDailyActivity && diaryDailyActivity[did]) {
                allActiveDays = (diaryDailyActivity[did] || []).length;
            } else {
                allActiveDays = dm.active_geo_days || 0;
            }
            var geoDays = dm.active_geo_days || 0;
            var nonGeoDays = Math.max(0, allActiveDays - geoDays);
            var daySeqHtml = mode3_buildDaySequenceHtml(app, did);
            var topHtml = '';
            for (var i = 0; i < top10.length; i++) {
                topHtml += '<div style="font-size:13px;line-height:1.25;margin:2px 0;">' + (i + 1) + '. ' + top10[i].name + ' (' + top10[i].count + ')</div>';
            }
            return (
                '<div style="margin-top:6px;">' +
                    '<div style="font-size:18px;line-height:1.2;"><b>' + dm.total_geo_entries + '</b> geolocations total</div>' +
                    '<div style="font-size:16px;line-height:1.25;margin-top:4px;"><b>' + dm.unique_places + '</b> unique places</div>' +
                    (daySeqHtml ? daySeqHtml : '<div style="font-size:12px;color:#666;line-height:1.2;margin-top:6px;">No activity sequence available.</div>') +
                    '<div style="font-size:12px;color:#666;line-height:1.2;">' +
                        'green: <b>' + geoDays + '</b> geolocated days, grey: <b>' + nonGeoDays + '</b> active non-geo days' +
                    '</div>' +
                    (topHtml ? ('<div style="font-size:15px;line-height:1.25;margin-top:8px;"><b>Top places (10):</b></div>' + topHtml) : '') +
                '</div>'
            );
        }
        return null;
    },
    enter: function(app) {
        app.clearModeArtifacts();

        // Pick a random diary every time we enter Mode 3.
        var did = app.chooseRandomDiaryId();
        app.setSelectedDiaryId(did);

        startMode3Sequence(app);
    },
    onDiaryChange: function(app, newDiaryId) {
        app.setSelectedDiaryId(newDiaryId);
        startMode3Sequence(app);
    },
    exit: function(app) {
        mode3StopPlayback(app);
        mode3RestorePlayerControls(app);
        if (app.modeArtifacts.mode3_timeLoadHandler) {
            app.map.timeDimension.off('timeload', app.modeArtifacts.mode3_timeLoadHandler);
            app.modeArtifacts.mode3_timeLoadHandler = null;
        }
        app.clearModeArtifacts();
    }
});

function mode3RestorePlayerControls(app) {
    // v3 basic ticker phase: mode 2 does not patch global player methods.
    app.modeArtifacts.mode3_originalPlayerStart = null;
    app.modeArtifacts.mode3_originalPlayerStop = null;
    app.modeArtifacts.mode3_manualPaused = false;
}

function mode3StopPlayback(app) {
    // Invalidate any running ticker loop and stop native autoplay if active.
    if (app && app.clearNativePlaybackTimers) app.clearNativePlaybackTimers();
    app.modeArtifacts.mode3_tickToken = (app.modeArtifacts.mode3_tickToken || 0) + 1;
    if (app.playback && app.playback.manualInterval) {
        clearInterval(app.playback.manualInterval);
        app.playback.manualInterval = null;
    }
    if (app.playback && app.playback.driver === "manual") {
        app.playback.driver = null;
    }
    if (app.modeArtifacts.mode3_manualTimeout) {
        clearTimeout(app.modeArtifacts.mode3_manualTimeout);
        app.modeArtifacts.mode3_manualTimeout = null;
    }
    if (app.modeArtifacts.mode3_manualInterval) {
        clearInterval(app.modeArtifacts.mode3_manualInterval);
        app.modeArtifacts.mode3_manualInterval = null;
    }
    if (app.modeArtifacts.endHoldTimer) {
        clearTimeout(app.modeArtifacts.endHoldTimer);
        app.modeArtifacts.endHoldTimer = null;
    }
    if (app.playback && app.playback.driver === "timedimension" && app.stopPlayer) {
        app.stopPlayer();
        app.playback.driver = null;
    }
    app.modeArtifacts.mode3_manualPaused = false;
}

function mode3_triggerTotals(app) {
    if (!app || !app.state || app.state.modeKey !== "mode_2") return;
    if (app.modeArtifacts.mode3_showTotals) return;
    var did = String(app.state.selectedDiaryId || "");
    var diaryFeatures = app.allFeatures.filter(function(f) {
        return String(f.properties.diary_id) === did;
    });
    mode3StopPlayback(app);
    app.setStaticOverlayFeatures(diaryFeatures);
    app.modeArtifacts.mode3_showTotals = true;
    if (app.refreshUi) app.refreshUi();
}

function mode3_onTimeLoad(app) {
    if (!app || !app.state || app.state.modeKey !== "mode_2") return;
    if (!app.modeArtifacts || app.modeArtifacts.mode3_phase !== "timeline") return;
    if (app.modeArtifacts.mode3_showTotals) return;
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
            if (!app.state || app.state.modeKey !== "mode_2") return;
            mode3_triggerTotals(app);
        }, MODE3_LAST_DAY_HOLD_MS);
    }
}

function startMode3Sequence(app) {
    mode3StopPlayback(app);
    mode3RestorePlayerControls(app);
    // Remove previous timeload listener if any.
    if (app.modeArtifacts.mode3_timeLoadHandler) {
        app.map.timeDimension.off('timeload', app.modeArtifacts.mode3_timeLoadHandler);
        app.modeArtifacts.mode3_timeLoadHandler = null;
    }
    app.clearModeArtifacts();
    app.stopPlayer();
    if (app.modeArtifacts) app.modeArtifacts.mode3_showTotals = false;
    if (app.modeArtifacts) app.modeArtifacts.mode3_phase = "timeline";

    var did = String(app.state.selectedDiaryId || "");
    var dm = app.diaryMeta[did];
    var scope = mode3_getDiaryAllDateScope(app, did);
    if (!dm || !scope.first || !scope.last) {
        app.setTimedFeatures(app.allFeatures);
        app.nudgeToStartAndAutoplay();
        return;
    }

    // Fit map bounds to diary.
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
    var runInStart = app.clampIsoToMapRange(app.addDaysToIso(scope.first, -MODE3_DIARY_RUNIN_DAYS));
    app.setAvailableTimesRange(runInStart, scope.last);
    app.setTimedFeatures(diaryFeatures);
    app.setCurrentIso(runInStart);

    // Listen for slider-drag-to-end (catches what the manual ticker misses).
    app.modeArtifacts.mode3_timeLoadHandler = function() { mode3_onTimeLoad(app); };
    app.map.timeDimension.on('timeload', app.modeArtifacts.mode3_timeLoadHandler);

    app.startTimeDimensionAutoplay(runInStart, "mode_2");
}

