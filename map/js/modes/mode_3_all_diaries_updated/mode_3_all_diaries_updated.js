function mode3_featureIsoDate(f) {
    if (!f || !f.properties) return null;
    var t = f.properties.time || f.properties.times || "";
    if (!t) return null;
    var s = String(t);
    var iso = s.indexOf("T") >= 0 ? s.split("T")[0] : s;
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function mode3_getTopPlacesForDate(app, isoDate, n) {
    var counts = {};
    var features = app.allFeatures || [];
    for (var i = 0; i < features.length; i++) {
        var f = features[i];
        var d = mode3_featureIsoDate(f);
        if (!d || d > isoDate) continue;
        var nm = (f.properties && f.properties.place_name) ? String(f.properties.place_name) : "";
        if (!nm) continue;
        counts[nm] = (counts[nm] || 0) + 1;
    }
    var arr = Object.keys(counts).map(function(k) { return { name: k, count: counts[k] }; });
    arr.sort(function(a, b) {
        if (b.count !== a.count) return b.count - a.count;
        return String(a.name).localeCompare(String(b.name));
    });
    return arr.slice(0, n || 10);
}

function mode3_getCumulativeMentionTotals(app, isoDate) {
    var total = 0;
    var unique = {};
    var features = app.allFeatures || [];
    for (var i = 0; i < features.length; i++) {
        var f = features[i];
        var d = mode3_featureIsoDate(f);
        if (!d || d > isoDate) continue;
        total += 1;
        var nm = (f.properties && f.properties.place_name) ? String(f.properties.place_name) : "";
        if (nm) unique[nm] = true;
    }
    return { totalMentions: total, uniquePlaces: Object.keys(unique).length };
}

// Mode 3 runtime: timeline + cumulative shadow (merged from mode_runtime/preview_then_timeline.js).
var MODE3_TIMELINE_START_ISO = "2020-02-23";

// Muted olive/moss cumulative shadow scale (sparse → dense); active-day green unchanged elsewhere.
var MODE3_SHADOW_COLOR_1 = "#d7d2a4";
var MODE3_SHADOW_COLOR_2_10 = "#b7b06d";
var MODE3_SHADOW_COLOR_11_19 = "#aaa56a";
var MODE3_SHADOW_COLOR_20_49 = "#918c55";
var MODE3_SHADOW_COLOR_50_99 = "#7a7548";
var MODE3_SHADOW_COLOR_100_PLUS = "#625e3d";

var MODE3_SHADOW_STROKE_ZOOM_MIN = 5;
var MODE3_SHADOW_STROKE_COLOR = "#1f1f1f";
var MODE3_SHADOW_STROKE_OPACITY = 0.75;
var MODE3_SHADOW_STROKE_WEIGHT = 1.5;

function mode3_getShadowStrokeForZoom(zoom) {
    if (zoom >= MODE3_SHADOW_STROKE_ZOOM_MIN) {
        return {
            stroke: true,
            color: MODE3_SHADOW_STROKE_COLOR,
            opacity: MODE3_SHADOW_STROKE_OPACITY,
            weight: MODE3_SHADOW_STROKE_WEIGHT
        };
    }
    return { stroke: false };
}

function mode3_applyShadowStrokeToLayer(app) {
    if (!app || !app.map || !app.modeArtifacts || !app.modeArtifacts.mode3_shadowLayer) return;
    var strokeOpts = mode3_getShadowStrokeForZoom(app.map.getZoom());
    app.modeArtifacts.mode3_shadowLayer.eachLayer(function(marker) {
        marker.setStyle(strokeOpts);
    });
}

function mode3_bindShadowZoomHandler(app) {
    mode3_unbindShadowZoomHandler(app);
    if (!app || !app.map) return;
    app.modeArtifacts.mode3_shadowZoomHandler = function() {
        if (!app.state || app.state.modeKey !== "mode_3") return;
        mode3_applyShadowStrokeToLayer(app);
    };
    app.map.on("zoomend", app.modeArtifacts.mode3_shadowZoomHandler);
}

function mode3_unbindShadowZoomHandler(app) {
    if (!app || !app.map || !app.modeArtifacts) return;
    if (app.modeArtifacts.mode3_shadowZoomHandler) {
        app.map.off("zoomend", app.modeArtifacts.mode3_shadowZoomHandler);
        app.modeArtifacts.mode3_shadowZoomHandler = null;
    }
}

function mode3_getTimelineStartIso(app) {
    return app && app.clampIsoToMapRange ? app.clampIsoToMapRange(MODE3_TIMELINE_START_ISO) : MODE3_TIMELINE_START_ISO;
}

function mode3_getLocationKeyFromFeature(f) {
    var g = f.geometry && f.geometry.coordinates;
    if (!g || g.length < 2) return null;
    var lng = Number(g[0]);
    var lat = Number(g[1]);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    var place = (f.properties && f.properties.place_name) ? String(f.properties.place_name) : "Unknown";
    return lat.toFixed(5) + "|" + lng.toFixed(5) + "|" + place;
}

function mode3_getDayLocationKeys(app, isoDate) {
    var keys = {};
    var features = app.allFeatures || [];
    for (var i = 0; i < features.length; i++) {
        var f = features[i];
        var d = mode3_featureIsoDate(f);
        if (d === isoDate) {
            var k = mode3_getLocationKeyFromFeature(f);
            if (k) keys[k] = true;
        }
    }
    return keys;
}

var MODE3_ACTIVE_MARKER_RADIUS_DEFAULT = 6;

function mode3_getShadowStyleForCount(count) {
    var fillColor = MODE3_SHADOW_COLOR_1;
    var fillOpacity = 0.26;
    var radius = 5;
    if (count >= 100) { fillColor = MODE3_SHADOW_COLOR_100_PLUS; fillOpacity = 0.92; radius = 13; }
    else if (count >= 50) { fillColor = MODE3_SHADOW_COLOR_50_99; fillOpacity = 0.88; radius = 11; }
    else if (count >= 20) { fillColor = MODE3_SHADOW_COLOR_20_49; fillOpacity = 0.80; radius = 9; }
    else if (count >= 11) { fillColor = MODE3_SHADOW_COLOR_11_19; fillOpacity = 0.60; radius = 7.5; }
    else if (count >= 2) { fillColor = MODE3_SHADOW_COLOR_2_10; fillOpacity = 0.44; radius = 6; }
    return { fillColor: fillColor, fillOpacity: fillOpacity, radius: radius };
}

function mode3_buildLegendSwatchRow(exampleCount, label) {
    var s = mode3_getShadowStyleForCount(exampleCount);
    var d = s.radius * 2;
    return '<div style="display:flex;align-items:center;line-height:1.35;min-height:' + d + 'px;">' +
        '<span style="display:inline-block;flex-shrink:0;width:' + d + 'px;height:' + d + 'px;border-radius:50%;background:' + s.fillColor + ';opacity:' + s.fillOpacity + ';margin-right:6px;"></span>' +
        "<span>" + label + "</span></div>";
}

function mode3_buildCumulativeBuckets(app, isoDate) {
    var buckets = {};
    var features = app.allFeatures || [];
    for (var i = 0; i < features.length; i++) {
        var f = features[i];
        var d = mode3_featureIsoDate(f);
        if (!d || d > isoDate) continue;
        var key = mode3_getLocationKeyFromFeature(f);
        if (!key) continue;
        if (!buckets[key]) {
            var c = f.geometry.coordinates;
            buckets[key] = {
                lat: Number(c[1]),
                lng: Number(c[0]),
                place: (f.properties && f.properties.place_name) ? String(f.properties.place_name) : "Unknown",
                count: 0
            };
        }
        buckets[key].count += 1;
    }
    return buckets;
}

function mode3_getCumulativeCountForFeatureDate(app, feature) {
    var featureDate = mode3_featureIsoDate(feature);
    var key = mode3_getLocationKeyFromFeature(feature);
    if (!featureDate || !key) return 0;
    var cache = app.modeArtifacts && app.modeArtifacts.mode3_cumulativeCountCache;
    var cacheKey = key + "|" + featureDate;
    if (cache && cache.hasOwnProperty(cacheKey)) return cache[cacheKey];
    var count = 0;
    var features = app.allFeatures || [];
    for (var i = 0; i < features.length; i++) {
        var f = features[i];
        var d = mode3_featureIsoDate(f);
        if (!d || d > featureDate) continue;
        if (mode3_getLocationKeyFromFeature(f) === key) count += 1;
    }
    if (cache) cache[cacheKey] = count;
    return count;
}

function mode3_getActiveMarkerRadiusForFeature(app, feature) {
    var count = mode3_getCumulativeCountForFeatureDate(app, feature);
    if (!count) return MODE3_ACTIVE_MARKER_RADIUS_DEFAULT;
    return mode3_getShadowStyleForCount(count).radius;
}

function mode3_buildActiveGeoJsonLayer(app, features) {
    if (app.modeArtifacts) app.modeArtifacts.mode3_cumulativeCountCache = {};
    return L.geoJSON({ type: "FeatureCollection", features: features }, {
        onEachFeature: function(feature, layer) {
            var p = feature.properties;
            layer.bindPopup(
                "<p>" +
                "<strong>" + p.place_name + "</strong>" +
                "<br>Date: " + p.date_iso +
                "<br>Diary: " + p.diary_id +
                "<br><br><em>" + p.snippet + "</em>" +
                "</p>"
            );
        },
        pointToLayer: function(feature, latLng) {
            var presence = feature.properties.author_presence || "present";
            return L.circleMarker(latLng, {
                radius: mode3_getActiveMarkerRadiusForFeature(app, feature),
                fillColor: getColor(presence),
                color: "#333",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.75
            });
        }
    });
}

function mode3_setTimedFeatures(app, features) {
    if (!app || !app.map) return;
    if (app.modeArtifacts.timedLayer) {
        app.map.removeLayer(app.modeArtifacts.timedLayer);
        app.modeArtifacts.timedLayer = null;
    }
    app.modeArtifacts.mode3_timedBaseLayer = mode3_buildActiveGeoJsonLayer(app, features);
    app.modeArtifacts.timedLayer = L.timeDimension.layer.geoJson(app.modeArtifacts.mode3_timedBaseLayer, {
        updateTimeDimension: false,
        updateTimeDimensionMode: "union",
        duration: "P1D"
    }).addTo(app.map);
}

function mode3_renderCumulativeShadow(app, isoDate) {
    if (!app || !app.map || !isoDate) return;
    if (!app.state || app.state.modeKey !== "mode_3") return;
    if (!app.modeArtifacts.mode3_shadowLayer) {
        if (!app.map.getPane("mode3ShadowPane")) {
            app.map.createPane("mode3ShadowPane");
            app.map.getPane("mode3ShadowPane").style.zIndex = 360;
        }
        app.modeArtifacts.mode3_shadowLayer = L.layerGroup().addTo(app.map);
    }

    var buckets = mode3_buildCumulativeBuckets(app, isoDate);

    var layer = app.modeArtifacts.mode3_shadowLayer;
    layer.clearLayers();
    var hiddenKeys = app.modeArtifacts.mode3_shadowHiddenKeys || null;
    var keys = Object.keys(buckets).sort(function(a, b) {
        return buckets[a].count - buckets[b].count;
    });
    var shadowStroke = mode3_getShadowStrokeForZoom(app.map.getZoom());

    for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        if (hiddenKeys && hiddenKeys[k]) continue;
        var b = buckets[k];
        var shadowStyle = mode3_getShadowStyleForCount(b.count);

        var markerOpts = {
            pane: "mode3ShadowPane",
            radius: shadowStyle.radius,
            stroke: shadowStroke.stroke,
            fillColor: shadowStyle.fillColor,
            fillOpacity: shadowStyle.fillOpacity
        };
        if (shadowStroke.stroke) {
            markerOpts.color = shadowStroke.color;
            markerOpts.opacity = shadowStroke.opacity;
            markerOpts.weight = shadowStroke.weight;
        }
        var marker = L.circleMarker([b.lat, b.lng], markerOpts);
        marker.bindTooltip(b.place + " (" + b.count + ")", { direction: "top", opacity: 0.85 });
        layer.addLayer(marker);
    }
}

function mode3_restorePlayerControls(app) {
    // Step-1 rebuild: Mode 3 does not patch player methods.
}

function mode3_stopPlayback(app) {
    if (!app) return;
    if (app.modeArtifacts.mode3_shadowRevealTimer) {
        clearTimeout(app.modeArtifacts.mode3_shadowRevealTimer);
        app.modeArtifacts.mode3_shadowRevealTimer = null;
    }
    if (app.modeArtifacts.mode3_manualTimeout) {
        clearTimeout(app.modeArtifacts.mode3_manualTimeout);
        app.modeArtifacts.mode3_manualTimeout = null;
    }
    if (app.modeArtifacts.mode3_manualInterval) {
        clearInterval(app.modeArtifacts.mode3_manualInterval);
        app.modeArtifacts.mode3_manualInterval = null;
    }
    if (app.modeArtifacts.mode3_shadowTimeLoadHandler) {
        app.map.timeDimension.off("timeload", app.modeArtifacts.mode3_shadowTimeLoadHandler);
        app.modeArtifacts.mode3_shadowTimeLoadHandler = null;
    }
    mode3_unbindShadowZoomHandler(app);
    app.stopAllPlayback();
    if (app.modeArtifacts.mode3_shadowLayer) {
        app.map.removeLayer(app.modeArtifacts.mode3_shadowLayer);
        app.modeArtifacts.mode3_shadowLayer = null;
    }
    app.modeArtifacts.mode3_shadowHiddenKeys = null;
    app.modeArtifacts.mode3_cumulativeCountCache = null;
    app.modeArtifacts.mode3_timedBaseLayer = null;
}

function mode3_runPreviewThenTimeline(app) {
    mode3_stopPlayback(app);
    app.clearModeArtifacts();

    var flowToken = (app.modeArtifacts.mode3FlowToken || 0) + 1;
    app.modeArtifacts.mode3FlowToken = flowToken;
    var sessionToken = app.modeArtifacts.sessionToken;

    var mode3StartIso = mode3_getTimelineStartIso(app);
    app.setAvailableTimesRange(mode3StartIso, MAP_TIME_END);
    app.setCurrentIso(mode3StartIso);
    mode3_renderCumulativeShadow(app, mode3StartIso);
    mode3_setTimedFeatures(app, app.allFeatures);
    app.modeArtifacts.mode3_shadowTimeLoadHandler = function() {
        if (!app.modeArtifacts || app.modeArtifacts.sessionToken !== sessionToken) return;
        if ((app.modeArtifacts.mode3FlowToken || 0) !== flowToken) return;
        if (!app.state || app.state.modeKey !== "mode_3") return;
        var isoDate = isoFromTimestamp(app.map.timeDimension.getCurrentTime());
        if (app.modeArtifacts.mode3_shadowRevealTimer) {
            clearTimeout(app.modeArtifacts.mode3_shadowRevealTimer);
            app.modeArtifacts.mode3_shadowRevealTimer = null;
        }
        app.modeArtifacts.mode3_shadowHiddenKeys = mode3_getDayLocationKeys(app, isoDate);
        mode3_renderCumulativeShadow(app, isoDate);
        app.modeArtifacts.mode3_shadowRevealTimer = setTimeout(function() {
            if (!app.modeArtifacts || app.modeArtifacts.sessionToken !== sessionToken) return;
            if ((app.modeArtifacts.mode3FlowToken || 0) !== flowToken) return;
            if (!app.state || app.state.modeKey !== "mode_3") return;
            app.modeArtifacts.mode3_shadowHiddenKeys = null;
            mode3_renderCumulativeShadow(app, isoDate);
        }, 180);
    };
    app.map.timeDimension.on("timeload", app.modeArtifacts.mode3_shadowTimeLoadHandler);
    mode3_bindShadowZoomHandler(app);
    app.startTimeDimensionAutoplay(mode3StartIso, "mode_3");
}

function mode3_buildTimelineTotalsPanelHtml(app, isoDate) {
    var totals = mode3_getCumulativeMentionTotals(app, isoDate);
    var top10 = mode3_getTopPlacesForDate(app, isoDate, 10);
    var topHtml = "";
    for (var i = 0; i < 10; i++) {
        if (top10[i]) {
            topHtml += '<div style="font-size:13px;line-height:1.25;margin:2px 0;">' + (i + 1) + ". " + top10[i].name + " (" + top10[i].count + ")</div>";
        } else {
            topHtml += '<div style="font-size:13px;line-height:1.25;margin:2px 0;color:#888;">' + (i + 1) + ".</div>";
        }
    }
    var legendHtml =
        '<div style="margin:0 0 8px 0;padding:6px 8px;background:rgba(255,255,255,0.5);border-radius:6px;">' +
            '<div style="font-size:12px;line-height:1.2;color:#555;margin-bottom:4px;"><b>Cumulative shadow legend</b></div>' +
            '<div style="font-size:11px;color:#444;display:flex;flex-direction:column;gap:4px;">' +
                mode3_buildLegendSwatchRow(1, "1 mention") +
                mode3_buildLegendSwatchRow(2, "2-10 mentions") +
                mode3_buildLegendSwatchRow(11, "11-19 mentions") +
                mode3_buildLegendSwatchRow(20, "20-49 mentions") +
                mode3_buildLegendSwatchRow(50, "50-99 mentions") +
                mode3_buildLegendSwatchRow(100, "100+ mentions") +
            "</div>" +
        "</div>";
    return (
        '<div style="margin-top:4px;">' +
            legendHtml +
            '<div style="font-size:14px;line-height:1.2;margin:8px 0 6px 0;color:#223247;"><b>TOTALS</b> <span style="font-weight:normal;font-size:12px;color:#666;">— cumulative to this day</span></div>' +
            '<div style="font-size:18px;line-height:1.2;"><b>' + totals.totalMentions + "</b> geolocations total</div>" +
            '<div style="font-size:16px;line-height:1.25;margin-top:4px;"><b>' + totals.uniquePlaces + "</b> unique places</div>" +
            (topHtml ? ('<div style="font-size:15px;line-height:1.25;margin-top:8px;"><b>Top places (10):</b></div>' + topHtml) : "") +
        "</div>"
    );
}

registerMode({
    key: "mode_3",
    label: "Mode 3 – ALL diaries UPDATED",
    supportsDiarySelect: false,
    rightStackPanelClass: "right-stack-panel-mode3",
    getPanelHtml: function(app, isoDate) {
        var s = app.getStats(isoDate);
        return PDPanelRenderers.renderAllDiaries(app, isoDate, s);
    },
    getSecondaryRightPanelStyle: function() {
        if (showTimelineTotalsPanel === false) return null;
        return "padding:10px 14px;text-align:left;";
    },
    getSecondaryRightPanelHtml: function(app, isoDate) {
        if (showTimelineTotalsPanel === false) return null;
        return mode3_buildTimelineTotalsPanelHtml(app, isoDate);
    },
    enter: function(app) {
        // Mode 3 default: keep left panel compact (all toggles unchecked).
        showTimelineTotalsPanel = true;
        showDiarists = false;
        showCumulative = false;
        showMentions = false;
        showRolling = false;
        showTopPlaces = false;
        app.resetDefaultViewport();
        app.setSelectedDiaryId(app.state.selectedDiaryId);
        mode3_runPreviewThenTimeline(app);
    },
    exit: function(app) {
        app.modeArtifacts.mode3FlowToken = (app.modeArtifacts.mode3FlowToken || 0) + 1;
        if (app.modeArtifacts.mode3_shadowTimeLoadHandler) {
            app.map.timeDimension.off("timeload", app.modeArtifacts.mode3_shadowTimeLoadHandler);
            app.modeArtifacts.mode3_shadowTimeLoadHandler = null;
        }
        if (app.modeArtifacts.mode3_previewTimer) {
            clearTimeout(app.modeArtifacts.mode3_previewTimer);
            app.modeArtifacts.mode3_previewTimer = null;
        }
        mode3_stopPlayback(app);
        mode3_restorePlayerControls(app);
        app.clearModeArtifacts();
    }
});

