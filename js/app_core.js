// =============================================
// Core plumbing (mode-agnostic)
// =============================================

// Map-wide timeframe (global, not mode-specific).
var MAP_TIME_START = "2020-02-01";
var MAP_TIME_END = "2021-11-01";

// Playback debug helper — keep false in production.
var PD_DEBUG_PLAYBACK = false;
function pdLogPlayback(label) {
    if (!PD_DEBUG_PLAYBACK) return;
    var td = (typeof map !== "undefined") && map && map.timeDimension;
    var p = (typeof getTimePlayer === "function") ? getTimePlayer() : null;
    console.log("[PD playback]", label, {
        mode:             (typeof app !== "undefined") && app.state && app.state.modeKey,
        driver:           (typeof app !== "undefined") && app.playback && app.playback.driver,
        hasManualInterval:!!(typeof app !== "undefined" && app.playback && app.playback.manualInterval),
        currentIso:       td && td.getCurrentTime ? (function(ts){ var d=new Date(ts); return d.getUTCFullYear()+'-'+('0'+(d.getUTCMonth()+1)).slice(-2)+'-'+('0'+d.getUTCDate()).slice(-2); })(td.getCurrentTime()) : null,
        availableTimesLen:td && td._availableTimes ? td._availableTimes.length : null,
        playerExists:     !!p,
        sessionToken:     (typeof app !== "undefined") && app.modeArtifacts && app.modeArtifacts.sessionToken
    });
}

// Default viewport (used by "all diaries" modes).
var DEFAULT_VIEW_CENTER = [54, 12];
var DEFAULT_VIEW_ZOOM = 4;

// =============================================
// Map initialization
// =============================================
var map = L.map('map', {
    zoom: 4,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionOptions: {
        timeInterval: MAP_TIME_START + "/" + MAP_TIME_END,
        period: "P1D",
    },
    timeDimensionControl: true,
    timeDimensionControlOptions: {
        position: 'bottomleft',
        loopButton: 'true',
        autoPlay: true,
        minSpeed: 1,
        maxSpeed: 20,
        speedStep: 1,
        limitSliders: true,
        timeSliderDragUpdate: true,
        playerOptions: {
            transitionTime: 1000,
            loop: false,
            startOver: true,
        }
    },
    center: [54, 12]
}).setView(DEFAULT_VIEW_CENTER, DEFAULT_VIEW_ZOOM);

// Strip hours/minutes from TimeDimension control display
var observer = new MutationObserver(function() {
    var el = document.querySelector('.timecontrol-date');
    if (el && el.textContent.indexOf('T') !== -1) {
        el.textContent = el.textContent.split('T')[0];
    }
});
observer.observe(document.getElementById('map'), {childList: true, subtree: true, characterData: true});

// OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Coordinate display on mouse hover
L.control.coordinates({
    position: "bottomleft",
    decimals: 2,
    decimalSeperator: ",",
    labelTemplateLat: "Lat: {y}",
    labelTemplateLng: "Lng: {x}"
}).addTo(map);

// =============================================
// Shared utilities (mode-agnostic)
// =============================================
function getColor(presence) {
    if (presence === "present") return "#2d8a4e";
    if (presence === "not_present") return "#999";
    return "#2d8a4e";
}

function isoFromTimestamp(ts) {
    var d = new Date(ts);
    var yyyy = d.getUTCFullYear();
    var mm = ('0' + (d.getUTCMonth() + 1)).slice(-2);
    var dd = ('0' + d.getUTCDate()).slice(-2);
    return yyyy + '-' + mm + '-' + dd;
}

function formatDate(iso) {
    var parts = iso.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0] + '.';
}

function addDaysToIso(iso, daysDelta) {
    var d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + daysDelta);
    var yyyy = d.getUTCFullYear();
    var mm = ('0' + (d.getUTCMonth() + 1)).slice(-2);
    var dd = ('0' + d.getUTCDate()).slice(-2);
    return yyyy + '-' + mm + '-' + dd;
}

function clampIsoToMapRange(iso) {
    if (iso < MAP_TIME_START) return MAP_TIME_START;
    if (iso > MAP_TIME_END) return MAP_TIME_END;
    return iso;
}

function getStats(iso) {
    return dailyStats[iso] || {total_entries: 0, geo_mentions: 0, active_diarists: 0, geo_diarists: 0, cumul_all: 0, cumul_geo: 0};
}

// Sorted list of all dates in stats
var allStatsDates = Object.keys(dailyStats).sort();

function getCumulative(iso) {
    if (dailyStats[iso]) return {all: dailyStats[iso].cumul_all, geo: dailyStats[iso].cumul_geo};
    for (var i = allStatsDates.length - 1; i >= 0; i--) {
        if (allStatsDates[i] <= iso) {
            return {all: dailyStats[allStatsDates[i]].cumul_all, geo: dailyStats[allStatsDates[i]].cumul_geo};
        }
    }
    return {all: 0, geo: 0};
}

function getLastNDays(iso, n) {
    var result = [];
    var d = new Date(iso + 'T00:00:00Z');
    for (var i = n - 1; i >= 0; i--) {
        var prev = new Date(d);
        prev.setUTCDate(prev.getUTCDate() - i);
        var y = prev.getUTCFullYear();
        var m = ('0' + (prev.getUTCMonth() + 1)).slice(-2);
        var day = ('0' + prev.getUTCDate()).slice(-2);
        result.push(y + '-' + m + '-' + day);
    }
    return result;
}

function barRow(label, geo, total, scale) {
    var geoW = scale > 0 ? Math.round((geo / scale) * 100) : 0;
    var nongeoW = scale > 0 ? Math.round(((total - geo) / scale) * 100) : 0;
    return '<div class="bar-row">' +
        '<span class="bar-label">' + label + '</span>' +
        '<span class="bar-track">' +
            '<span class="bar-geo" style="width:' + geoW + '%"></span>' +
            '<span class="bar-nongeo" style="width:' + nongeoW + '%"></span>' +
        '</span>' +
        '<span class="bar-count">' + total + '</span>' +
    '</div>';
}

function buildGeoJsonLayer(features) {
    return L.geoJSON({type: "FeatureCollection", features: features}, {
        onEachFeature: function (feature, layer) {
            var p = feature.properties;
            layer.bindPopup(
                '<p>' +
                '<strong>' + p.place_name + '</strong>' +
                '<br>Date: ' + p.date_iso +
                '<br>Diary: ' + p.diary_id +
                '<br><br><em>' + p.snippet + '</em>' +
                '</p>'
            );
        },
        pointToLayer: function(feature, latLng) {
            var presence = feature.properties.author_presence || "present";
            return L.circleMarker(latLng, {
                radius: 6,
                fillColor: getColor(presence),
                color: "#333",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.75,
            });
        }
    });
}

function getTopPlaces(isoDate, n) {
    var counts = {};
    for (var i = 0; i < allStatsDates.length; i++) {
        var dt = allStatsDates[i];
        if (dt > isoDate) break;
        if (placeMentionsByDate[dt]) {
            for (var place in placeMentionsByDate[dt]) {
                counts[place] = (counts[place] || 0) + placeMentionsByDate[dt][place];
            }
        }
    }
    var sorted = Object.keys(counts).map(function(p) { return {name: p, count: counts[p]}; });
    sorted.sort(function(a, b) { return b.count - a.count; });
    return sorted.slice(0, n);
}

function getTimePlayer() {
    if (!map.timeDimension || !map.timeDimension.getPlayer) return null;
    return map.timeDimension.getPlayer();
}
function captureNativeTimePlayerMethods() {
    var p = getTimePlayer();
    if (!p || typeof app === "undefined" || !app.playback) return;
    // Capture the real TimeDimension methods ONCE, bound to the player instance so
    // every future call site gets the correct `this` regardless of invocation pattern.
    if (!app.playback.nativePlayerStart && typeof p.start === "function") {
        app.playback.nativePlayerStart = p.start.bind(p);
    }
    if (!app.playback.nativePlayerStop && typeof p.stop === "function") {
        app.playback.nativePlayerStop = p.stop.bind(p);
    }
}
function restoreTimePlayerHard() {
    var p = getTimePlayer();
    if (!p) return;
    if (typeof app !== "undefined" && app.playback) {
        if (!app.playback.nativePlayerStart || !app.playback.nativePlayerStop) {
            captureNativeTimePlayerMethods();
        }
        if (app.playback.nativePlayerStart) p.start = app.playback.nativePlayerStart;
        if (app.playback.nativePlayerStop) p.stop = app.playback.nativePlayerStop;
    }
    p.__pdBaseStart = null;
    p.__pdBaseStop = null;
    p.__pdWrappedByOneDiary = false;
}

/** Hard-reset TimeDimension player internals after end-of-range or stop; does not start playback. */
function forceResetTimeDimensionPlayer() {
    captureNativeTimePlayerMethods();
    restoreTimePlayerHard();
    var p = getTimePlayer();
    if (!p) return;
    // nativePlayerStop is bound to the original player instance — call directly.
    if (typeof app !== "undefined" && app.playback && app.playback.nativePlayerStop) {
        try { app.playback.nativePlayerStop(); } catch (eStop) { /* ignore */ }
    } else if (typeof p.stop === "function") {
        try { p.stop(); } catch (eStop2) { /* ignore */ }
    }
    try {
        p._playing = false;
        p._waitingForNextTarget = false;
        if (p._timer != null && p._timer !== undefined) {
            clearTimeout(p._timer);
            clearInterval(p._timer);
            p._timer = null;
        }
    } catch (eFlags) { /* ignore: library version may differ */ }
}

function startPlayer() {
    captureNativeTimePlayerMethods();
    restoreTimePlayerHard();
    // nativePlayerStart is bound to the original player instance — call directly.
    if (typeof app !== "undefined" && app.playback && app.playback.nativePlayerStart) {
        app.playback.nativePlayerStart();
    } else {
        var p = getTimePlayer();
        if (p && typeof p.start === "function") p.start();
    }
}
function stopPlayer() {
    forceResetTimeDimensionPlayer();
}

function playbackGuardOk(expectedModeKey, sessionToken) {
    if (typeof app === "undefined" || !app || !app.playback) return false;
    if (app.modeArtifacts && sessionToken !== null && app.modeArtifacts.sessionToken !== sessionToken) return false;
    if (expectedModeKey && (!app.state || app.state.modeKey !== expectedModeKey)) return false;
    if (app.playback.driver !== "timedimension") return false;
    return true;
}

function findTimeDimensionPlayButton() {
    var selectors = [
        ".leaflet-control-timecontrol.timecontrol-play",
        ".leaflet-control-timecontrol a.timecontrol-play",
        ".timecontrol-play"
    ];
    for (var i = 0; i < selectors.length; i++) {
        var el = document.querySelector(selectors[i]);
        if (el) return el;
    }
    var container = document.querySelector(".leaflet-control-timecontrol");
    if (container) {
        var links = container.querySelectorAll("a.timecontrol-play");
        if (links.length) return links[0];
    }
    return null;
}

function isTimeDimensionPlayerPlaying() {
    var p = getTimePlayer();
    if (p) {
        if (typeof p.isPlaying === "function") {
            try { if (p.isPlaying()) return true; } catch (ePlay) { /* ignore */ }
        }
        if (p._playing === true) return true;
    }
    var btn = findTimeDimensionPlayButton();
    if (btn && btn.classList && btn.classList.contains("pause")) return true;
    return false;
}

// =============================================
// Playback contract (single driver owned by core)
// =============================================
function ensureTimeDimensionTicking(startIso, opts) {
    if (!app || !app.playback) return;
    var startDelayMs = (opts && typeof opts.startDelayMs === "number") ? opts.startDelayMs : 50;
    var expectedModeKey = (opts && opts.expectedModeKey) ? String(opts.expectedModeKey) : null;
    var startTs = startIso ? Date.parse(startIso + "T00:00:00Z") : null;

    app.clearNativePlaybackTimers();

    forceResetTimeDimensionPlayer();

    var td = map.timeDimension;
    if (startIso && td && td.setCurrentTime) {
        td.setCurrentTime(Date.parse(startIso + "T00:00:00Z"));
    }
    if (td && td._availableTimes && td._availableTimes.length > 1 && startTs != null && td.getCurrentTime) {
        var lastT = td._availableTimes[td._availableTimes.length - 1];
        if (td.getCurrentTime() === lastT) {
            td.setCurrentTime(td._availableTimes[0]);
        }
    }
    if (app.state && startIso) {
        app.state.currentIsoDate = startIso;
    }

    var before = td && td.getCurrentTime ? td.getCurrentTime() : null;
    var sessionToken = (app && app.modeArtifacts) ? app.modeArtifacts.sessionToken : null;

    function guardOk() {
        return playbackGuardOk(expectedModeKey, sessionToken);
    }

    function applyStartTime() {
        if (startIso && map.timeDimension && map.timeDimension.setCurrentTime) {
            map.timeDimension.setCurrentTime(Date.parse(startIso + "T00:00:00Z"));
        }
        if (app.state && startIso) {
            app.state.currentIsoDate = startIso;
        }
    }

    function doNativeStart() {
        if (!guardOk()) return;
        forceResetTimeDimensionPlayer();
        applyStartTime();
        pdLogPlayback("ensureTimeDimensionTicking native start");
        // nativePlayerStart is bound to the original player — call directly, no .call() needed.
        if (app.playback.nativePlayerStart) {
            app.playback.nativePlayerStart();
        } else {
            var player = getTimePlayer();
            if (player && typeof player.start === "function") player.start();
        }
    }

    pdLogPlayback("ensureTimeDimensionTicking scheduled start token=" + sessionToken);
    app.playback.nativeStartTimer = setTimeout(function() {
        app.playback.nativeStartTimer = null;
        if (!guardOk()) return;
        doNativeStart();
    }, startDelayMs);

    // Quick retry: after end-of-range, player can stay "stopped" until flags/timer are cleared.
    app.playback.nativeWatchdogTimer = setTimeout(function() {
        app.playback.nativeWatchdogTimer = null;
        if (!guardOk()) return;
        var td2 = map.timeDimension;
        if (!td2 || !td2.getCurrentTime || startTs == null) return;
        var afterQuick = td2.getCurrentTime();
        var playerQuick = getTimePlayer();
        var stuckAtStart = afterQuick === startTs;
        var notRunning = !playerQuick || playerQuick._playing === false;
        if (stuckAtStart && notRunning) {
            pdLogPlayback("ensureTimeDimensionTicking 500ms stuck-at-start retry");
            doNativeStart();
        }
    }, 500);

    // Stall watchdog: if the time index never advanced after ~1.2s, retry once.
    app.playback.nativeStallWatchdogTimer = setTimeout(function() {
        app.playback.nativeStallWatchdogTimer = null;
        if (!guardOk()) return;
        var td3 = map.timeDimension;
        if (!td3 || !td3.getCurrentTime) return;
        var after = td3.getCurrentTime();
        if (before !== null && after === before) {
            pdLogPlayback("ensureTimeDimensionTicking 1200ms stall retry");
            forceResetTimeDimensionPlayer();
            if (startIso && td3.setCurrentTime) td3.setCurrentTime(Date.parse(startIso + "T00:00:00Z"));
            if (app.state && startIso) app.state.currentIsoDate = startIso;
            app.playback.nativeStartTimer = setTimeout(function() {
                app.playback.nativeStartTimer = null;
                if (!guardOk()) return;
                doNativeStart();
            }, startDelayMs);
        }
    }, 1200);
}

// =============================================
// Data indices (mode-agnostic; derived from loaded data)
// =============================================
var allFeatures = diaryData.features || [];
var uniqueDiaryIds = Array.from(new Set(allFeatures.map(function(f) {
    return String(f.properties.diary_id);
}))).sort();

function chooseRandomDiaryId() {
    if (!uniqueDiaryIds.length) return "";
    var idx = Math.floor(Math.random() * uniqueDiaryIds.length);
    return uniqueDiaryIds[idx];
}

function getDiaryDisplayLabel(diaryId) {
    var did = String(diaryId);
    var label = (typeof diaryLabels !== "undefined" && diaryLabels && diaryLabels[did]) ? diaryLabels[did] : "";
    return label ? (label + " &mdash; " + did) : did;
}

// Max active diarists (scale)
var maxActive = 0;
for (var k in dailyStats) {
    if (dailyStats[k].active_diarists > maxActive) maxActive = dailyStats[k].active_diarists;
}

// Diary-level precomputations
var diaryMeta = {};
var diaryGeoCountByDate = {};
var diaryMaxDaily = {};
var diaryBounds = {};
allFeatures.forEach(function(f) {
    var did = String(f.properties.diary_id);
    var d = f.properties.time;
    if (!diaryMeta[did]) {
        diaryMeta[did] = {total_geo_entries: 0, first_date: d, last_date: d, active_geo_days: 0, unique_places: 0};
        diaryGeoCountByDate[did] = {};
        diaryMaxDaily[did] = 0;
        diaryMeta[did]._places = {};
        diaryBounds[did] = L.latLngBounds([]);
    }
    diaryMeta[did].total_geo_entries += 1;
    if (d < diaryMeta[did].first_date) diaryMeta[did].first_date = d;
    if (d > diaryMeta[did].last_date) diaryMeta[did].last_date = d;
    diaryGeoCountByDate[did][d] = (diaryGeoCountByDate[did][d] || 0) + 1;
    if (diaryGeoCountByDate[did][d] > diaryMaxDaily[did]) diaryMaxDaily[did] = diaryGeoCountByDate[did][d];
    var pn = f.properties.place_name || "";
    if (pn) diaryMeta[did]._places[pn] = true;
    if (f.geometry && f.geometry.type === "Point" && f.geometry.coordinates && f.geometry.coordinates.length >= 2) {
        var lng = f.geometry.coordinates[0];
        var lat = f.geometry.coordinates[1];
        if (typeof lat === "number" && typeof lng === "number") {
            diaryBounds[did].extend([lat, lng]);
        }
    }
});
Object.keys(diaryMeta).forEach(function(did) {
    diaryMeta[did].active_geo_days = Object.keys(diaryGeoCountByDate[did] || {}).length;
    diaryMeta[did].unique_places = Object.keys(diaryMeta[did]._places || {}).length;
    delete diaryMeta[did]._places;
});

// Per-place mention counts by date
var placeMentionsByDate = {};
diaryData.features.forEach(function(f) {
    var date = f.properties.time;
    var name = f.properties.place_name;
    if (!placeMentionsByDate[date]) placeMentionsByDate[date] = {};
    placeMentionsByDate[date][name] = (placeMentionsByDate[date][name] || 0) + 1;
});

// =============================================
// Shared UI state (mode-agnostic)
// =============================================
var showDiarists = false;
var showCumulative = false;
var showMentions = false;
var showRolling = false;
var showTopPlaces = false;
var showTimelineTotalsPanel = true;
var rollingDays = 7;

// =============================================
// App state + mode runtime
// =============================================
var app = {
    map: map,
    allFeatures: allFeatures,
    uniqueDiaryIds: uniqueDiaryIds,
    diaryMeta: diaryMeta,
    diaryGeoCountByDate: diaryGeoCountByDate,
    diaryMaxDaily: diaryMaxDaily,
    diaryBounds: diaryBounds,
    isoFromTimestamp: isoFromTimestamp,
    formatDate: formatDate,
    addDaysToIso: addDaysToIso,
    clampIsoToMapRange: clampIsoToMapRange,
    getStats: getStats,
    getCumulative: getCumulative,
    getLastNDays: getLastNDays,
    barRow: barRow,
    getTopPlaces: getTopPlaces,
    buildGeoJsonLayer: buildGeoJsonLayer,
    getDiaryDisplayLabel: getDiaryDisplayLabel,
    chooseRandomDiaryId: chooseRandomDiaryId,
    startPlayer: startPlayer,
    stopPlayer: stopPlayer,
    setCurrentIso: function(iso) {
        if (iso) this.state.currentIsoDate = iso;
        if (map.timeDimension && map.timeDimension.setCurrentTime) {
            map.timeDimension.setCurrentTime(Date.parse(iso + "T00:00:00Z"));
        }
    },
    state: {
        modeKey: null,
        selectedDiaryId: uniqueDiaryIds.length ? uniqueDiaryIds[0] : "",
        currentIsoDate: MAP_TIME_START,
    },
    modeArtifacts: {
        timedLayer: null,
        staticLayer: null,
        previewTimer: null,
        endHoldTimer: null,
        endPoll: null,
        playInterval: null,
        sessionToken: 0,
    },
    playback: {
        driver: null, // "timedimension" | "manual"
        manualInterval: null,
        manualPaused: false,
        prevAvailableTimes: null,
        prevCurrentTime: null,
        nativePlayerStart: null,
        nativePlayerStop: null,
        originalPlayerStart: null,
        originalPlayerStop: null,
        nativeStartTimer: null,
        nativeWatchdogTimer: null,
        nativeStallWatchdogTimer: null,
        playButtonFallbackTimer: null,
        autoplayRestartGeneration: 0,
        playButtonFallbackUsedGeneration: null,
        previewFreezeInterval: null,
    },
    clearNativePlaybackTimers: function() {
        if (this.playback.nativeStartTimer) {
            clearTimeout(this.playback.nativeStartTimer);
            this.playback.nativeStartTimer = null;
        }
        if (this.playback.nativeWatchdogTimer) {
            clearTimeout(this.playback.nativeWatchdogTimer);
            this.playback.nativeWatchdogTimer = null;
        }
        if (this.playback.nativeStallWatchdogTimer) {
            clearTimeout(this.playback.nativeStallWatchdogTimer);
            this.playback.nativeStallWatchdogTimer = null;
        }
        if (this.playback.playButtonFallbackTimer) {
            clearTimeout(this.playback.playButtonFallbackTimer);
            this.playback.playButtonFallbackTimer = null;
        }
    },
    clickTimeDimensionPlayButtonIfNeeded: function(expectedModeKey, sessionToken) {
        if (!playbackGuardOk(expectedModeKey, sessionToken)) return false;
        if (isTimeDimensionPlayerPlaying()) return false;
        var btn = findTimeDimensionPlayButton();
        if (!btn) return false;
        pdLogPlayback("clickTimeDimensionPlayButtonIfNeeded DOM play click");
        try { btn.click(); } catch (eClick) { return false; }
        return true;
    },
    forceAutoplayAfterModeStart: function(startIso, expectedModeKey) {
        this.endFrozenPreview();
        this.clearNativePlaybackTimers();
        forceResetTimeDimensionPlayer();
        if (this.playback.manualInterval) {
            clearInterval(this.playback.manualInterval);
            this.playback.manualInterval = null;
        }
        if (this.modeArtifacts.playInterval) {
            clearInterval(this.modeArtifacts.playInterval);
            this.modeArtifacts.playInterval = null;
        }
        if (this.modeArtifacts.mode3_manualInterval) {
            clearInterval(this.modeArtifacts.mode3_manualInterval);
            this.modeArtifacts.mode3_manualInterval = null;
        }
        if (this.modeArtifacts.mode4_manualInterval) {
            clearInterval(this.modeArtifacts.mode4_manualInterval);
            this.modeArtifacts.mode4_manualInterval = null;
        }
        this.playback.originalPlayerStart = null;
        this.playback.originalPlayerStop = null;
        this.playback.manualPaused = false;
        this.playback.driver = "timedimension";

        var restartGeneration = (this.playback.autoplayRestartGeneration || 0) + 1;
        this.playback.autoplayRestartGeneration = restartGeneration;
        this.playback.playButtonFallbackUsedGeneration = null;

        var startIsoNorm = startIso || MAP_TIME_START;
        var modeKey = expectedModeKey || (this.state && this.state.modeKey) || null;
        var sessionToken = this.modeArtifacts ? this.modeArtifacts.sessionToken : null;
        var startTs = Date.parse(startIsoNorm + "T00:00:00Z");
        var tdBefore = this.map && this.map.timeDimension;
        var timeBefore = tdBefore && tdBefore.getCurrentTime ? tdBefore.getCurrentTime() : null;

        ensureTimeDimensionTicking(startIsoNorm, {
            startDelayMs: 50,
            expectedModeKey: modeKey
        });

        var self = this;
        var fallbackDelayMs = 900;
        this.playback.playButtonFallbackTimer = setTimeout(function() {
            self.playback.playButtonFallbackTimer = null;
            if (!self.playback || self.playback.autoplayRestartGeneration !== restartGeneration) return;
            if (self.playback.playButtonFallbackUsedGeneration === restartGeneration) return;
            if (!playbackGuardOk(modeKey, sessionToken)) return;

            var td = self.map && self.map.timeDimension;
            var after = td && td.getCurrentTime ? td.getCurrentTime() : null;
            var notPlaying = !isTimeDimensionPlayerPlaying();
            var timeUnchanged = timeBefore !== null && after === timeBefore;
            var stuckAtStart = startTs != null && after === startTs;
            if (!notPlaying) return;
            if (!timeUnchanged && !stuckAtStart) return;

            self.playback.playButtonFallbackUsedGeneration = restartGeneration;
            pdLogPlayback("forceAutoplayAfterModeStart play-button fallback gen=" + restartGeneration);
            self.clickTimeDimensionPlayButtonIfNeeded(modeKey, sessionToken);
        }, fallbackDelayMs);
    },
    clearPreviewFreeze: function() {
        if (this.playback.previewFreezeInterval) {
            clearInterval(this.playback.previewFreezeInterval);
            this.playback.previewFreezeInterval = null;
        }
    },
    beginFrozenPreview: function(startIso) {
        this.clearNativePlaybackTimers();
        this.clearPreviewFreeze();
        if (this.playback.manualInterval) {
            clearInterval(this.playback.manualInterval);
            this.playback.manualInterval = null;
        }
        var a = this.modeArtifacts || {};
        var legacyIntervals = ["playInterval", "mode3_manualInterval", "mode3_manualIntervalCore", "mode4_manualInterval"];
        for (var i = 0; i < legacyIntervals.length; i++) {
            if (a[legacyIntervals[i]]) {
                clearInterval(a[legacyIntervals[i]]);
                a[legacyIntervals[i]] = null;
            }
        }
        restoreTimePlayerHard();
        if (this.playback.nativePlayerStop) this.playback.nativePlayerStop();
        else { var p2 = getTimePlayer(); if (p2 && typeof p2.stop === "function") p2.stop(); }
        this.playback.driver = "preview";
        if (startIso) this.setCurrentIso(startIso);
        if (startIso) this.state.currentIsoDate = startIso;
        if (this.playback.nativePlayerStop) this.playback.nativePlayerStop();
        else { var p3 = getTimePlayer(); if (p3 && typeof p3.stop === "function") p3.stop(); }
        var self = this;
        var sessionToken = this.modeArtifacts ? this.modeArtifacts.sessionToken : null;
        var frozenTime = startIso ? Date.parse(startIso + "T00:00:00Z") : null;
        this.playback.previewFreezeInterval = setInterval(function() {
            if (!self || !self.playback) return;
            if ((self.modeArtifacts ? self.modeArtifacts.sessionToken : null) !== sessionToken || self.playback.driver !== "preview") {
                self.clearPreviewFreeze();
                return;
            }
            restoreTimePlayerHard();
            if (self.playback.nativePlayerStop) self.playback.nativePlayerStop();
            else { var p4 = getTimePlayer(); if (p4 && typeof p4.stop === "function") p4.stop(); }
            if (frozenTime !== null) {
                var td = self.map && self.map.timeDimension;
                if (td && td.getCurrentTime && td.setCurrentTime && td.getCurrentTime() !== frozenTime) {
                    td.setCurrentTime(frozenTime);
                    self.state.currentIsoDate = startIso;
                }
            }
        }, 100);
    },
    endFrozenPreview: function() {
        this.clearPreviewFreeze();
        if (this.playback.driver === "preview") this.playback.driver = null;
    },
    freezeTimelineForManualPreview: function(startIso) {
        // Back-compat alias for modes not yet updated.
        this.beginFrozenPreview(startIso);
    },
    clearStaticOverlay: function() {
        if (this.modeArtifacts.staticLayer) {
            this.map.removeLayer(this.modeArtifacts.staticLayer);
            this.modeArtifacts.staticLayer = null;
        }
    },
    setStaticOverlayFeatures: function(features) {
        this.clearStaticOverlay();
        this.modeArtifacts.staticLayer = buildGeoJsonLayer(features).addTo(this.map);
    },
    setTimedFeatures: function(features) {
        if (this.modeArtifacts.timedLayer) {
            this.map.removeLayer(this.modeArtifacts.timedLayer);
            this.modeArtifacts.timedLayer = null;
        }
        var base = buildGeoJsonLayer(features);
        this.modeArtifacts.timedLayer = L.timeDimension.layer.geoJson(base, {
            updateTimeDimension: false,
            updateTimeDimensionMode: "union",
            duration: "P1D",
        }).addTo(this.map);
    },
    clearModeArtifacts: function() {
        var artifacts = this.modeArtifacts || {};
        artifacts.sessionToken = (artifacts.sessionToken || 0) + 1;
        this.clearPreviewFreeze();

        var timeoutNames = [
            "previewTimer",
            "endHoldTimer",
            "mode3_previewTimer",
            "mode3_shadowRevealTimer",
            "mode3_manualTimeout",
            "mode4_manualTimeout"
        ];
        for (var ti = 0; ti < timeoutNames.length; ti++) {
            if (artifacts[timeoutNames[ti]]) clearTimeout(artifacts[timeoutNames[ti]]);
            artifacts[timeoutNames[ti]] = null;
        }

        var intervalNames = [
            "endPoll",
            "playInterval",
            "mode3_manualInterval",
            "mode3_manualIntervalCore",
            "mode4_manualInterval"
        ];
        for (var ii = 0; ii < intervalNames.length; ii++) {
            if (artifacts[intervalNames[ii]]) clearInterval(artifacts[intervalNames[ii]]);
            artifacts[intervalNames[ii]] = null;
        }

        var td = this.map && this.map.timeDimension;
        var timeLoadHandlerNames = [
            "mode3_timeLoadHandler",
            "mode3_shadowTimeLoadHandler",
            "mode4_timeLoadHandler"
        ];
        if (td && td.off) {
            for (var hi = 0; hi < timeLoadHandlerNames.length; hi++) {
                if (artifacts[timeLoadHandlerNames[hi]]) {
                    td.off("timeload", artifacts[timeLoadHandlerNames[hi]]);
                    artifacts[timeLoadHandlerNames[hi]] = null;
                }
            }
        }

        if (artifacts.mode3_shadowLayer) {
            this.map.removeLayer(artifacts.mode3_shadowLayer);
            artifacts.mode3_shadowLayer = null;
        }
        artifacts.mode3_shadowHiddenKeys = null;
        artifacts.mode3FlowToken = (artifacts.mode3FlowToken || 0) + 1;
        artifacts.mode3_showTotals = false;
        artifacts.mode3_phase = null;
        artifacts.mode4_showTotals = false;
        artifacts.mode4_phase = null;
        artifacts.mode3_manualPaused = false;
        artifacts.mode4_manualPaused = false;
        if (this.modeArtifacts.timedLayer) {
            this.map.removeLayer(this.modeArtifacts.timedLayer);
            this.modeArtifacts.timedLayer = null;
        }
        this.clearStaticOverlay();
    },
    resetModeArtifactsObject: function() {
        // Hard reset between modes: never carry runtime artifact state forward.
        var nextToken = (this.modeArtifacts && this.modeArtifacts.sessionToken) || 0;
        this.modeArtifacts = {
            timedLayer: null,
            staticLayer: null,
            previewTimer: null,
            endHoldTimer: null,
            endPoll: null,
            playInterval: null,
            mode3_previewTimer: null,
            mode3_shadowRevealTimer: null,
            mode3_manualTimeout: null,
            mode3_manualInterval: null,
            mode3_timeLoadHandler: null,
            mode3_shadowTimeLoadHandler: null,
            mode3_shadowLayer: null,
            mode3_shadowHiddenKeys: null,
            mode3FlowToken: 0,
            mode4_manualTimeout: null,
            mode4_manualInterval: null,
            mode4_timeLoadHandler: null,
            sessionToken: nextToken,
        };
    },
    hardResetForModeSwitch: function() {
        // Mode-switch contract in v3:
        // 1) stop any possible playback owner
        // 2) clear map overlays and timers
        // 3) reset player methods to canonical TimeDimension methods
        this.modeArtifacts.sessionToken = (this.modeArtifacts.sessionToken || 0) + 1;
        this.clearNativePlaybackTimers();
        this.stopAllPlayback();
        this.clearModeArtifacts();
        restoreTimePlayerHard();
        if (this.playback.nativePlayerStop) this.playback.nativePlayerStop();
        else stopPlayer();
        this.resetModeArtifactsObject();
    },
    stopAllPlayback: function() {
        // Hard stop: kill every possible playback source before handing off.
        this.clearPreviewFreeze();
        this.clearNativePlaybackTimers();
        restoreTimePlayerHard();
        if (this.playback.nativePlayerStop) this.playback.nativePlayerStop();
        else { var p0 = getTimePlayer(); if (p0 && typeof p0.stop === "function") p0.stop(); }

        if (this.playback.manualInterval) {
            clearInterval(this.playback.manualInterval);
            this.playback.manualInterval = null;
        }

        // Clear all legacy interval artifact names.
        var a = this.modeArtifacts || {};
        var legacyIntervals = ["playInterval", "mode3_manualInterval", "mode3_manualIntervalCore", "mode4_manualInterval"];
        for (var i = 0; i < legacyIntervals.length; i++) {
            if (a[legacyIntervals[i]]) {
                clearInterval(a[legacyIntervals[i]]);
                a[legacyIntervals[i]] = null;
            }
        }

        // Clear pending start/nudge timers that could restart native playback.
        // Backward-safe cleanup for preview-era timers.
        var legacyTimers = ["previewTimer", "mode3_previewTimer", "mode3_manualTimeout", "mode4_manualTimeout"];
        for (var j = 0; j < legacyTimers.length; j++) {
            if (a[legacyTimers[j]]) {
                clearTimeout(a[legacyTimers[j]]);
                a[legacyTimers[j]] = null;
            }
        }

        restoreTimePlayerHard();
        this.playback.originalPlayerStart = null;
        this.playback.originalPlayerStop = null;
        this.playback.manualPaused = false;
        this.playback.driver = null;
        pdLogPlayback("stopAllPlayback done");
    },
    setAvailableTimesRange: function(startIso, endIso) {
        var td = this.map && this.map.timeDimension;
        if (!td || !td.setAvailableTimes) return;

        var times = [];
        var cur = new Date(startIso + "T00:00:00Z");
        var end = new Date(endIso + "T00:00:00Z");
        while (cur <= end) {
            times.push(cur.getTime());
            cur.setUTCDate(cur.getUTCDate() + 1);
        }
        if (!times.length) return;
        td.setAvailableTimes(times, "replace");
        if (typeof td.setCurrentTime === "function") td.setCurrentTime(times[0]);
        // Keep app state in sync so no stale date leaks into the new range.
        this.state.currentIsoDate = startIso;
    },
    setBaselineAvailableTimes: function() {
        // For Mode 1/3: restore full day-by-day timeline unconditionally.
        // Any previous mode's narrower range is discarded.
        var td = this.map && this.map.timeDimension;
        if (!td || !td.setAvailableTimes) return;

        this.playback.prevAvailableTimes = null;
        this.playback.prevCurrentTime = null;

        var times = [];
        var cur = new Date(MAP_TIME_START + "T00:00:00Z");
        var end = new Date(MAP_TIME_END + "T00:00:00Z");
        while (cur <= end) {
            times.push(cur.getTime());
            cur.setUTCDate(cur.getUTCDate() + 1);
        }
        if (!times.length) return;
        td.setAvailableTimes(times, "replace");
        if (typeof td.setCurrentTime === "function") td.setCurrentTime(times[0]);
        // Anchor app state at the very start so the native player begins at day 0.
        this.state.currentIsoDate = MAP_TIME_START;
    },
    restoreAvailableTimes: function() {
        // v3 policy: no cross-mode time state restore.
        // Each mode must fully initialize its own time window/current day.
        return;
    },
    restartTimeDimensionAutoplay: function(startIso, expectedModeKey) {
        this.forceAutoplayAfterModeStart(startIso, expectedModeKey);
    },
    startTimeDimensionAutoplay: function(startIso, expectedModeKey) {
        this.forceAutoplayAfterModeStart(startIso, expectedModeKey);
    },
    startManualDayTicker: function(onReachedLastDay) {
        // Advances across td._availableTimes once per second.
        var self = this;
        self.endFrozenPreview();
        self.clearNativePlaybackTimers();
        var td = self.map && self.map.timeDimension;
        if (!td || !td._availableTimes || !td._availableTimes.length || !td.setCurrentTime) return;
        restoreTimePlayerHard();
        if (self.playback.nativePlayerStop) self.playback.nativePlayerStop();
        else { var p1 = getTimePlayer(); if (p1 && typeof p1.stop === "function") p1.stop(); }
        self.playback.driver = "manual";
        if (self.playback.manualInterval) clearInterval(self.playback.manualInterval);
        if (self.modeArtifacts.playInterval) {
            clearInterval(self.modeArtifacts.playInterval);
            self.modeArtifacts.playInterval = null;
        }
        if (self.modeArtifacts.mode3_manualInterval) {
            clearInterval(self.modeArtifacts.mode3_manualInterval);
            self.modeArtifacts.mode3_manualInterval = null;
        }
        if (self.modeArtifacts.mode4_manualInterval) {
            clearInterval(self.modeArtifacts.mode4_manualInterval);
            self.modeArtifacts.mode4_manualInterval = null;
        }
        self.playback.manualPaused = false;
        self.playback.originalPlayerStart = null;
        self.playback.originalPlayerStop = null;
        var sessionToken = self.modeArtifacts.sessionToken;

        var manualInterval = setInterval(function() {
            // Token guard: invalidates this interval on any mode switch.
            if (!self.modeArtifacts || self.modeArtifacts.sessionToken !== sessionToken) {
                clearInterval(manualInterval);
                if (self.playback.manualInterval === manualInterval) self.playback.manualInterval = null;
                return;
            }
            // Driver guard: if something else took over playback, die cleanly.
            if (self.playback.driver !== "manual") {
                clearInterval(manualInterval);
                if (self.playback.manualInterval === manualInterval) self.playback.manualInterval = null;
                return;
            }
            // Mode guard: manual ticker is only valid inside one-diary modes.
            var curMode = self.state && self.state.modeKey;
            if (curMode !== "mode_2" && curMode !== "mode_4") {
                clearInterval(manualInterval);
                if (self.playback.manualInterval === manualInterval) self.playback.manualInterval = null;
                return;
            }
            var td2 = self.map.timeDimension;
            if (!td2 || !td2._availableTimes || !td2._availableTimes.length) return;
            if (self.playback.manualPaused) return;
            // Defensive: keep native player stopped on every tick.
            self.clearNativePlaybackTimers();
            if (self.playback.nativePlayerStop) self.playback.nativePlayerStop();
            else { var p5 = getTimePlayer(); if (p5 && typeof p5.stop === "function") p5.stop(); }
            var cur = td2.getCurrentTime();
            var idx = td2._availableTimes.indexOf(cur);
            if (idx < 0) idx = 0;
            var nextIdx = idx + 1;
            if (nextIdx >= td2._availableTimes.length) return;

            td2.setCurrentTime(td2._availableTimes[nextIdx]);

            // If we just set the final day, stop ticking and notify.
            if (nextIdx === td2._availableTimes.length - 1) {
                clearInterval(manualInterval);
                if (self.playback.manualInterval === manualInterval) self.playback.manualInterval = null;
                if (self.playback.driver === "manual") self.playback.driver = null;
                if (self.modeArtifacts.sessionToken === sessionToken && typeof onReachedLastDay === "function") onReachedLastDay();
            }
        }, 1000);
        self.playback.manualInterval = manualInterval;
    },
    setSelectedDiaryId: function(did) {
        this.state.selectedDiaryId = String(did || "");
    },
    nudgeToStartAndAutoplay: function() {
        // Back-compat: delegate to the core playback contract.
        this.startTimeDimensionAutoplay(MAP_TIME_START, this.state && this.state.modeKey);
    },
    resetDefaultViewport: function() {
        this.map.setView(DEFAULT_VIEW_CENTER, DEFAULT_VIEW_ZOOM, {animate: true});
    },
};
captureNativeTimePlayerMethods();

// =============================================
// Stats panel (top-left): plumbing + delegation to active mode
// =============================================
var statsPanel = L.control({position: 'topleft'});
var statsPanelDiv = null;
var statsPanelControlsDiv = null;
var statsPanelContentDiv = null;

statsPanel.onAdd = function() {
    statsPanelDiv = L.DomUtil.create('div', 'stats-panel');
    L.DomEvent.disableClickPropagation(statsPanelDiv);
    L.DomEvent.disableScrollPropagation(statsPanelDiv);
    statsPanelControlsDiv = L.DomUtil.create('div', '', statsPanelDiv);
    statsPanelContentDiv = L.DomUtil.create('div', '', statsPanelDiv);
    statsPanelContentDiv.innerHTML = '<h3>Statistics</h3><p style="font-size:12px;color:#888;">Waiting for timeline...</p>';
    return statsPanelDiv;
};
statsPanel.addTo(map);

function getModeList() {
    return Object.keys(__PD_MODES).sort().map(function(k) { return __PD_MODES[k]; });
}
function getActiveMode() {
    return __PD_MODES[String(app.state.modeKey)] || null;
}

function renderPanelControls() {
    if (!statsPanelControlsDiv) return;
    var modes = getModeList();
    var activeMode = getActiveMode();
    var canShowDiarists = !!activeMode && activeMode.key !== "mode_1" && activeMode.key !== "mode_3";
    var canShowTopPlaces = !!activeMode && activeMode.key !== "mode_1" && activeMode.key !== "mode_3";
    var html = '';

    html += '<div class="mode-box">';
    html += '<div class="mode-title">Visualization mode</div>';
    html += '<select id="selMode" style="width:100%;margin-bottom:6px">';
    for (var i = 0; i < modes.length; i++) {
        var m = modes[i];
        html += '<option value="' + m.key + '"' + (m.key === app.state.modeKey ? ' selected' : '') + '>' + m.label + '</option>';
    }
    html += '</select>';

    if (activeMode && activeMode.supportsDiarySelect) {
        html += '<div class="mode-title" style="margin-top:2px">Diary</div>';
        html += '<select id="selDiary" style="width:100%;margin-bottom:2px">';
        for (var d = 0; d < app.uniqueDiaryIds.length; d++) {
            var did = app.uniqueDiaryIds[d];
            html += '<option value="' + did + '"' + (did === app.state.selectedDiaryId ? ' selected' : '') + '>' + app.getDiaryDisplayLabel(did) + '</option>';
        }
        html += '</select>';
    }
    html += '</div>';

    html += '<div class="controls-box">';
    if (activeMode && activeMode.supportsDiarySelect) {
        // One-diary mode: hide all-diaries-only toggles.
        html += '<label><input type="checkbox" id="chkRolling"' + (showRolling ? ' checked' : '') + '> Rolling window</label>';
        html += '<label><input type="checkbox" id="chkMentions"' + (showMentions ? ' checked' : '') + '> Geolocations count</label>';
        if (canShowTopPlaces) {
            html += '<label><input type="checkbox" id="chkTopPlaces"' + (showTopPlaces ? ' checked' : '') + '> Top places cumulative</label>';
        }
    } else {
        html += '<label><input type="checkbox" id="chkRolling"' + (showRolling ? ' checked' : '') + '> Rolling window</label>';
        html += '<label><input type="checkbox" id="chkMentions"' + (showMentions ? ' checked' : '') + '> Geolocations count</label>';
        html += '<label><input type="checkbox" id="chkCumulative"' + (showCumulative ? ' checked' : '') + '> Cumulative diarists</label>';
        if (canShowDiarists) {
            html += '<label><input type="checkbox" id="chkDiarists"' + (showDiarists ? ' checked' : '') + '> Today\'s diarists</label>';
        }
        if (canShowTopPlaces) {
            html += '<label><input type="checkbox" id="chkTopPlaces"' + (showTopPlaces ? ' checked' : '') + '> Top places cumulative</label>';
        }
    }
    if (activeMode && activeMode.key === "mode_3") {
        html += '<label><input type="checkbox" id="chkTimelineTotalsPanel"' + (showTimelineTotalsPanel ? ' checked' : '') + '> Timeline totals panel</label>';
    }
    html += '</div>';

    statsPanelControlsDiv.innerHTML = html;

    var selMode = document.getElementById('selMode');
    var selDiary = document.getElementById('selDiary');
    var chkD = document.getElementById('chkDiarists');
    var chkC = document.getElementById('chkCumulative');
    var chkM = document.getElementById('chkMentions');
    var chkR = document.getElementById('chkRolling');
    var chkTP = document.getElementById('chkTopPlaces');
    var chkTTP = document.getElementById('chkTimelineTotalsPanel');

    if (selMode) selMode.onchange = function() {
        setMode(this.value);
    };
    if (selDiary) selDiary.onchange = function() {
        var m = getActiveMode();
        if (m && m.onDiaryChange) m.onDiaryChange(app, this.value);
        updateStatsPanel(app.state.currentIsoDate);
        updateClock(app.state.currentIsoDate);
    };
    if (chkD) chkD.onchange = function() { showDiarists = this.checked; updateStatsPanel(app.state.currentIsoDate); };
    if (chkC) chkC.onchange = function() { showCumulative = this.checked; updateStatsPanel(app.state.currentIsoDate); };
    if (chkM) chkM.onchange = function() { showMentions = this.checked; updateStatsPanel(app.state.currentIsoDate); };
    if (chkR) chkR.onchange = function() { showRolling = this.checked; updateStatsPanel(app.state.currentIsoDate); };
    if (chkTP) chkTP.onchange = function() { showTopPlaces = this.checked; updateStatsPanel(app.state.currentIsoDate); };
    if (chkTTP) chkTTP.onchange = function() {
        showTimelineTotalsPanel = this.checked;
        updateStatsPanel(app.state.currentIsoDate);
        updateClock(app.state.currentIsoDate);
    };
}

function updateStatsPanel(isoDate) {
    if (!statsPanelContentDiv) return;
    app.state.currentIsoDate = isoDate;
    var m = getActiveMode();
    var html = '';
    if (m && m.getPanelHtml) html = m.getPanelHtml(app, isoDate);
    statsPanelContentDiv.innerHTML = html;

    var selD = document.getElementById('selDays');
    if (selD) selD.onchange = function() {
        rollingDays = parseInt(this.value);
        updateStatsPanel(app.state.currentIsoDate);
    };
}

// Expose a safe UI refresh hook for modes.
// Modes should use this instead of trying to call internal functions directly.
app.refreshUi = function() {
    var iso = app.state.currentIsoDate || MAP_TIME_START;
    updateClock(iso);
    updateStatsPanel(iso);
};

// =============================================
// Clock (bottom-right): plumbing + delegation to active mode subtitle
// Optional secondary panel stacks above the day ticker (same corner).
// =============================================
var currentTime = L.control({position: 'bottomright'});
var secondaryRightPanel = L.control({position: 'bottomright'});

function updateSecondaryRightPanel(isoDate) {
    var m = getActiveMode();
    if (secondaryRightPanel._map) {
        map.removeControl(secondaryRightPanel);
    }
    var panelHtml = null;
    if (m && m.getSecondaryRightPanelHtml) {
        panelHtml = m.getSecondaryRightPanelHtml(app, isoDate);
    }
    if (!panelHtml) return;

    var panelStyle = null;
    if (m && m.getSecondaryRightPanelStyle) {
        panelStyle = m.getSecondaryRightPanelStyle(app, isoDate);
    }

    secondaryRightPanel.onAdd = function() {
        var div = L.DomUtil.create('div', 'yearbox secondary-right-panel');
        if (m && m.rightStackPanelClass) {
            L.DomUtil.addClass(div, m.rightStackPanelClass);
        }
        if (panelStyle) div.style.cssText += ";" + panelStyle;
        div.innerHTML = panelHtml;
        return div;
    };
    secondaryRightPanel.addTo(map);
}

function updateClock(isoDate) {
    var m = getActiveMode();
    if (currentTime._map) {
        map.removeControl(currentTime);
    }
    if (secondaryRightPanel._map) {
        map.removeControl(secondaryRightPanel);
    }
    currentTime.onAdd = function () {
        var div = L.DomUtil.create('div', 'yearbox');
        if (m && m.rightStackPanelClass) {
            L.DomUtil.addClass(div, m.rightStackPanelClass);
        }
        if (m && m.getClockBoxStyle) {
            var boxStyle = m.getClockBoxStyle(app, isoDate);
            if (boxStyle) div.style.cssText += ";" + boxStyle;
        }
        var headline = null;
        if (m && m.getClockHeadlineHtml) headline = m.getClockHeadlineHtml(app, isoDate);
        if (headline) div.innerHTML += headline;
        else div.innerHTML += '<h1>' + formatDate(isoDate) + '</h1>';
        if (m && m.getClockSubtitleHtml) {
            var subtitle = m.getClockSubtitleHtml(app, isoDate);
            if (subtitle) div.innerHTML += subtitle;
        }
        return div;
    };
    currentTime.addTo(map);
    updateSecondaryRightPanel(isoDate);
}

map.timeDimension.on('timeload', function() {
    var isoDate = isoFromTimestamp(map.timeDimension.getCurrentTime());
    app.state.currentIsoDate = isoDate;
    updateClock(isoDate);
    updateStatsPanel(isoDate);
});

// =============================================
// Mode switching (plumbing)
// =============================================
function setMode(modeKey) {
    var next = __PD_MODES[String(modeKey)];
    if (!next) return;

    var prev = getActiveMode();
    // 1) Invalidate stale callbacks before previous mode exits.
    app.modeArtifacts.sessionToken = (app.modeArtifacts.sessionToken || 0) + 1;
    // 2) Let previous mode clean up its own lifecycle first.
    if (prev && prev.exit) prev.exit(app);
    // 3) Then run hard reset (no state preservation across modes).
    app.hardResetForModeSwitch();

    app.state.modeKey = String(modeKey);
    app.modeArtifacts.sessionToken = (app.modeArtifacts.sessionToken || 0) + 1;

    if (next && next.enter) next.enter(app);

    // Keep UI date in sync if the mode set the map time during enter() (timeload may not have fired yet).
    if (map.timeDimension && map.timeDimension.getCurrentTime) {
        app.state.currentIsoDate = isoFromTimestamp(map.timeDimension.getCurrentTime());
    }

    renderPanelControls();
    updateStatsPanel(app.state.currentIsoDate);
    updateClock(app.state.currentIsoDate);
}

// Initialize: pick first registered mode, or fall back.
var initialModes = getModeList();
app.state.modeKey = initialModes.length ? initialModes[0].key : null;
renderPanelControls();
updateStatsPanel(MAP_TIME_START);
updateClock(MAP_TIME_START);
if (app.state.modeKey) setMode(app.state.modeKey);

// =============================================
// Info panel (toggle with button)
// =============================================
var title = L.control({position: 'topleft'});
title.onAdd = function () {
    var div = L.DomUtil.create('div', 'disclaimer');
    div.innerHTML +=
        '<h1>Pandemic Diaries — Place Mentions</h1>' +
        '<p>This chronological map visualises geolocation mentions extracted from Latvian pandemic diaries (2020–2021). ' +
        'Each point represents a place name identified in a diary entry. ' +
        'Use the timeline control at the bottom to navigate through time.</p>' +
        '<p><b>Data:</b> ~4900 place mentions from 238 diaries, 771 unique places.</p>' +
        '<p><i>Click on a point to see the place name, date, and a text snippet (KWIC) from the diary entry.</i></p>';
    return div;
};

var boxInfoAdded = 0;
L.easyButton('<img src="./leaflet_files/easy-button/info.svg" style="height:15px; width:15px; margin-top:7px; margin-left:1px">', function(_, mapRef) {
    if (boxInfoAdded === 0) {
        title.addTo(mapRef);
        boxInfoAdded = 1;
    } else {
        mapRef.removeControl(title);
        boxInfoAdded = 0;
    }
}).addTo(map);

